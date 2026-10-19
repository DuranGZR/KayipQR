"""Tests never use the developer's database, upload folder or SMTP credentials."""
import os
import secrets
import tempfile
from pathlib import Path
import pytest_asyncio
from sqlalchemy.engine import make_url

_workspace = tempfile.TemporaryDirectory(prefix="kayipqr-tests-")
_test_database = os.environ.get("TEST_DATABASE_URL")
if _test_database and "test" not in (make_url(_test_database).database or "").lower():
    raise RuntimeError("TEST_DATABASE_URL must name an explicitly isolated test database")
os.environ.update(
    DATABASE_URL=_test_database or f"sqlite+aiosqlite:///{Path(_workspace.name).as_posix()}/test.db",
    UPLOAD_DIR=str(Path(_workspace.name) / "uploads"),
    ENVIRONMENT="test",
    SECRET_KEY=secrets.token_hex(32),
    SMTP_HOST="", SMTP_USER="", SMTP_PASSWORD="",
    EMAIL_PROVIDER="smtp", RESEND_API_KEY="",
    REDIS_URL="", STORAGE_BACKEND="local", S3_ENDPOINT_URL="", S3_BUCKET="",
    S3_ACCESS_KEY_ID="", S3_SECRET_ACCESS_KEY="",
    RUN_BACKGROUND_TASKS="false", RUN_MIGRATIONS="false", APP_ROLE="web", PROXY_MODE="explicit",
    ENABLE_EXTERNAL_GEOIP="false",
    SERVERLESS_MODE="false", SINGLE_INSTANCE_MODE="false", CRON_SECRET="",
)


@pytest_asyncio.fixture(autouse=True)
async def isolate_runtime_state():
    from app.core.rate_limiter import rate_limiter
    from app.services.email_service import email_service
    from app.db.session import engine, init_db
    from app.db.session import AsyncSessionLocal
    from app.models.email_outbox import EmailOutbox
    from app.models.upload_asset import UploadAsset, StorageQuota
    from app.models.runtime_state import RuntimeBucket
    from sqlalchemy import delete
    rate_limiter.requests.clear()
    email_service._scan_cooldown_cache.clear()
    await init_db()
    async with AsyncSessionLocal() as db:
        await db.execute(delete(EmailOutbox))
        await db.execute(delete(RuntimeBucket))
        await db.execute(delete(UploadAsset))
        await db.execute(delete(StorageQuota))
        await db.commit()
    yield
    from app.core.redis import close_redis
    await close_redis()
    await engine.dispose()
