from tests.helpers import verified_registration, verified_registration_sync
import io
import logging
import time
import uuid
import asyncio
from datetime import timedelta, datetime, timezone
from urllib.parse import urlsplit
from unittest.mock import AsyncMock, MagicMock
import bcrypt
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import select, func, event, update
from starlette.requests import Request
from starlette.websockets import WebSocketDisconnect

from app.main import app
from app.core.config import Settings, settings
from app.core.security import create_access_token, create_password_reset_token, get_password_hash, verify_password
from app.core.rate_limiter import rate_limiter
from app.core.logging import RedactCredentials
from app.db.session import AsyncSessionLocal, engine
from app.models.message import Message
from app.models.user import User
from app.models.notification import Notification
from app.models.email_outbox import EmailOutbox
from app.services.email_service import email_service
from app.services.notification_service import notification_service
from app.services.outbox_service import deliver_pending


async def account(ac):
    email = f"prod-{uuid.uuid4().hex}@example.com"
    res = await verified_registration(ac, {"email": email, "password": "initial-password"})
    assert res.status_code == 201, res.text
    data = res.json()
    return data, {"Authorization": f"Bearer {data['access_token']}"}


async def conversation(ac, headers, name="Test eşya"):
    item = await ac.post("/api/v1/items", headers=headers, json={"name": name})
    assert item.status_code == 201, item.text
    contact = await ac.post(f"/api/v1/public/q/{item.json()['qr_code']['unique_code']}/contact", json={"message": "Buldum"})
    assert contact.status_code == 201, contact.text
    return item.json(), contact.json()


@pytest.mark.parametrize("secret", ["x" * 64, "please-set-a-strong-64-char-production-secret-key-in-env-file", "short"])
def test_production_rejects_placeholder_secrets(secret):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY=secret,
                 PUBLIC_APP_URL="https://example.com", SMTP_HOST="smtp.example.com", SMTP_USER="test", SMTP_PASSWORD="test")


def test_production_requires_smtp_and_valid_environment():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY=uuid.uuid4().hex + uuid.uuid4().hex, PUBLIC_APP_URL="https://example.com")
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ENVIRONMENT="prodution")


def test_argon_password_suffix_is_significant():
    first = "ş" * 50 + "first"
    hashed = get_password_hash(first)
    assert hashed.startswith("$argon2id$")
    assert verify_password(first, hashed)
    assert not verify_password("ş" * 50 + "second", hashed)


@pytest.mark.asyncio
async def test_password_change_revokes_old_token_and_returns_current_session():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        changed = await ac.post("/api/v1/auth/change-password", headers=headers,
            json={"current_password": "initial-password", "new_password": "changed-password"})
        assert changed.status_code == 200
        assert (await ac.get("/api/v1/auth/me", headers=headers)).status_code == 401
        fresh = {"Authorization": f"Bearer {changed.json()['access_token']}"}
        assert (await ac.get("/api/v1/auth/me", headers=fresh)).status_code == 200
        async with AsyncSessionLocal() as db:
            user = await db.get(User, data["user"]["id"])
            reset_token = create_password_reset_token(user.email, user.hashed_password)
        reset = await ac.post("/api/v1/auth/reset-password", json={"token": reset_token, "new_password": "reset-password"})
        assert reset.status_code == 200
        assert (await ac.get("/api/v1/auth/me", headers=fresh)).status_code == 401


@pytest.mark.asyncio
async def test_legacy_bcrypt_account_upgrades_on_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        data, _ = await account(ac)
        async with AsyncSessionLocal() as db:
            user = await db.get(User, data["user"]["id"])
            user.hashed_password = bcrypt.hashpw(b"legacy-password", bcrypt.gensalt()).decode()
            await db.commit()
        login = await ac.post("/api/v1/auth/login", json={"email": data["user"]["email"], "password": "legacy-password"})
        assert login.status_code == 200
        async with AsyncSessionLocal() as db:
            assert (await db.get(User, data["user"]["id"])).hashed_password.startswith("$argon2id$")


@pytest.mark.asyncio
async def test_reset_link_can_only_win_once_under_concurrency():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        data, _ = await account(ac)
        async with AsyncSessionLocal() as db:
            user = await db.get(User, data["user"]["id"])
            token = create_password_reset_token(user.email, user.hashed_password)
        responses = await asyncio.gather(*[
            ac.post("/api/v1/auth/reset-password", json={"token": token, "new_password": f"replacement-{index}"})
            for index in range(2)
        ])
        assert sorted(response.status_code for response in responses) == [200, 400]


@pytest.mark.asyncio
async def test_login_rehash_cannot_overwrite_concurrent_password_reset(monkeypatch):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        data, _ = await account(ac)
        async with AsyncSessionLocal() as db:
            user = await db.get(User, data["user"]["id"])
            user.hashed_password = bcrypt.hashpw(b"legacy-password", bcrypt.gensalt()).decode()
            await db.commit()
        entered = asyncio.Event()
        resume = asyncio.Event()
        async def paused_hash(password):
            entered.set()
            await resume.wait()
            return get_password_hash(password)
        monkeypatch.setattr("app.services.auth_service.hash_password", paused_hash)
        request = asyncio.create_task(ac.post("/api/v1/auth/login", json={"email": data["user"]["email"], "password": "legacy-password"}))
        await asyncio.wait_for(entered.wait(), timeout=5)
        reset_hash = get_password_hash("reset-password")
        try:
            async with AsyncSessionLocal() as db:
                await db.execute(update(User).where(User.id == data["user"]["id"]).values(hashed_password=reset_hash))
                await db.commit()
        finally:
            resume.set()
        assert (await request).status_code == 401
        async with AsyncSessionLocal() as db:
            assert (await db.get(User, data["user"]["id"])).hashed_password == reset_hash


@pytest.mark.parametrize("bad", [{"color_dark": {}}, {"color_dark": "not-a-color"}, {"frame_type": "unknown"}, {"show_label": "yes"}])
@pytest.mark.asyncio
async def test_qr_bad_input_does_not_corrupt_item(bad):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        item = (await ac.post("/api/v1/items", headers=headers, json={"name": "QR test"})).json()
        result = await ac.put(f"/api/v1/qr/item/{item['id']}", headers=headers, json={"design_config": bad})
        assert result.status_code == 422
        reread = await ac.get(f"/api/v1/items/{item['id']}", headers=headers)
        assert reread.status_code == 200
        assert reread.json()["qr_code"]["color_dark"] == item["qr_code"]["color_dark"]


@pytest.mark.asyncio
async def test_maximum_item_name_notifications_fit_database():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        item, contact = await conversation(ac, headers, "ş" * 255)
        assert (await ac.get(f"/api/v1/public/q/{item['qr_code']['unique_code']}")).status_code == 200
        msg = await ac.post(f"/api/v1/conversations/finder/{contact['finder_session_token']}/messages", json={"content": "Tekrar buldum"})
        assert msg.status_code == 201
        async with AsyncSessionLocal() as db:
            titles = (await db.execute(select(Notification.title).where(Notification.user_id == data["user"]["id"]))).scalars().all()
            assert len(titles) >= 3
            assert all(len(title) <= 255 for title in titles)


@pytest.mark.asyncio
async def test_notification_failure_rolls_back_message(monkeypatch):
    async with AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test") as ac:
        _, headers = await account(ac)
        _, contact = await conversation(ac, headers)
        monkeypatch.setattr(notification_service, "create_notification", AsyncMock(side_effect=RuntimeError("injected failure")))
        res = await ac.post(f"/api/v1/conversations/finder/{contact['finder_session_token']}/messages", json={"content": "must rollback"})
        assert res.status_code == 500
        async with AsyncSessionLocal() as db:
            assert (await db.execute(select(func.count(Message.id)).where(Message.conversation_id == contact["conversation_id"]))).scalar() == 1


def test_proxy_headers_only_from_explicit_trusted_network(monkeypatch):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", ["127.0.0.1", "10.1.0.0/24"])
    def request(host, headers):
        return Request({"type": "http", "client": (host, 1), "headers": [(k.encode(), v.encode()) for k, v in headers.items()]})
    assert rate_limiter.get_client_ip(request("172.18.0.4", {"cf-connecting-ip": "1.2.3.4"})) == "172.18.0.4"
    assert rate_limiter.get_client_ip(request("10.1.0.9", {"x-forwarded-for": "6.6.6.6, 8.8.8.8"})) == "8.8.8.8"
    assert rate_limiter.get_client_ip(request("127.0.0.1", {"cf-connecting-ip": "invalid"})) == "127.0.0.1"


@pytest.mark.asyncio
async def test_smtp_not_silently_successful_in_production(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert not await email_service.send_email("test@example.com", "test", "test")


@pytest.mark.asyncio
async def test_smtp_verifies_tls_and_closes_connection(monkeypatch):
    import ssl
    from email import message_from_string
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_USER", "test")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "test-only")
    monkeypatch.setattr(settings, "SMTP_PORT", 587)
    monkeypatch.setattr(settings, "SMTP_TLS", True)
    server = MagicMock()
    monkeypatch.setattr("app.services.email_service.smtplib.SMTP", lambda *args, **kwargs: server)
    assert await email_service.send_email("test@example.com", "subject", "<style>hidden</style><p>Visible</p>")
    context = server.starttls.call_args.kwargs["context"]
    assert context.verify_mode == ssl.CERT_REQUIRED and context.check_hostname
    message = message_from_string(server.sendmail.call_args.args[2])
    plain = message.get_payload()[0].get_payload(decode=True).decode()
    assert "Visible" in plain and "hidden" not in plain and "<p>" not in plain
    assert message["Date"] and message["Message-ID"]
    server.close.assert_called_once()


@pytest.mark.asyncio
async def test_orphan_cleanup_preserves_referenced_public_upload():
    import os
    from pathlib import Path
    from app.services.storage_service import cleanup_orphan_uploads
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        image = io.BytesIO()
        Image.new("RGB", (16, 16), "blue").save(image, format="PNG")
        urls = []
        for _ in range(2):
            uploaded = await ac.post("/api/v1/public/upload", files={"file": ("photo.png", image.getvalue(), "image/png")})
            assert uploaded.status_code == 201
            urls.append(uploaded.json()["url"])
        assert (await ac.put("/api/v1/auth/me", headers=headers, json={"avatar_url": urls[0]})).status_code == 200
        paths = [Path(settings.UPLOAD_DIR) / Path(urlsplit(url).path).name for url in urls]
        for path in paths:
            os.utime(path, (time.time() - 90000, time.time() - 90000))
        await cleanup_orphan_uploads()
        assert paths[0].exists() and not paths[1].exists()
        assert (await ac.get(urlsplit(urls[0]).path)).status_code == 200


@pytest.mark.asyncio
async def test_storage_capacity_rejects_upload_without_partial_file(monkeypatch):
    from pathlib import Path
    monkeypatch.setattr(settings, "MAX_STORAGE_SIZE_MB", 0)
    before = set(Path(settings.UPLOAD_DIR).iterdir())
    image = io.BytesIO()
    Image.new("RGB", (16, 16), "green").save(image, format="PNG")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/public/upload", files={"file": ("photo.png", image.getvalue(), "image/png")})
        assert res.status_code == 507
    assert set(Path(settings.UPLOAD_DIR).iterdir()) == before


@pytest.mark.asyncio
async def test_durable_email_retries_and_clears_sensitive_body(monkeypatch):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        await conversation(ac, headers)
        async with AsyncSessionLocal() as db:
            mail = (await db.execute(select(EmailOutbox).where(EmailOutbox.recipient == data["user"]["email"]))).scalars().first()
            mail_id = mail.id
        monkeypatch.setattr(email_service, "send_email", AsyncMock(return_value=False))
        await deliver_pending()
        async with AsyncSessionLocal() as db:
            mail = await db.get(EmailOutbox, mail_id)
            assert mail.status == "pending" and mail.attempts == 1 and mail.html_body
            mail.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            await db.commit()
        monkeypatch.setattr(email_service, "send_email", AsyncMock(return_value=True))
        await deliver_pending()
        async with AsyncSessionLocal() as db:
            mail = await db.get(EmailOutbox, mail_id)
            assert mail.status == "delivered" and mail.html_body == ""


@pytest.mark.asyncio
async def test_chat_media_needs_valid_capability_and_refreshes_on_read():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        _, contact = await conversation(ac, headers)
        image = io.BytesIO()
        Image.new("RGB", (16, 16), "red").save(image, format="PNG")
        upload = await ac.post("/api/v1/public/upload", files={"file": ("photo.png", image.getvalue(), "image/png")})
        url = upload.json()["url"]
        path = urlsplit(url).path
        assert (await ac.get(url)).status_code == 200
        assert (await ac.get(path)).status_code == 403
        assert (await ac.get(url.replace("signature=", "signature=bad"))).status_code == 403
        send = await ac.post(f"/api/v1/conversations/finder/{contact['finder_session_token']}/messages", json={"content": f"[Fotoğraf]({url})"})
        assert send.status_code == 201
        assert "signature=" in send.json()["content"]
        async with AsyncSessionLocal() as db:
            stored = await db.get(Message, send.json()["id"])
            assert "signature=" not in stored.content
        forged = await ac.post(f"/api/v1/conversations/finder/{contact['finder_session_token']}/messages", json={"content": f"[Fotoğraf]({path})"})
        assert forged.status_code == 403
        read = await ac.get(f"/api/v1/conversations/{contact['conversation_id']}", headers=headers)
        assert "signature=" in read.json()["messages"][-1]["content"]


@pytest.mark.asyncio
async def test_item_list_query_count_does_not_grow_per_item():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        for index in range(5):
            assert (await ac.post("/api/v1/items", headers=headers, json={"name": f"Eşya {index}"})).status_code == 201
        statements = []
        def record(*args):
            statements.append(args[2])
        event.listen(engine.sync_engine, "before_cursor_execute", record)
        try:
            result = await ac.get("/api/v1/items", headers=headers)
        finally:
            event.remove(engine.sync_engine, "before_cursor_execute", record)
        assert len(result.json()) == 5
        assert len(statements) <= 6
        page = await ac.get("/api/v1/items?limit=2&offset=2", headers=headers)
        assert len(page.json()) == 2


@pytest.mark.asyncio
async def test_readiness_detects_database_failure(monkeypatch):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        assert (await ac.get("/ready")).status_code == 200
        monkeypatch.setattr("app.main.AsyncSessionLocal", lambda: (_ for _ in ()).throw(RuntimeError("DB unavailable")))
        assert (await ac.get("/ready")).status_code == 503


def test_access_logs_redact_credentials():
    record = logging.LogRecord("uvicorn.access", logging.INFO, "", 1, 'GET %s', ('/api/v1/conversations/finder/finder_secret/messages?token=jwt_secret',), None)
    RedactCredentials().filter(record)
    assert "finder_secret" not in record.getMessage() and "jwt_secret" not in record.getMessage()
    from uvicorn.logging import AccessFormatter
    uvicorn_record = logging.LogRecord("uvicorn.access", logging.INFO, "", 1, '%s - "%s %s HTTP/%s" %d',
        ("127.0.0.1:123", "GET", "/api/v1/conversations/finder/secret", "1.1", 200), None)
    RedactCredentials().filter(uvicorn_record)
    assert "secret" not in AccessFormatter('%(request_line)s %(status_code)s').format(uvicorn_record)


def test_websocket_rejects_expired_and_inactive_owner():
    with TestClient(app) as client:
        email = f"socket-{uuid.uuid4().hex}@example.com"
        data = verified_registration_sync(client, {"email": email, "password": "initial-password"}).json()
        headers = {"Authorization": f"Bearer {data['access_token']}"}
        item = client.post("/api/v1/items", headers=headers, json={"name": "Socket"}).json()
        contact = client.post(f"/api/v1/public/q/{item['qr_code']['unique_code']}/contact", json={"message": "Buldum"}).json()
        import asyncio
        async def user_state(active=None):
            async with AsyncSessionLocal() as db:
                user = await db.get(User, data["user"]["id"])
                if active is not None:
                    user.is_active = active
                    await db.commit()
                return user.hashed_password
        hashed = client.portal.call(user_state)
        short = create_access_token(data["user"]["id"], hashed, timedelta(seconds=2))
        path = f"/ws/chat/{contact['conversation_id']}"
        with client.websocket_connect(path, subprotocols=["kayipqr", f"auth.{short}"]) as ws:
            assert ws.accepted_subprotocol == "kayipqr"
            ws.send_json({"type": "ping"})
            assert ws.receive_json()["type"] == "pong"
            time.sleep(2.2)
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
        client.portal.call(user_state, False)
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(path, subprotocols=["kayipqr", f"auth.{data['access_token']}"]):
                pass
