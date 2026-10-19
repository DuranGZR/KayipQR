import asyncio
import io
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit
from unittest.mock import AsyncMock
import pytest
import pytest_asyncio
import fakeredis.aioredis
import httpx
from fastapi import HTTPException
from PIL import Image
from redis.asyncio import Redis
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy import select, update

from app.core.config import settings, Settings
from app.core.rate_limiter import RateLimiter
from app.db.session import AsyncSessionLocal
from app.main import app
from app.models.email_outbox import EmailOutbox
from app.models.upload_asset import UploadAsset, StorageQuota
from app.models.message import Message
from app.services.email_service import email_service
from app.services.outbox_service import queue_email, deliver_pending
from app.services.storage_service import cleanup_orphan_uploads
from app.services import object_storage
from app.websockets.connection_manager import ConnectionManager
from tests.test_production import account, conversation


@pytest_asyncio.fixture
async def shared_redis(monkeypatch):
    import app.core.redis as backend
    prefix = f"kayipqr-test-{uuid.uuid4().hex}"
    url = os.environ.get("TEST_REDIS_URL")
    if url:
        clients = [Redis.from_url(url, decode_responses=True, protocol=2) for _ in range(2)]
    else:
        server = fakeredis.FakeServer()
        clients = [fakeredis.aioredis.FakeRedis(server=server, decode_responses=True) for _ in range(2)]
    monkeypatch.setattr(settings, "REDIS_URL", url or "redis://isolated-test")
    monkeypatch.setattr(settings, "REDIS_PREFIX", prefix)
    monkeypatch.setattr(backend, "_client", clients[0])
    await clients[0].ping()
    try:
        yield clients
    finally:
        keys = [key async for key in clients[0].scan_iter(match=f"{prefix}:*")]
        if keys:
            await clients[0].delete(*keys)
        for client in clients:
            await client.aclose()


def request():
    from starlette.requests import Request
    return Request({"type": "http", "client": ("8.8.8.8", 1), "path": "/test", "headers": []})


@pytest.mark.asyncio
async def test_two_instances_share_atomic_rate_limit(shared_redis, monkeypatch):
    import app.core.redis as backend
    first, second = RateLimiter(), RateLimiter()
    await first.check_rate_limit(request(), max_requests=3, key_prefix="shared")
    monkeypatch.setattr(backend, "_client", shared_redis[1])
    async def attempt():
        try:
            await second.check_rate_limit(request(), max_requests=3, key_prefix="shared")
            return 200
        except HTTPException as exc:
            return exc.status_code
    results = await asyncio.gather(*(attempt() for _ in range(10)))
    assert results.count(200) == 2 and results.count(429) == 8


@pytest.mark.asyncio
async def test_redis_failure_does_not_bypass_limit(shared_redis, monkeypatch):
    monkeypatch.setattr(shared_redis[0], "eval", AsyncMock(side_effect=RedisConnectionError("offline")))
    with pytest.raises(HTTPException) as exc:
        await RateLimiter().check_rate_limit(request())
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_scan_email_cooldown_shared_across_replicas(shared_redis, monkeypatch):
    from app.services.email_service import EmailService
    import app.core.redis as backend
    assert await EmailService().should_suppress_scan_email("same-item") is False
    monkeypatch.setattr(backend, "_client", shared_redis[1])
    assert await EmailService().should_suppress_scan_email("same-item") is True


class Socket:
    def __init__(self):
        self.scope = {}
        self.received = asyncio.Queue()
        self.closed = False

    async def accept(self, **kwargs):
        pass

    async def send_text(self, value):
        await self.received.put(json.loads(value))

    async def close(self, **kwargs):
        self.closed = True


@pytest.mark.asyncio
async def test_message_crosses_replicas_without_echo_duplicate(shared_redis, monkeypatch):
    import app.core.redis as backend
    first, second = ConnectionManager(), ConnectionManager()
    await first.start()
    monkeypatch.setattr(backend, "_client", shared_redis[1])
    await second.start()
    local, remote = Socket(), Socket()
    try:
        await first.connect_conversation(local, "same-conversation")
        await second.connect_conversation(remote, "same-conversation")
        await first.broadcast_to_conversation("same-conversation", {"type": "new_message", "message": {"id": "one"}})
        assert (await asyncio.wait_for(local.received.get(), 2))["message"]["id"] == "one"
        assert (await asyncio.wait_for(remote.received.get(), 2))["message"]["id"] == "one"
        await asyncio.sleep(.05)
        assert local.received.empty() and remote.received.empty()
    finally:
        await first.stop()
        await second.stop()


@pytest.mark.asyncio
async def test_publish_failure_closes_local_socket_for_resync(shared_redis, monkeypatch):
    manager = ConnectionManager()
    await manager.start()
    socket = Socket()
    try:
        await manager.connect_conversation(socket, "conversation")
        monkeypatch.setattr(shared_redis[0], "publish", AsyncMock(side_effect=RedisConnectionError("offline")))
        await manager.broadcast_to_conversation("conversation", {"type": "new_message"})
        assert socket.closed
    finally:
        await manager.stop()


@pytest.mark.asyncio
async def test_two_workers_do_not_deliver_same_claim(monkeypatch):
    async with AsyncSessionLocal() as db:
        queue_email(db, "worker@example.com", "test", "body")
        await db.commit()
    async def send(*args, **kwargs):
        await asyncio.sleep(.03)
        return True
    sender = AsyncMock(side_effect=send)
    monkeypatch.setattr(email_service, "send_email", sender)
    results = await asyncio.gather(deliver_pending(), deliver_pending())
    assert sum(results) == 1
    assert sender.await_count == 1
    assert sender.call_args.kwargs["idempotency_key"].startswith("kayipqr-outbox-")


@pytest.mark.asyncio
async def test_crashed_worker_lease_is_recovered(monkeypatch):
    async with AsyncSessionLocal() as db:
        mail = EmailOutbox(recipient="worker@example.com", subject="test", html_body="body", status="processing",
            lease_token="old-owner", locked_until=datetime.now(timezone.utc) - timedelta(seconds=1))
        db.add(mail)
        await db.commit()
        mail_id = mail.id
    monkeypatch.setattr(email_service, "send_email", AsyncMock(return_value=True))
    assert await deliver_pending() == 1
    async with AsyncSessionLocal() as db:
        mail = await db.get(EmailOutbox, mail_id)
        assert mail.status == "delivered" and mail.lease_token is None


@pytest.mark.parametrize("status,success", [(200, True), (429, False), (401, False)])
@pytest.mark.asyncio
async def test_resend_https_delivery_and_idempotency(monkeypatch, status, success):
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "isolated-test-key")
    original_client = httpx.AsyncClient
    def handle(req):
        assert req.url == "https://api.resend.com/emails"
        assert req.headers["authorization"] == "Bearer isolated-test-key"
        assert req.headers["idempotency-key"] == "outbox-one"
        assert json.loads(req.content)["to"] == ["test@example.com"]
        return httpx.Response(status, json={"id": "provider-id"} if success else {"message": "failure"})
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original_client(transport=httpx.MockTransport(handle), **kwargs))
    assert await email_service.send_email("test@example.com", "Subject", "<p>Test</p>", idempotency_key="outbox-one") is success


class MemoryS3:
    def __init__(self):
        self.objects = {}
        self.fail_write = False
        self.fail_delete = False

    def head_bucket(self, **kwargs):
        return {}

    def put_object(self, **kwargs):
        if self.fail_write:
            raise OSError("unavailable")
        self.objects[kwargs["Key"]] = kwargs
        return {}

    def delete_object(self, **kwargs):
        if self.fail_delete:
            raise OSError("unavailable")
        self.objects.pop(kwargs["Key"], None)
        return {}

    def generate_presigned_url(self, operation, Params, ExpiresIn):
        assert operation == "get_object" and ExpiresIn == 60
        return f"https://bucket.example/{Params['Key']}?temporary-signature=test"

    def head_object(self, **kwargs):
        from botocore.exceptions import ClientError
        if kwargs["Key"] not in self.objects:
            raise ClientError({"Error": {"Code": "NoSuchKey"}}, "HeadObject")
        obj = self.objects[kwargs["Key"]]
        return {"Metadata": obj["Metadata"], "ContentLength": len(obj["Body"])}


@pytest.fixture
def bucket(monkeypatch):
    client = MemoryS3()
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")
    monkeypatch.setattr(settings, "S3_BUCKET", "isolated-test")
    monkeypatch.setattr(object_storage, "get_s3", lambda: client)
    return client


@pytest.mark.asyncio
async def test_bucket_upload_private_read_and_delete(bucket):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        image = io.BytesIO()
        Image.new("RGB", (16, 16), "blue").save(image, format="PNG")
        upload = await ac.post("/api/v1/public/upload", files={"file": ("test.png", image.getvalue(), "image/png")})
        assert upload.status_code == 201
        url = upload.json()["url"]
        filename = urlsplit(url).path.rsplit("/", 1)[1]
        assert filename in bucket.objects
        assert (await ac.get(urlsplit(url).path)).status_code == 403
        response = await ac.get(url)
        assert response.status_code == 307
        assert response.headers["location"].startswith("https://bucket.example/")
        assert response.headers["cache-control"] == "private, no-store"
        item = await ac.post("/api/v1/items", headers=headers, json={"name": "Bucket item", "image_url": url})
        assert item.status_code == 201
        assert (await ac.get(urlsplit(url).path)).status_code == 307
        assert (await ac.delete(f"/api/v1/items/{item.json()['id']}", headers=headers)).status_code == 200
        assert filename not in bucket.objects
        async with AsyncSessionLocal() as db:
            assert (await db.get(StorageQuota, 1)).used_bytes == 0


@pytest.mark.asyncio
async def test_bucket_quota_is_atomic_across_simultaneous_uploads(bucket, monkeypatch):
    monkeypatch.setattr(settings, "MAX_STORAGE_SIZE_MB", 1)
    result = await asyncio.gather(*[
        object_storage.save_object(f"{uuid.uuid4().hex}.png", b"x" * 600_000, "image/png") for _ in range(2)
    ], return_exceptions=True)
    assert sum(isinstance(value, HTTPException) and value.status_code == 507 for value in result) == 1
    assert len(bucket.objects) == 1
    async with AsyncSessionLocal() as db:
        assert (await db.get(StorageQuota, 1)).used_bytes == 600_000


@pytest.mark.asyncio
async def test_uncertain_bucket_write_keeps_quota_until_confirmed_cleanup(bucket):
    bucket.fail_write = True
    filename = f"{uuid.uuid4().hex}.png"
    with pytest.raises(HTTPException) as exc:
        await object_storage.save_object(filename, b"test", "image/png")
    assert exc.value.status_code == 503
    async with AsyncSessionLocal() as db:
        asset = await db.get(UploadAsset, filename)
        assert asset.state == "uncertain"
        assert (await db.get(StorageQuota, 1)).used_bytes == 4
        asset.created_at = datetime.now(timezone.utc) - timedelta(days=2)
        await db.commit()
    assert await cleanup_orphan_uploads() == 1
    async with AsyncSessionLocal() as db:
        assert (await db.get(StorageQuota, 1)).used_bytes == 0


@pytest.mark.asyncio
async def test_failed_bucket_deletion_does_not_report_failed_business_operation(bucket):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        image = io.BytesIO()
        Image.new("RGB", (16, 16), "red").save(image, format="PNG")
        url = (await ac.post("/api/v1/public/upload", files={"file": ("test.png", image.getvalue(), "image/png")})).json()["url"]
        item = (await ac.post("/api/v1/items", headers=headers, json={"name": "Delete retry", "image_url": url})).json()
        bucket.fail_delete = True
        assert (await ac.delete(f"/api/v1/items/{item['id']}", headers=headers)).status_code == 200
        async with AsyncSessionLocal() as db:
            filename = urlsplit(url).path.rsplit("/", 1)[1]
            assert (await db.get(UploadAsset, filename)).state == "deleting"
        bucket.fail_delete = False
        assert await cleanup_orphan_uploads() == 1


@pytest.mark.asyncio
async def test_bucket_cleanup_does_not_get_stuck_on_old_referenced_assets(bucket):
    from app.models.item import Item
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, _ = await account(ac)
    async with AsyncSessionLocal() as db:
        db.add(StorageQuota(id=1, used_bytes=102))
        for index in range(102):
            filename = f"{uuid.uuid4().hex}.png"
            db.add(UploadAsset(filename=filename, size_bytes=1, content_type="image/png", state="stored", created_at=datetime.now(timezone.utc) - timedelta(days=2)))
            bucket.objects[filename] = {"Body": b"x"}
            if index < 101:
                db.add(Item(user_id=data["user"]["id"], name=f"Reference {index}", image_url=f"/uploads/{filename}"))
        await db.commit()
    assert await cleanup_orphan_uploads() == 1
    assert len(bucket.objects) == 101
    async with AsyncSessionLocal() as db:
        assert (await db.get(StorageQuota, 1)).used_bytes == 101


@pytest.mark.asyncio
async def test_local_import_is_explicit_idempotent_and_preserves_source(bucket, tmp_path, monkeypatch):
    from app.import_uploads import import_files
    filename = f"{uuid.uuid4().hex}.png"
    source = tmp_path / filename
    source.write_bytes(b"existing-local-bytes")
    monkeypatch.setattr("app.import_uploads.referenced_files", AsyncMock(return_value={filename}))
    assert (await import_files(tmp_path))["dry_run"] is True
    assert not bucket.objects
    assert (await import_files(tmp_path, apply=True))["imported_files"] == 1
    assert (await import_files(tmp_path, apply=True))["imported_files"] == 0
    assert source.read_bytes() == b"existing-local-bytes"
    async with AsyncSessionLocal() as db:
        assert (await db.get(StorageQuota, 1)).used_bytes == len(source.read_bytes())


def test_railway_production_configuration_and_secret_error_redaction(monkeypatch):
    from pydantic import ValidationError
    monkeypatch.setenv("RAILWAY_PROJECT_ID", "test-project")
    common = dict(_env_file=None, ENVIRONMENT="production", SECRET_KEY="0123456789abcdefABCDEFxyz" * 3,
        DATABASE_URL="postgresql://test:test@private/test", REDIS_URL="redis://private:6379",
        PUBLIC_APP_URL="https://site.example", STORAGE_BACKEND="s3", S3_ENDPOINT_URL="https://s3.example",
        S3_BUCKET="test", S3_ACCESS_KEY_ID="test", S3_SECRET_ACCESS_KEY="private-test-secret",
        EMAIL_PROVIDER="resend", RESEND_API_KEY="private-provider-secret", RUN_BACKGROUND_TASKS=False)
    assert Settings(**common).DATABASE_URL.startswith("postgresql+asyncpg://")
    with pytest.raises(ValidationError):
        Settings(**{**common, "RUN_BACKGROUND_TASKS": True})
    with pytest.raises(ValidationError) as exc:
        Settings(**{**common, "REDIS_URL": ""})
    assert "private-provider-secret" not in str(exc.value)
    assert "private-test-secret" not in str(exc.value)


@pytest.mark.asyncio
async def test_oversized_chunked_body_rejected_before_parsing():
    async def chunks():
        for _ in range(7):
            yield b"x" * 1024 * 1024
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/auth/login", content=chunks(), headers={"Content-Type": "application/json"})
        assert res.status_code == 413


@pytest.mark.asyncio
async def test_http_admission_limit_does_not_block_websockets(monkeypatch):
    from app.core.request_limits import RequestLimitsMiddleware
    entered = asyncio.Event()
    release = asyncio.Event()
    async def inner(scope, receive, send):
        if scope["type"] == "http":
            entered.set()
            await release.wait()
    middleware = RequestLimitsMiddleware(inner)
    monkeypatch.setattr(settings, "MAX_ACTIVE_REQUESTS", 1)
    async def receive():
        return {"type": "http.request", "body": b""}
    sent = []
    async def send(message):
        sent.append(message)
    first = asyncio.create_task(middleware({"type": "http", "headers": []}, receive, send))
    await entered.wait()
    try:
        await middleware({"type": "http", "headers": []}, receive, send)
        assert sent[0]["status"] == 503
        await middleware({"type": "websocket"}, receive, send)
    finally:
        release.set()
        await first
    assert middleware.active == 0


@pytest.mark.asyncio
async def test_history_cursor_is_bounded_stable_and_scoped_to_conversation():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        _, contact = await conversation(ac, headers)
        _, other = await conversation(ac, headers)
        same_time = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            for index in range(205):
                db.add(Message(conversation_id=contact["conversation_id"], sender_type="owner", content=f"message {index}", created_at=same_time))
            await db.commit()
        seen = set()
        cursor = None
        sizes = []
        while True:
            params = {"limit": 100}
            if cursor:
                params["before"] = cursor
            res = await ac.get(f"/api/v1/conversations/{contact['conversation_id']}", headers=headers, params=params)
            assert res.status_code == 200, res.text
            page = res.json()
            sizes.append(len(page["messages"]))
            ids = {message["id"] for message in page["messages"]}
            assert not seen.intersection(ids)
            seen.update(ids)
            cursor = page["next_cursor"]
            if cursor is None:
                break
        assert sizes == [100, 100, 6] and len(seen) == 206
        bad = await ac.get(f"/api/v1/conversations/{other['conversation_id']}?before={next(iter(seen))}", headers=headers)
        assert bad.status_code == 404
