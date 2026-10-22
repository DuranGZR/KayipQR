import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit
import httpx
import jwt
import pytest
from sqlalchemy import select, func, update
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from app.main import app
from app.core.config import settings
from app.core.security import create_password_reset_token, create_access_token
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.email_outbox import EmailOutbox
from app.models.message import Message
from app.models.runtime_state import RuntimeBucket
from app.services import google_auth
from app.services.outbox_service import deliver_pending
from app.services.email_service import email_service
from tests.helpers import verification_token
from tests.test_production import account, conversation


@pytest.mark.asyncio
async def test_signup_requires_verification_and_link_is_single_use():
    email = f"verify-{uuid.uuid4().hex}@example.org"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        registered = await ac.post("/api/v1/auth/register", json={"email": email, "password": "initial-password"})
        assert registered.status_code == 201 and "access_token" not in registered.json()
        assert registered.json()["verification_required"]
        denied = await ac.post("/api/v1/auth/login", json={"email": email, "password": "initial-password"})
        assert denied.status_code == 403
        async with AsyncSessionLocal() as db:
            user = (await db.execute(select(User).where(User.email == email))).scalar_one()
            forged_session = create_access_token(user.id, user.hashed_password)
            wrong_type = create_password_reset_token(user.email, user.hashed_password)
        assert (await ac.get("/api/v1/items", headers={"Authorization": "Bearer " + forged_session})).status_code == 401
        assert (await ac.post("/api/v1/auth/verify-email", json={"token": wrong_type})).status_code == 400
        token = await verification_token(email)
        verified = await ac.post("/api/v1/auth/verify-email", json={"token": token})
        assert verified.status_code == 200 and verified.json()["user"]["email_verified"]
        assert (await ac.post("/api/v1/auth/verify-email", json={"token": token})).status_code == 400
        assert (await ac.get("/api/v1/items", headers={"Authorization": "Bearer " + verified.json()["access_token"]})).status_code == 200


@pytest.mark.asyncio
async def test_reset_cooldown_is_per_address_and_does_not_reveal_account():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, _ = await account(ac)
        for email in (data["user"]["email"], "absent@example.org"):
            first = await ac.post("/api/v1/auth/forgot-password", json={"email": email})
            second = await ac.post("/api/v1/auth/forgot-password", json={"email": email.upper()})
            assert first.status_code == 200 and first.json()["retry_after"] == 60
            assert second.status_code == 429 and 1 <= int(second.headers["Retry-After"]) <= 60
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(EmailOutbox).where(EmailOutbox.purpose == "password_reset")) == 1


@pytest.mark.asyncio
async def test_only_first_message_per_conversation_emails_but_scans_still_notify():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        item, contact = await conversation(ac, headers)
        for _ in range(2):
            assert (await ac.get("/api/v1/public/q/" + item["qr_code"]["unique_code"])).status_code == 200
            assert (await ac.post("/api/v1/conversations/finder/" + contact["finder_session_token"] + "/messages", json={"content": "Devam"})).status_code == 201
        async with AsyncSessionLocal() as db:
            mails = (await db.execute(select(EmailOutbox).where(EmailOutbox.recipient == data["user"]["email"]))).scalars().all()
            assert len(mails) == 1
        notifications = (await ac.get("/api/v1/notifications", headers=headers)).json()
        assert len(notifications) >= 5
        await ac.post("/api/v1/public/q/" + item["qr_code"]["unique_code"] + "/contact", json={"message": "Yeni konuşma"})
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(EmailOutbox).where(EmailOutbox.recipient == data["user"]["email"])) == 1
        preferences = await ac.put("/api/v1/auth/me", headers=headers, json={"email_on_scan": True, "email_on_message": False})
        assert preferences.json()["email_on_scan"] is False


@pytest.mark.asyncio
async def test_auth_mail_token_starts_at_delivery_and_retry_reuses_payload(monkeypatch):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, _ = await account(ac)
        await ac.post("/api/v1/auth/forgot-password", json={"email": data["user"]["email"]})
    async with AsyncSessionLocal() as db:
        mail = (await db.execute(select(EmailOutbox).where(EmailOutbox.purpose == "password_reset"))).scalar_one()
        assert mail.html_body == "" and mail.token_expires_at is None
        mail.created_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        mail_id = mail.id
        await db.commit()
    send = AsyncMock(return_value=False)
    monkeypatch.setattr(email_service, "send_email", send)
    await deliver_pending()
    body = send.call_args.args[2]
    import re, html
    reset_token = re.search(r"reset-password\?token=([^'\"<\s]+)", html.unescape(body)).group(1)
    payload = jwt.decode(reset_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert 1750 < payload["exp"] - datetime.now(timezone.utc).timestamp() <= 1800
    async with AsyncSessionLocal() as db:
        mail = await db.get(EmailOutbox, mail_id)
        mail.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        await db.commit()
    send.return_value = True
    await deliver_pending()
    assert send.call_args.args[2] == body
    async with AsyncSessionLocal() as db:
        mail = await db.get(EmailOutbox, mail_id)
        assert mail.status == "delivered" and mail.html_body == ""


@pytest.mark.asyncio
async def test_expired_auth_request_is_discarded_and_password_change_invalidates_queued_mail(monkeypatch):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        await ac.post("/api/v1/auth/forgot-password", json={"email": data["user"]["email"]})
        async with AsyncSessionLocal() as db:
            await db.execute(update(EmailOutbox).where(EmailOutbox.purpose == "password_reset").values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)))
            await db.commit()
        send = AsyncMock(return_value=True)
        monkeypatch.setattr(email_service, "send_email", send)
        await deliver_pending()
        send.assert_not_called()
        async with AsyncSessionLocal() as db:
            await db.execute(update(RuntimeBucket).values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=1)))
            await db.commit()
        await ac.post("/api/v1/auth/forgot-password", json={"email": data["user"]["email"]})
        await ac.post("/api/v1/auth/change-password", headers=headers, json={"current_password": "initial-password", "new_password": "changed-password"})
        await deliver_pending()
        send.assert_not_called()


@pytest.mark.asyncio
async def test_delta_history_paginates_new_messages_and_preserves_read_receipts():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        _, contact = await conversation(ac, headers)
        path = "/api/v1/conversations/" + contact["conversation_id"]
        first = (await ac.get(path, headers=headers)).json()
        cursor = first["messages"][-1]["id"]
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            db.add_all([Message(conversation_id=contact["conversation_id"], sender_type="owner", content=str(i),
                created_at=now + timedelta(microseconds=i)) for i in range(105)])
            await db.commit()
        delta = (await ac.get(path + "?after=" + cursor, headers=headers)).json()
        assert len(delta["messages"]) == 100 and delta["messages"][0]["content"] == "0" and delta["next_cursor"]
        last = (await ac.get(path + "?after=" + delta["next_cursor"], headers=headers)).json()
        assert len(last["messages"]) == 5 and last["messages"][-1]["content"] == "104"
        assert last["last_message"]["content"] == "104"
        await ac.get("/api/v1/conversations/finder/" + contact["finder_session_token"])
        empty = (await ac.get(path + "?after=" + last["messages"][-1]["id"], headers=headers)).json()
        assert empty["messages"] == [] and empty["read_through"]
        assert (await ac.get(path + "?after=invalid", headers=headers)).status_code == 404
        assert (await ac.get(path + "?after=" + cursor + "&before=" + cursor, headers=headers)).status_code == 400


@pytest.fixture
def google_setup(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "isolated.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "isolated-client-secret")
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    key = jwt.algorithms.RSAAlgorithm.to_jwk(private.public_key(), as_dict=True)
    key.update(kid="isolated-key", alg="RS256", use="sig")
    monkeypatch.setattr(google_auth, "_keys", {"isolated-key": key})
    monkeypatch.setattr(google_auth, "_keys_until", float("inf"))
    return private


def google_claims(**extra):
    return {"sub": "google-" + uuid.uuid4().hex, "email": f"google-{uuid.uuid4().hex}@gmail.com", "email_verified": True,
        "aud": settings.GOOGLE_CLIENT_ID, "iss": "https://accounts.google.com", "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5), "nonce": "isolated-nonce", **extra}


@pytest.mark.asyncio
async def test_google_id_validation_rejects_wrong_audience_nonce_and_unverified_email(google_setup):
    for changes in ({"aud": "attacker"}, {"nonce": "attacker"}, {"email_verified": False}, {"iss": "https://attacker.test"}):
        token = jwt.encode(google_claims(**changes), google_setup, algorithm="RS256", headers={"kid": "isolated-key"})
        with pytest.raises(HTTPException) as caught:
            await google_auth.verify_id_token(token, "isolated-nonce")
        assert caught.value.status_code == 400


@pytest.mark.asyncio
async def test_google_state_and_one_use_handoff(google_setup, monkeypatch):
    url, cookie = google_auth.start_flow("//attacker.test")
    query = parse_qs(urlsplit(url).query)
    assert query["code_challenge_method"] == ["S256"]
    claims = google_claims(nonce=query["nonce"][0])
    token = jwt.encode(claims, google_setup, algorithm="RS256", headers={"kid": "isolated-key"})
    response = httpx.Response(200, json={"id_token": token}, request=httpx.Request("POST", "https://oauth2.googleapis.com/token"))
    exchange = AsyncMock(return_value=response)
    monkeypatch.setattr(httpx.AsyncClient, "post", exchange)
    async with AsyncSessionLocal() as db:
        with pytest.raises(HTTPException):
            await google_auth.finish_flow(db, "code", "wrong-state", cookie)
        exchange.assert_not_called()
        handoff = await google_auth.finish_flow(db, "code", query["state"][0], cookie)
    params = parse_qs(urlsplit(handoff).fragment)
    assert params["redirect"] == ["/dashboard"]
    async with AsyncSessionLocal() as db:
        session = await google_auth.exchange_ticket(db, params["ticket"][0])
        assert session.user.email_verified and session.user.has_password is False
    async with AsyncSessionLocal() as db:
        with pytest.raises(HTTPException) as caught:
            await google_auth.exchange_ticket(db, params["ticket"][0])
        assert caught.value.status_code == 400


@pytest.mark.asyncio
@pytest.mark.parametrize("legacy", [False, True])
async def test_google_unverified_pre_registration_does_not_retain_attackers_password(google_setup, monkeypatch, legacy):
    email = f"preexisting-{uuid.uuid4().hex}@gmail.com"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={"email": email, "password": "attacker-password"})
    if legacy:
        async with AsyncSessionLocal() as db:
            await db.execute(update(User).where(User.email == email).values(email_verified=True, email_verified_at=None))
            await db.commit()
    url, cookie = google_auth.start_flow("/studio")
    state = parse_qs(urlsplit(url).query)
    claims = google_claims(email=email, nonce=state["nonce"][0])
    token = jwt.encode(claims, google_setup, algorithm="RS256", headers={"kid": "isolated-key"})
    response = httpx.Response(200, json={"id_token": token}, request=httpx.Request("POST", "https://oauth2.googleapis.com/token"))
    monkeypatch.setattr(httpx.AsyncClient, "post", AsyncMock(return_value=response))
    async with AsyncSessionLocal() as db:
        await google_auth.finish_flow(db, "code", state["state"][0], cookie)
        user = (await db.execute(select(User).where(User.email == email))).scalar_one()
        assert user.email_verified and user.hashed_password.startswith("google:")
        assert user.google_sub == claims["sub"]


@pytest.mark.asyncio
async def test_google_http_cookie_callback_and_exchange(google_setup, monkeypatch):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test", follow_redirects=False) as ac:
        start = await ac.get("/api/v1/auth/google/start?redirect=/messages")
        assert start.status_code == 303
        assert "HttpOnly" in start.headers["set-cookie"] and "SameSite=lax" in start.headers["set-cookie"]
        state = parse_qs(urlsplit(start.headers["location"]).query)
        claims = google_claims(nonce=state["nonce"][0])
        token = jwt.encode(claims, google_setup, algorithm="RS256", headers={"kid": "isolated-key"})
        response = httpx.Response(200, json={"id_token": token}, request=httpx.Request("POST", "https://oauth2.googleapis.com/token"))
        with monkeypatch.context() as patch:
            patch.setattr(httpx.AsyncClient, "post", AsyncMock(return_value=response))
            callback = await ac.get("/api/v1/auth/google/callback", params={"code": "isolated-code", "state": state["state"][0]})
        assert callback.status_code == 303 and "access_token" not in callback.headers["location"]
        assert "Max-Age=0" in callback.headers["set-cookie"]
        assert callback.headers["referrer-policy"] == "no-referrer"
        ticket = parse_qs(urlsplit(callback.headers["location"]).fragment)["ticket"][0]
        auth = await ac.post("/api/v1/auth/google/exchange", json={"token": ticket})
        assert auth.status_code == 200 and auth.json()["user"]["email_verified"]
        assert (await ac.post("/api/v1/auth/google/exchange", json={"token": ticket})).status_code == 400


@pytest.mark.asyncio
async def test_verification_email_is_prepared_and_can_be_used(monkeypatch):
    email = f"inbox-{uuid.uuid4().hex}@example.org"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/api/v1/auth/register", json={"email": email, "password": "initial-password"})
        send = AsyncMock(return_value=True)
        monkeypatch.setattr(email_service, "send_email", send)
        await deliver_pending()
        import html, re
        token = re.search(r"verify-email\?token=([^&'\"<\s]+)", html.unescape(send.call_args.args[2])).group(1)
        assert (await ac.post("/api/v1/auth/verify-email", json={"token": token})).status_code == 200
