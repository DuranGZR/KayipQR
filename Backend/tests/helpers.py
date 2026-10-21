"""Simulate receiving the signup link without using a real email provider."""
from sqlalchemy import select, delete
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.email_outbox import EmailOutbox
from app.core.security import create_email_verification_token


async def verification_token(email):
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email.lower()))).scalar_one()
        return create_email_verification_token(user)


async def consume_verification_mail(email):
    async with AsyncSessionLocal() as db:
        await db.execute(delete(EmailOutbox).where(EmailOutbox.recipient == email.lower(), EmailOutbox.purpose == "verify_email"))
        await db.commit()


async def verified_registration(client, payload):
    response = await client.post("/api/v1/auth/register", json=payload)
    if response.status_code != 201:
        return response
    verified = await client.post("/api/v1/auth/verify-email", json={"token": await verification_token(payload["email"])})
    assert verified.status_code == 200, verified.text
    await consume_verification_mail(payload["email"])
    verified.status_code = 201
    return verified


def verified_registration_sync(client, payload):
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    token = client.portal.call(verification_token, payload["email"])
    response = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert response.status_code == 200, response.text
    client.portal.call(consume_verification_mail, payload["email"])
    return response
