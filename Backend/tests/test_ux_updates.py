"""UX boundaries verified against isolated accounts; no external mail is sent."""
import html
import re
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from sqlalchemy import func, select

from app.main import app
from app.core.navigation import safe_return_path
from app.core.qr_policy import validate_qr_colors
from app.db.session import AsyncSessionLocal
from app.models.item import Item
from app.models.notification import Notification
from app.services.email_service import email_service
from app.services.outbox_service import deliver_pending
from app.services.qr_service import DEFAULT_PRESET_COLORS
from tests.test_production import account, conversation


@pytest.mark.parametrize("target", ["https://evil.org", "//evil.org", "/\\evil.org", "/studio\n", "/unknown", "/studio/../admin"])
def test_return_path_rejects_external_or_unknown_targets(target):
    assert safe_return_path(target) == "/dashboard"


def test_preset_contrast_and_short_hex_remain_valid():
    for foreground, background in DEFAULT_PRESET_COLORS.values():
        validate_qr_colors(foreground, background)
    validate_qr_colors("#000", "#fff")


@pytest.mark.asyncio
async def test_invalid_qr_is_not_created_updated_or_rendered():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        bad = await ac.post("/api/v1/items", headers=headers, json={"name": "Invisible", "qr_color_dark": "#ffffff", "qr_color_light": "#ffffff"})
        assert bad.status_code == 422
        async with AsyncSessionLocal() as db:
            assert await db.scalar(select(func.count()).select_from(Item).where(Item.user_id == data["user"]["id"])) == 0
        created = (await ac.post("/api/v1/items", headers=headers, json={"name": "Visible"})).json()
        bad = await ac.put(f"/api/v1/items/{created['id']}", headers=headers, json={"qr_color_dark": "#F6F0E4"})
        assert bad.status_code == 422
        unchanged = (await ac.get(f"/api/v1/items/{created['id']}", headers=headers)).json()
        assert unchanged["qr_code"]["color_dark"] == created["qr_code"]["color_dark"]
    from app.api.v1.endpoints.qr import _render_qr_png_sync
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as failure:
        _render_qr_png_sync("https://example.org", {"fg_color": "#fff", "bg_color": "#fff"})
    assert failure.value.status_code == 422


@pytest.mark.asyncio
async def test_notification_count_and_history_are_independent_and_owned():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            db.add_all([Notification(user_id=data["user"]["id"], type="new_message", title=str(index), body="Test", is_read=index != 0,
                created_at=now + timedelta(seconds=index)) for index in range(51)])
            await db.commit()
        first = (await ac.get("/api/v1/notifications?limit=20", headers=headers)).json()
        assert len(first) == 20 and all(item["is_read"] for item in first)
        assert (await ac.get("/api/v1/notifications/unread-count", headers=headers)).json()["unread_count"] == 1
        old = (await ac.get("/api/v1/notifications?unread_only=true&limit=20", headers=headers)).json()
        assert len(old) == 1 and old[0]["title"] == "0"
        second = (await ac.get("/api/v1/notifications?offset=20&limit=20", headers=headers)).json()
        assert not {item["id"] for item in first} & {item["id"] for item in second}
        _, other_headers = await account(ac)
        assert (await ac.patch(f"/api/v1/notifications/{old[0]['id']}/read", headers=other_headers)).status_code == 404
        assert (await ac.patch(f"/api/v1/notifications/{old[0]['id']}/read", headers=headers)).status_code == 200
        assert (await ac.get("/api/v1/notifications/unread-count", headers=headers)).json()["unread_count"] == 0


@pytest.mark.asyncio
async def test_server_search_filters_full_dataset_and_literal_wildcards():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        data, headers = await account(ac)
        async with AsyncSessionLocal() as db:
            db.add_all([Item(user_id=data["user"]["id"], name=f"Bulk {index}", category="Test", status="safe") for index in range(25)])
            db.add(Item(user_id=data["user"]["id"], name="%_ literal", category="Test", status="lost"))
            await db.commit()
        first = (await ac.get("/api/v1/items?limit=20", headers=headers)).json()
        second = (await ac.get("/api/v1/items?limit=20&offset=20", headers=headers)).json()
        assert len(first) == 20 and len(second) == 6
        assert not {item["id"] for item in first} & {item["id"] for item in second}
        literal = (await ac.get("/api/v1/items", params={"search": "%_", "status": "lost"}, headers=headers)).json()
        assert len(literal) == 1 and literal[0]["name"] == "%_ literal"
        item, contact = await conversation(ac, headers, name="Unique suitcase")
        code_search = (await ac.get("/api/v1/items", params={"search": item["qr_code"]["unique_code"]}, headers=headers)).json()
        assert [row["id"] for row in code_search] == [item["id"]]
        unread = (await ac.get("/api/v1/conversations?status=unread&search=Unique", headers=headers)).json()
        assert [row["id"] for row in unread] == [contact["conversation_id"]]
        assert (await ac.get("/api/v1/conversations?search=%25_", headers=headers)).json() == []
        _, other_headers = await account(ac)
        assert (await ac.get("/api/v1/conversations?search=Unique", headers=other_headers)).json() == []


@pytest.mark.asyncio
async def test_verification_email_preserves_studio_return_and_token_is_single_use(monkeypatch):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/register", json={"email": f"ux-{uuid.uuid4().hex}@example.org", "password": "initial-password", "redirect_path": "/studio"})
        assert response.status_code == 201
        send = AsyncMock(return_value=True)
        monkeypatch.setattr(email_service, "send_email", send)
        await deliver_pending()
        link = re.search(r'href="([^"]*verify-email\?[^"]+)"', html.unescape(send.call_args.args[2])).group(1)
        query = parse_qs(urlsplit(link).query)
        assert query["redirect"] == ["/studio"]
        assert (await ac.post("/api/v1/auth/verify-email", json={"token": query["token"][0]})).status_code == 200
        assert (await ac.post("/api/v1/auth/verify-email", json={"token": query["token"][0]})).status_code == 400
