"""Recipient-wide mail limits and bounded media refresh authorization."""
import hashlib
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from sqlalchemy import func, select, update

from app.main import app
from app.db.session import AsyncSessionLocal
from app.models.email_outbox import EmailOutbox
from app.models.runtime_state import RuntimeBucket
from app.models.notification import Notification
from app.models.message import Message
from app.core import media
from app.services.notification_service import notification_service
from app.services.runtime_limits import consume_window
from tests.test_production import account, conversation


@pytest.mark.asyncio
async def test_concurrent_notification_quota_is_atomic_and_rolls_back():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, _ = await account(ac)
    recipient = data["user"]["email"]
    # An aborted message transaction must not spend the recipient's allowance.
    async with AsyncSessionLocal() as db:
        assert await consume_window(f"message-mail:cooldown:{recipient}", 1, 900, db=db) == 0
        await db.rollback()

    async def notify():
        async with AsyncSessionLocal() as db:
            await notification_service.create_notification(db, data["user"]["id"], "new_message",
                "Yeni mesaj", "Eşzamanlı konuşma", user_email=recipient)
    await asyncio.gather(*(notify() for _ in range(5)))
    async with AsyncSessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(EmailOutbox).where(
            EmailOutbox.recipient == recipient, EmailOutbox.purpose == "notification")) == 1
        assert await db.scalar(select(func.count()).select_from(Notification).where(
            Notification.user_id == data["user"]["id"])) == 5


@pytest.mark.asyncio
async def test_recipient_limit_spans_items_and_leaves_auth_mail_independent():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        await conversation(ac, headers)
        await conversation(ac, headers)  # Different item, same recipient, no second mail.
        recipient = data["user"]["email"]
        cooldown_key = hashlib.sha256(f"message-mail:cooldown:{recipient}".encode()).hexdigest()
        async with AsyncSessionLocal() as db:
            async def count_mail():
                return await db.scalar(select(func.count()).select_from(EmailOutbox).where(
                    EmailOutbox.recipient == recipient, EmailOutbox.purpose == "notification"))
            assert await count_mail() == 1
            # Simulate ten distinct 15-minute windows without expiring the daily budget.
            for index in range(10):
                await db.execute(update(RuntimeBucket).where(RuntimeBucket.key == cooldown_key)
                    .values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)))
                await notification_service.create_notification(db, data["user"]["id"], "new_message",
                    "Yeni mesaj", f"Konuşma {index}", user_email=recipient)
            assert await count_mail() == 10
        reset = await ac.post("/api/v1/auth/forgot-password", json={"email": recipient})
        assert reset.status_code == 200
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(EmailOutbox).where(
                EmailOutbox.recipient == recipient, EmailOutbox.purpose == "password_reset")) == 1
        other, other_headers = await account(ac)
        await conversation(ac, other_headers)
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(EmailOutbox).where(
                EmailOutbox.recipient == other["user"]["email"], EmailOutbox.purpose == "notification")) == 1


@pytest.mark.asyncio
async def test_single_message_refresh_enforces_owner_and_finder_boundaries(monkeypatch):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        _, contact = await conversation(ac, headers)
        cid, token = contact["conversation_id"], contact["finder_session_token"]
        detail = (await ac.get(f"/api/v1/conversations/{cid}", headers=headers)).json()
        mid = detail["messages"][0]["id"]
        filename = "a" * 32 + ".jpg"
        async with AsyncSessionLocal() as db:
            await db.execute(update(Message).where(Message.id == mid).values(content=f"/uploads/{filename}"))
            await db.commit()
        owner_path = f"/api/v1/conversations/{cid}/messages/{mid}"
        finder_path = f"/api/v1/conversations/finder/{token}/messages/{mid}"
        before = (await ac.get(owner_path, headers=headers)).json()
        assert before["id"] == mid
        clock = media.time.time() + 7200
        monkeypatch.setattr(media, "time", SimpleNamespace(time=lambda: clock))
        refreshed = (await ac.get(finder_path)).json()
        assert refreshed["id"] == mid and refreshed["content"] != before["content"]
        query = parse_qs(urlsplit(refreshed["content"]).query)
        assert media.valid_signature(filename, query["expires"][0], query["signature"][0])
        assert (await ac.get(owner_path)).status_code == 401
        _, other_headers = await account(ac)
        _, other_contact = await conversation(ac, other_headers)
        assert (await ac.get(owner_path, headers=other_headers)).status_code == 404
        assert (await ac.get(f"/api/v1/conversations/{other_contact['conversation_id']}/messages/{mid}", headers=other_headers)).status_code == 404
        assert (await ac.get(f"/api/v1/conversations/finder/{other_contact['finder_session_token']}/messages/{mid}")).status_code == 404
        assert (await ac.get(f"/api/v1/conversations/finder/invalid/messages/{mid}")).status_code == 404
