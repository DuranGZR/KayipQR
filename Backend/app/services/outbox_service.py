"""Transactional outbox with expiring, atomic claims across worker processes."""
import asyncio
import logging
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete, update, and_, or_, case
from app.db.session import AsyncSessionLocal
from app.models.email_outbox import EmailOutbox
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


def queue_email(db, recipient: str, subject: str, html_body: str) -> None:
    db.add(EmailOutbox(recipient=recipient, subject=subject[:255], html_body=html_body))


async def queue_auth_email(db, user, purpose: str) -> None:
    # Supersede undelivered requests. Old links are not sent long after a newer request.
    await db.execute(update(EmailOutbox).where(EmailOutbox.recipient == user.email,
        EmailOutbox.purpose == purpose, EmailOutbox.status.in_(["pending", "processing"]))
        .values(status="failed", html_body="", lease_token=None, locked_until=None))
    db.add(EmailOutbox(recipient=user.email, subject="KayıpQR — " + (
        "E-posta adresini doğrula" if purpose == "verify_email" else "Şifre Sıfırlama Talebi"),
        html_body="", purpose=purpose, auth_fingerprint=hashlib.sha256(user.hashed_password.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)))


async def prepare_auth_email(mail) -> bool:
    """Create the token at dispatch, and keep the same payload across delivery retries."""
    from app.models.user import User
    from app.core.config import settings
    from app.core.security import create_password_reset_token, create_email_verification_token
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == mail.recipient))).scalar_one_or_none()
        if (not user or not user.is_active
            or hashlib.sha256(user.hashed_password.encode()).hexdigest() != mail.auth_fingerprint
            or (mail.purpose == "verify_email" and user.email_verified)):
            return False
        if not mail.html_body:
            if mail.purpose == "password_reset":
                token = create_password_reset_token(user.email, user.hashed_password)
                mail.html_body = email_service.render_password_reset_email(
                    f"{settings.PUBLIC_APP_URL}/reset-password?token={token}", user.full_name)
                mail.token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
            else:
                import html
                token = create_email_verification_token(user)
                link = html.escape(f"{settings.PUBLIC_APP_URL}/verify-email?token={token}", quote=True)
                mail.html_body = email_service._get_base_template("E-posta adresini doğrula", "KayıpQR hesabını etkinleştir",
                    f'<h2>E-posta adresini doğrula</h2><p>Hesabını kullanmak için aşağıdaki bağlantıya tıkla. Bağlantı 24 saat geçerlidir. Bu hesabı sen oluşturmadıysan bu e-postayı yok sayabilirsin.</p><a class="btn" href="{link}">Adresimi doğrula</a>')
                mail.token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            await db.execute(update(EmailOutbox).where(EmailOutbox.id == mail.id, EmailOutbox.lease_token == mail.lease_token)
                .values(html_body=mail.html_body, token_expires_at=mail.token_expires_at))
            await db.commit()
    return True


def eligible(now):
    return or_(
        and_(EmailOutbox.status == "pending", EmailOutbox.next_attempt_at <= now),
        and_(EmailOutbox.status == "processing", EmailOutbox.locked_until <= now),
    )


async def claim_email():
    for _ in range(5):
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            await db.execute(update(EmailOutbox).where(EmailOutbox.status.in_(["pending", "processing"]),
                EmailOutbox.expires_at <= now).values(status="failed", html_body="", lease_token=None, locked_until=None))
            mail_id = (await db.execute(select(EmailOutbox.id).where(eligible(now))
                .order_by(case((EmailOutbox.purpose != "notification", 0), else_=1), EmailOutbox.next_attempt_at, EmailOutbox.id).limit(1))).scalar_one_or_none()
            if mail_id is None:
                await db.commit()
                return None
            # The condition is rechecked by the database after any concurrent writer.
            result = await db.execute(update(EmailOutbox).where(
                EmailOutbox.id == mail_id, eligible(now)
            ).values(status="processing", lease_token=uuid.uuid4().hex,
                locked_until=now + timedelta(seconds=180)).returning(EmailOutbox))
            mail = result.scalars().first()
            await db.commit()
            if mail:
                return mail
    return None


async def deliver_pending(stop_event=None, max_messages: int = 20) -> int:
    delivered = 0
    for _ in range(max_messages):
        if stop_event is not None and stop_event.is_set():
            break
        mail = await claim_email()
        if mail is None:
            break
        if mail.purpose != "notification" and not await prepare_auth_email(mail):
            async with AsyncSessionLocal() as db:
                await db.execute(update(EmailOutbox).where(EmailOutbox.id == mail.id, EmailOutbox.lease_token == mail.lease_token)
                    .values(status="failed", html_body="", lease_token=None, locked_until=None))
                await db.commit()
            continue
        try:
            success = await email_service.send_email(mail.recipient, mail.subject, mail.html_body,
                idempotency_key=f"kayipqr-outbox-{mail.id}")
        except Exception:
            success = False
        attempts = mail.attempts + 1
        values = {"attempts": attempts, "lease_token": None, "locked_until": None}
        if success:
            values.update(status="delivered", delivered_at=datetime.now(timezone.utc), html_body="")
        elif attempts >= 8:
            values.update(status="failed")
            logger.error("Email delivery exhausted retries: id=%s", mail.id)
        else:
            delay = 2 if mail.purpose != "notification" and attempts < 3 else min(3600, 15 * 2 ** attempts)
            values.update(status="pending", next_attempt_at=datetime.now(timezone.utc) + timedelta(seconds=delay))
        async with AsyncSessionLocal() as db:
            result = await db.execute(update(EmailOutbox).where(
                EmailOutbox.id == mail.id, EmailOutbox.status == "processing", EmailOutbox.lease_token == mail.lease_token
            ).values(**values))
            await db.commit()
            if success and result.rowcount == 1:
                delivered += 1
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        await db.execute(delete(EmailOutbox).where(or_(
            and_(EmailOutbox.status == "delivered", EmailOutbox.delivered_at < cutoff),
            and_(EmailOutbox.status == "failed", EmailOutbox.created_at < cutoff),
        )))
        await db.commit()
    return delivered


async def run_dispatcher(stop_event=None) -> None:
    while stop_event is None or not stop_event.is_set():
        try:
            await deliver_pending(stop_event)
        except Exception:
            logger.exception("Email outbox dispatcher failed; retrying")
        if stop_event is None:
            await asyncio.sleep(5)
        else:
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=5)
            except asyncio.TimeoutError:
                pass
