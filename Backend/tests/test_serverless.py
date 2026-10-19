import asyncio
import io
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

import httpx
import pytest
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import select, update, func
from starlette.requests import Request
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.main import app
from app.core.config import settings, Settings
from app.core.rate_limiter import RateLimiter
from app.db.session import AsyncSessionLocal
from app.models.runtime_state import RuntimeBucket, UploadContent
from app.models.upload_asset import StorageQuota, UploadAsset
from app.models.message import Message
from app.models.email_outbox import EmailOutbox
from app.services.storage_service import storage_service
from app.services.runtime_limits import consume_window
from app.services.outbox_service import queue_email
from tests.test_production import account, conversation


async def upload_photo():
    body = io.BytesIO()
    Image.new("RGB", (2400, 1600), "blue").save(body, "JPEG")
    return await storage_service.save_upload_file(UploadFile(
        filename="photo.jpg", file=io.BytesIO(body.getvalue()), headers=Headers({"content-type": "image/jpeg"})))


@pytest.mark.asyncio
async def test_database_images_are_small_private_and_quota_is_atomic(monkeypatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "database")
    signed = await upload_photo()
    filename = urlsplit(signed).path.split("/")[-1]
    async with AsyncSessionLocal() as db:
        content = await db.get(UploadContent, filename)
        image = Image.open(io.BytesIO(content.content))
        assert image.format == "WEBP" and max(image.size) <= 1280
        assert len(content.content) <= settings.DB_IMAGE_MAX_BYTES
        quota = await db.get(StorageQuota, 1)
        assert quota.used_bytes == len(content.content)
        # A full quota must roll back without leaving a content/metadata row.
        await db.execute(update(StorageQuota).values(used_bytes=settings.MAX_STORAGE_SIZE_MB * 1024 * 1024))
        await db.commit()
    with pytest.raises(HTTPException) as error:
        await upload_photo()
    assert error.value.status_code == 507
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        assert (await ac.get(f"/uploads/{filename}")).status_code == 403
        response = await ac.get(signed)
        assert response.status_code == 200 and response.headers["content-type"] == "image/webp"
        assert response.headers["cache-control"] == "private, no-store"
    async with AsyncSessionLocal() as db:
        assert (await db.execute(select(func.count()).select_from(UploadContent))).scalar_one() == 1
        await db.execute(update(StorageQuota).values(used_bytes=len(content.content)))
        await db.commit()
        await storage_service.safe_delete_file(db, signed)
        await storage_service.safe_delete_file(db, signed)
    async with AsyncSessionLocal() as db:
        assert await db.get(UploadContent, filename) is None
        assert (await db.get(StorageQuota, 1)).used_bytes == 0


@pytest.mark.asyncio
async def test_shared_limits_survive_new_instances_and_expire(monkeypatch):
    results = await asyncio.gather(*(consume_window("test-shared", 3, 60) for _ in range(10)))
    assert results.count(0) == 3
    assert all(value > 0 for value in results if value)
    async with AsyncSessionLocal() as db:
        await db.execute(update(RuntimeBucket).values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)))
        await db.commit()
    assert await consume_window("test-shared", 3, 60) == 0
    monkeypatch.setattr(settings, "SERVERLESS_MODE", True)
    request = Request({"type": "http", "path": "/test", "headers": [], "client": ("203.0.113.1", 123)})
    await RateLimiter().check_rate_limit(request, max_requests=1)
    with pytest.raises(HTTPException) as error:
        await RateLimiter().check_rate_limit(request, max_requests=1)
    assert error.value.status_code == 429


@pytest.mark.asyncio
async def test_cron_auth_retention_and_request_email_delivery(monkeypatch):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "database")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        _, contact = await conversation(ac, headers)
        signed = await upload_photo()
        filename = urlsplit(signed).path.split("/")[-1]
        async with AsyncSessionLocal() as db:
            message = Message(conversation_id=contact["conversation_id"], sender_type="finder",
                content=f"Burada. [Fotoğraf](/uploads/{filename})", created_at=datetime.now(timezone.utc) - timedelta(days=31))
            db.add(message)
            await db.commit()
            message_id = message.id
        monkeypatch.setattr(settings, "SERVERLESS_MODE", True)
        monkeypatch.setattr(settings, "CRON_SECRET", secrets.token_hex(32))
        from app.services.email_service import email_service
        sent = []
        async def send(*args, **kwargs):
            sent.append(args)
            return True
        monkeypatch.setattr(email_service, "send_email", send)
        assert (await ac.get("/internal/maintenance")).status_code == 401
        assert (await ac.get("/internal/maintenance", headers={"Authorization": "Bearer wrong"})).status_code == 401
        response = await ac.get("/internal/maintenance", headers={"Authorization": "Bearer " + settings.CRON_SECRET})
        assert response.status_code == 200 and response.json()["expired_messages"] == 1
        async with AsyncSessionLocal() as db:
            assert await db.get(UploadAsset, filename) is None
            assert "Burada." in (await db.get(Message, message_id)).content
            queue_email(db, "isolated@example.org", "Test", "isolated test")
            await db.commit()
        # The ASGI invocation awaits bounded response tasks, without lifespan loops.
        response = await ac.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.org"})
        assert response.status_code == 200 and response.headers["cache-control"] == "private, no-store"
        assert sent
        async with AsyncSessionLocal() as db:
            assert (await db.execute(select(EmailOutbox).where(EmailOutbox.subject == "Test"))).scalar_one().status == "delivered"


def test_vercel_settings_and_neon_connection(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    common = dict(_env_file=None, ENVIRONMENT="production", SECRET_KEY=secrets.token_hex(32),
        SERVERLESS_MODE=True, SINGLE_INSTANCE_MODE=False, RUN_BACKGROUND_TASKS=False,
        DATABASE_URL="postgresql://test:p%40ss@pool.example/test?sslmode=require&channel_binding=require",
        STORAGE_BACKEND="database", MAX_UPLOAD_SIZE_MB=3, CRON_SECRET=secrets.token_hex(32),
        PUBLIC_APP_URL="https://site.example", EMAIL_PROVIDER="resend", RESEND_API_KEY="isolated-key")
    config = Settings(**common)
    assert "ssl=require" in config.DATABASE_URL and "channel_binding" not in config.DATABASE_URL
    for overrides in ({"SERVERLESS_MODE": False}, {"RUN_BACKGROUND_TASKS": True}, {"STORAGE_BACKEND": "local"}, {"CRON_SECRET": ""}, {"MAX_UPLOAD_SIZE_MB": 5}):
        with pytest.raises(ValidationError):
            Settings(**{**common, **overrides})


def test_vercel_proxy_only_trusted_on_vercel(monkeypatch):
    monkeypatch.setattr(settings, "PROXY_MODE", "vercel")
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", [])
    request = Request({"type": "http", "path": "/", "client": ("127.0.0.1", 123),
        "headers": [(b"x-vercel-forwarded-for", b"203.0.113.8"), (b"x-forwarded-for", b"192.0.2.9")]})
    monkeypatch.delenv("VERCEL", raising=False)
    assert RateLimiter().get_client_ip(request) == "127.0.0.1"
    monkeypatch.setenv("VERCEL", "1")
    assert RateLimiter().get_client_ip(request) == "203.0.113.8"


@pytest.mark.asyncio
async def test_email_latency_does_not_delay_response_body(monkeypatch):
    monkeypatch.setattr(settings, "SERVERLESS_MODE", True)
    from app.services.email_service import email_service
    started, release, response_end = asyncio.Event(), asyncio.Event(), asyncio.Event()
    async def slow_send(*args, **kwargs):
        started.set()
        await release.wait()
        return True
    monkeypatch.setattr(email_service, "send_email", slow_send)
    async with AsyncSessionLocal() as db:
        queue_email(db, "isolated@example.org", "Slow test", "isolated")
        await db.commit()
    async def observed_app(scope, receive, send):
        async def observe(message):
            if message["type"] == "http.response.body" and not message.get("more_body", False):
                response_end.set()
            await send(message)
        await app(scope, receive, observe)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=observed_app), base_url="http://test") as ac:
        task = asyncio.create_task(ac.post("/api/v1/auth/forgot-password", json={"email": "nobody@example.org"}))
        try:
            await asyncio.wait_for(started.wait(), timeout=5)
            assert response_end.is_set()
            assert not task.done()  # ASGI still awaits the bounded email task
        finally:
            release.set()
            response = await task
        assert response.status_code == 200
