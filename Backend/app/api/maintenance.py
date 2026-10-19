"""Authenticated, bounded Vercel cron entrypoint. No eternal background process."""
import asyncio
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import delete
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.runtime_state import RuntimeBucket
from app.services.outbox_service import deliver_pending
from app.services.media_retention import expire_chat_photos
from app.services.storage_service import cleanup_orphan_uploads

router = APIRouter()


@router.get("/internal/maintenance", include_in_schema=False)
async def maintenance(request: Request):
    expected = "Bearer " + settings.CRON_SECRET
    if not settings.CRON_SECRET or not secrets.compare_digest(request.headers.get("authorization", ""), expected):
        raise HTTPException(status_code=401)
    if not settings.SERVERLESS_MODE:
        raise HTTPException(status_code=404)
    async with asyncio.timeout(50):
        # Each operation is retry-safe; concurrent cron calls cannot double-release quota.
        expired = await expire_chat_photos(batch_size=100)
        removed = await cleanup_orphan_uploads()
        async with AsyncSessionLocal() as db:
            await db.execute(delete(RuntimeBucket).where(RuntimeBucket.expires_at < datetime.now(timezone.utc)))
            await db.commit()
        delivered = await deliver_pending(max_messages=3)
    return {"expired_messages": expired, "removed_orphans": removed, "delivered_emails": delivered}
