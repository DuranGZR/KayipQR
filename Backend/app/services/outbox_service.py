"""Transactional outbox with expiring, atomic claims across worker processes."""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete, update, and_, or_
from app.db.session import AsyncSessionLocal
from app.models.email_outbox import EmailOutbox
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


def queue_email(db, recipient: str, subject: str, html_body: str) -> None:
    db.add(EmailOutbox(recipient=recipient, subject=subject[:255], html_body=html_body))


def eligible(now):
    return or_(
        and_(EmailOutbox.status == "pending", EmailOutbox.next_attempt_at <= now),
        and_(EmailOutbox.status == "processing", EmailOutbox.locked_until <= now),
    )


async def claim_email():
    for _ in range(5):
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            mail_id = (await db.execute(select(EmailOutbox.id).where(eligible(now))
                .order_by(EmailOutbox.next_attempt_at, EmailOutbox.id).limit(1))).scalar_one_or_none()
            if mail_id is None:
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


async def deliver_pending(stop_event=None) -> int:
    delivered = 0
    for _ in range(20):
        if stop_event is not None and stop_event.is_set():
            break
        mail = await claim_email()
        if mail is None:
            break
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
            values.update(status="pending", next_attempt_at=datetime.now(timezone.utc) + timedelta(seconds=min(3600, 15 * 2 ** attempts)))
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
