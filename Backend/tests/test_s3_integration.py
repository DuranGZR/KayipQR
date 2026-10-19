"""Real S3 protocol test, enabled only against an isolated CI/local test server."""
import asyncio
import io
import os
import uuid
from urllib.parse import urlsplit
import httpx
import pytest
import pytest_asyncio
from PIL import Image
from app.main import app
from app.core.config import settings
from app.services import object_storage
from tests.test_production import account, conversation

pytestmark = pytest.mark.skipif(not os.environ.get("TEST_S3_ENDPOINT"), reason="Isolated S3 test server not configured")


@pytest_asyncio.fixture
async def real_bucket(monkeypatch):
    bucket = "kayipqr-test-" + uuid.uuid4().hex
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "s3")
    monkeypatch.setattr(settings, "S3_BUCKET", bucket)
    monkeypatch.setattr(settings, "S3_ENDPOINT_URL", os.environ["TEST_S3_ENDPOINT"])
    monkeypatch.setattr(settings, "S3_ACCESS_KEY_ID", os.environ["TEST_S3_ACCESS_KEY"])
    monkeypatch.setattr(settings, "S3_SECRET_ACCESS_KEY", os.environ["TEST_S3_SECRET_KEY"])
    monkeypatch.setattr(settings, "S3_REGION", "us-east-1")
    monkeypatch.setattr(settings, "S3_ADDRESSING_STYLE", "path")
    object_storage.get_s3.cache_clear()
    client = object_storage.get_s3()
    await asyncio.to_thread(client.create_bucket, Bucket=bucket)
    try:
        yield client
    finally:
        objects = await asyncio.to_thread(client.list_objects_v2, Bucket=bucket)
        for obj in objects.get("Contents", []):
            await asyncio.to_thread(client.delete_object, Bucket=bucket, Key=obj["Key"])
        await asyncio.to_thread(client.delete_bucket, Bucket=bucket)
        client.close()
        object_storage.get_s3.cache_clear()


@pytest.mark.asyncio
async def test_s3_signed_download_and_chat_deletion(real_bucket):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        _, headers = await account(ac)
        _, contact = await conversation(ac, headers)
        image = io.BytesIO()
        Image.new("RGB", (32, 32), "green").save(image, format="PNG")
        upload = await ac.post("/api/v1/public/upload", files={"file": ("real.png", image.getvalue(), "image/png")})
        assert upload.status_code == 201
        url = upload.json()["url"]
        assert (await ac.get(urlsplit(url).path)).status_code == 403
        sent = await ac.post(f"/api/v1/conversations/finder/{contact['finder_session_token']}/messages", json={"content": f"[Fotoğraf]({url})"})
        assert sent.status_code == 201
        redirect = await ac.get(url)
        assert redirect.status_code == 307
        async with httpx.AsyncClient(timeout=10) as network:
            result = await network.get(redirect.headers["location"])
            assert result.status_code == 200
            assert result.headers["content-type"] == "image/png"
            assert (await network.get(redirect.headers["location"].split("?")[0])).status_code == 403
        assert (await ac.delete(f"/api/v1/conversations/{contact['conversation_id']}", headers=headers)).status_code == 204
        assert (await ac.get(url)).status_code == 404
