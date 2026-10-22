"""Atomic fixed windows shared by all serverless copies; no process-local bypass."""
import hashlib
import math
from datetime import datetime, timedelta, timezone
from sqlalchemy import case, or_, select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.runtime_state import RuntimeBucket


async def consume_window(key: str, limit: int, seconds: int, *, db: AsyncSession | None = None) -> int:
    """Return Retry-After seconds, or zero when this request was accepted."""
    if db is not None:
        return await _consume_window(db, key, limit, seconds)
    async with AsyncSessionLocal() as session:
        retry = await _consume_window(session, key, limit, seconds)
        await session.commit()
        return retry


async def _consume_window(db: AsyncSession, key: str, limit: int, seconds: int) -> int:
    digest = hashlib.sha256(key.encode()).hexdigest()
    postgres = db.bind.dialect.name == "postgresql"
    now = (await db.execute(select(func.clock_timestamp()))).scalar_one() if postgres else datetime.now(timezone.utc)
    expires = now + timedelta(seconds=seconds)
    insert = pg_insert if postgres else sqlite_insert
    expired = RuntimeBucket.expires_at <= now
    stmt = insert(RuntimeBucket).values(key=digest, count=1, expires_at=expires)
    stmt = stmt.on_conflict_do_update(index_elements=[RuntimeBucket.key], set_={
        "count": case((expired, 1), else_=RuntimeBucket.count + 1),
        "expires_at": case((expired, expires), else_=RuntimeBucket.expires_at),
    }, where=or_(expired, RuntimeBucket.count < limit)).returning(RuntimeBucket.key)
    accepted = (await db.execute(stmt)).scalar_one_or_none()
    retry = 0
    if accepted is None:
        until = (await db.execute(select(RuntimeBucket.expires_at).where(RuntimeBucket.key == digest))).scalar_one()
        if until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)
        retry = max(1, math.ceil((until - now).total_seconds()))
    return retry
