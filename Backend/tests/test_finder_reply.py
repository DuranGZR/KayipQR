import asyncio
import html
import re
import uuid
from urllib.parse import urlsplit, parse_qs

import httpx
import pytest
from sqlalchemy import select, func

from app.main import app
from app.db.session import AsyncSessionLocal
from app.models.email_outbox import EmailOutbox
from app.models.conversation import Conversation
from tests.test_production import account


@pytest.mark.asyncio
async def test_first_owner_reply_sends_one_private_return_link_and_hides_email():
    email = f"finder-{uuid.uuid4().hex}@example.org"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        item = (await ac.post("/api/v1/items", headers=headers, json={"name": "Anahtar"})).json()
        code = item["qr_code"]["unique_code"]
        result = await ac.post(f"/api/v1/public/q/{code}/contact", json={"message": "Buldum", "finder_email": f" {email} "})
        assert result.status_code == 201, result.text
        contact = result.json()
        cid = contact["conversation_id"]
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(EmailOutbox).where(EmailOutbox.recipient == email)) == 0

        # Simultaneous replies must reserve only one notification.
        replies = await asyncio.gather(*[
            ac.post(f"/api/v1/conversations/{cid}/messages", headers=headers, json={"content": f"Teşekkürler {i}"})
            for i in range(2)
        ])
        assert [response.status_code for response in replies] == [201, 201]
        assert (await ac.post(f"/api/v1/conversations/{cid}/messages", headers=headers, json={"content": "Devam"})).status_code == 201
        assert (await ac.post(f"/api/v1/conversations/finder/{contact['finder_session_token']}/messages", json={"content": "Ben de buradayım"})).status_code == 201

        async with AsyncSessionLocal() as db:
            mails = (await db.scalars(select(EmailOutbox).where(EmailOutbox.recipient == email))).all()
            assert len(mails) == 1
            body = html.unescape(mails[0].html_body)
            assert "Teşekkürler" not in body  # No private message content in notification.
            link = re.search(r'href="([^"]+#chat=[^"]+)"', body).group(1)
            parsed = urlsplit(link)
            assert parsed.path == f"/q/{code}" and not parsed.query
            token = parse_qs(parsed.fragment)["chat"][0]
            assert token == contact["finder_session_token"]
            assert (await db.get(Conversation, cid)).finder_reply_notified_at is not None

        # The link works without an owner login or any original browser state.
        restored = await ac.get(f"/api/v1/conversations/finder/{token}")
        assert restored.status_code == 200 and restored.json()["id"] == cid
        for response in (restored, await ac.get(f"/api/v1/conversations/{cid}", headers=headers),
                         await ac.get("/api/v1/conversations", headers=headers)):
            assert email not in response.text and "finder_email" not in response.text
        assert (await ac.delete(f"/api/v1/conversations/{cid}", headers=headers)).status_code == 204
        assert (await ac.get(f"/api/v1/conversations/finder/{token}")).status_code == 404


@pytest.mark.asyncio
async def test_optional_email_validation_and_no_finder_mail_without_address():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        owner, headers = await account(ac)
        item = (await ac.post("/api/v1/items", headers=headers, json={"name": "Cüzdan"})).json()
        path = f"/api/v1/public/q/{item['qr_code']['unique_code']}/contact"
        for bad in ("wrong", "person@example.org\r\nBcc:other@example.org", "a" * 260 + "@example.org"):
            assert (await ac.post(path, json={"message": "Buldum", "finder_email": bad})).status_code == 422
        contact = (await ac.post(path, json={"message": "Buldum", "finder_email": "  "})).json()
        assert (await ac.post(f"/api/v1/conversations/{contact['conversation_id']}/messages", headers=headers, json={"content": "Sağ ol"})).status_code == 201
        async with AsyncSessionLocal() as db:
            mails = (await db.scalars(select(EmailOutbox))).all()
            assert len(mails) == 1 and mails[0].recipient == owner["user"]["email"]


@pytest.mark.asyncio
async def test_notification_failure_rolls_back_message_and_reservation(monkeypatch):
    from app.services import chat_service as chat_module
    from app.models.message import Message
    email = f"rollback-{uuid.uuid4().hex}@example.org"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        item = (await ac.post("/api/v1/items", headers=headers, json={"name": "Anahtar"})).json()
        contact = (await ac.post(f"/api/v1/public/q/{item['qr_code']['unique_code']}/contact",
            json={"message": "Buldum", "finder_email": email})).json()
        cid = contact["conversation_id"]
        original = chat_module.queue_email

        def fail(*args, **kwargs):
            raise RuntimeError("outbox failure")

        monkeypatch.setattr(chat_module, "queue_email", fail)
        with pytest.raises(RuntimeError, match="outbox failure"):
            await ac.post(f"/api/v1/conversations/{cid}/messages", headers=headers, json={"content": "İlk cevap"})
        async with AsyncSessionLocal() as db:
            assert (await db.get(Conversation, cid)).finder_reply_notified_at is None
            assert await db.scalar(select(func.count()).select_from(Message).where(Message.conversation_id == cid, Message.sender_type == "owner")) == 0
        monkeypatch.setattr(chat_module, "queue_email", original)
        assert (await ac.post(f"/api/v1/conversations/{cid}/messages", headers=headers, json={"content": "İlk cevap"})).status_code == 201
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(EmailOutbox).where(EmailOutbox.recipient == email)) == 1
