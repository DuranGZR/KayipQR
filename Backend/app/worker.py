"""Railway worker entry point: python -m app.worker (no public HTTP port)."""
import asyncio
import logging
import signal
from contextlib import suppress
from sqlalchemy import select
from app.core.config import settings
from app.core.redis import get_redis, close_redis
from app.db.session import engine, AsyncSessionLocal, init_db
from app.models.email_outbox import EmailOutbox
from app.services.outbox_service import run_dispatcher
from app.services.storage_service import cleanup_orphan_uploads
from app.services.media_retention import expire_chat_photos

logger = logging.getLogger(__name__)


async def run_worker():
    if settings.APP_ROLE != "worker":
        raise RuntimeError("Worker service must set APP_ROLE=worker")
    if settings.ENVIRONMENT not in ("production", "staging"):
        await init_db()
    async with AsyncSessionLocal() as db:
        await db.execute(select(EmailOutbox.id).limit(1))
    redis = get_redis()
    if redis is not None:
        await redis.ping()
    if settings.STORAGE_BACKEND == "s3":
        from app.services.object_storage import check_bucket
        await check_bucket()
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:
            pass

    async def maintain_uploads():
        while not stop.is_set():
            try:
                await expire_chat_photos()
                await cleanup_orphan_uploads()
            except Exception:
                logger.exception("Upload maintenance failed; retrying next cycle")
            try:
                await asyncio.wait_for(stop.wait(), timeout=3600)
            except asyncio.TimeoutError:
                pass

    dispatcher = asyncio.create_task(run_dispatcher(stop))
    maintenance = asyncio.create_task(maintain_uploads())
    stop_waiter = asyncio.create_task(stop.wait())
    try:
        done, _ = await asyncio.wait([dispatcher, maintenance, stop_waiter], return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            if task is not stop_waiter:
                task.result()
                raise RuntimeError("Worker task exited unexpectedly")
        await asyncio.wait_for(dispatcher, timeout=25)
    finally:
        for task in (dispatcher, maintenance, stop_waiter):
            task.cancel()
        for task in (dispatcher, maintenance, stop_waiter):
            with suppress(asyncio.CancelledError):
                await task
        await close_redis()
        await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())
