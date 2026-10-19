import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import httpx
import pytest
from pydantic import ValidationError
from app.main import app
from app.core.config import settings, Settings
from app.db.session import AsyncSessionLocal
from app.models.message import Message
from app.models.item import Item
from app.models.user import User
from app.services.media_retention import expire_chat_photos, EXPIRED_PHOTO
from tests.test_production import account, conversation


@pytest.mark.asyncio
async def test_retention_preserves_text_recent_media_and_public_references():
    now = datetime.now(timezone.utc)
    old = now - timedelta(days=31)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        user, headers = await account(ac)
        item, contact = await conversation(ac, headers)
    files = [uuid.uuid4().hex + ".png" for _ in range(4)]
    for filename in files:
        (Path(settings.UPLOAD_DIR) / filename).write_bytes(b"isolated test image")
    async with AsyncSessionLocal() as db:
        messages = [Message(conversation_id=contact["conversation_id"], sender_type="finder",
            content=f"Buraya bıraktım. 📷 [Fotoğraf](/uploads/{filename}) Teşekkürler.", created_at=old) for filename in files]
        db.add_all(messages)
        # A newer message protects the shared file even after the old reference expires.
        recent = Message(conversation_id=contact["conversation_id"], sender_type="owner",
            content=f"📷 [Photo](/uploads/{files[1]})", created_at=now)
        db.add(recent)
        profile = await db.get(User, user["user"]["id"])
        profile.avatar_url = f"/uploads/{files[2]}"
        owned_item = await db.get(Item, item["id"])
        owned_item.image_url = f"/uploads/{files[3]}"
        db.add(Message(conversation_id=contact["conversation_id"], sender_type="finder", content="/uploads/not-a-photo", created_at=old - timedelta(days=1)))
        await db.commit()
        ids = [m.id for m in messages]
        recent_id = recent.id
    assert await expire_chat_photos(now) == 4
    assert not (Path(settings.UPLOAD_DIR) / files[0]).exists()
    assert all((Path(settings.UPLOAD_DIR) / name).exists() for name in files[1:])
    async with AsyncSessionLocal() as db:
        for message_id in ids:
            msg = await db.get(Message, message_id)
            assert msg.content == f"Buraya bıraktım. {EXPIRED_PHOTO} Teşekkürler."
            assert msg.created_at.replace(tzinfo=timezone.utc) == old
        assert "/uploads/" in (await db.get(Message, recent_id)).content
    assert await expire_chat_photos(now) == 0


def test_redisless_railway_requires_explicit_single_instance(monkeypatch):
    monkeypatch.setenv("RAILWAY_PROJECT_ID", "isolated-test-project")
    common = dict(_env_file=None, ENVIRONMENT="production", SECRET_KEY=uuid.uuid4().hex + uuid.uuid4().hex,
        DATABASE_URL="postgresql://test:test@private/test", REDIS_URL="", STORAGE_BACKEND="s3",
        S3_ENDPOINT_URL="https://bucket.example", S3_BUCKET="test", S3_ACCESS_KEY_ID="test",
        S3_SECRET_ACCESS_KEY="isolated-test-key", PUBLIC_APP_URL="https://site.example",
        EMAIL_PROVIDER="resend", RESEND_API_KEY="isolated-test-provider-key", RUN_BACKGROUND_TASKS=True)
    with pytest.raises(ValidationError):
        Settings(**common)
    config = Settings(**common, SINGLE_INSTANCE_MODE=True)
    assert config.REDIS_URL == "" and config.RUN_BACKGROUND_TASKS
    with pytest.raises(ValidationError):
        Settings(**{**common, "RUN_BACKGROUND_TASKS": False}, SINGLE_INSTANCE_MODE=True)
