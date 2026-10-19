"""Expire chat attachment references before reclaiming unreferenced media."""
import re
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from app.core.config import settings
from app.core.media import UPLOAD_REFERENCE
from app.db.session import AsyncSessionLocal
from app.models.message import Message
from app.services.storage_service import storage_service

EXPIRED_PHOTO = "[Fotoğrafın saklama süresi doldu / Photo expired]"
_PHOTO_LINK = re.compile(
    r"(?:📷\s*)?\[[^\]\n]*\]\((?:https?://[^/\s)]+)?"
    + UPLOAD_REFERENCE.pattern + r"\)"
)


async def expire_chat_photos(now: datetime | None = None, batch_size: int = 100) -> int:
    """Age is measured from sending; newer/shared/profile/item references protect files.

    This operates in bounded batches, retains message text and timestamps, and
    commits reference removal before best-effort local/S3 deletion. Failed file
    deletion is retried by orphan maintenance. Never call with a live DB in tests.
    """
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=settings.CHAT_PHOTO_RETENTION_DAYS)
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Message.id, Message.content).where(
            Message.created_at < cutoff,
            Message.content.regexp_match(r"/uploads/[a-f0-9]{32}\.(jpg|png|webp)"),
        ).order_by(Message.created_at, Message.id).limit(batch_size))).all()
        files: set[str] = set()
        changed = 0
        for message_id, content in rows:
            filenames = {match.group(1) for match in UPLOAD_REFERENCE.finditer(content)}
            if not filenames:
                continue
            cleaned = _PHOTO_LINK.sub(EXPIRED_PHOTO, content)
            cleaned = UPLOAD_REFERENCE.sub(EXPIRED_PHOTO, cleaned)
            result = await db.execute(update(Message).where(
                Message.id == message_id, Message.content == content,
            ).values(content=cleaned))
            if result.rowcount:
                changed += 1
                files.update(filenames)
        await db.commit()
        for filename in files:
            await storage_service.safe_delete_file(db, f"/uploads/{filename}")
        return changed
