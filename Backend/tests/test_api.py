import io
from urllib.parse import urlsplit
import pytest
import pytest_asyncio
from PIL import Image
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import init_db
from app.services.email_service import email_service


@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    await init_db()


@pytest.mark.asyncio
async def test_health_and_root_and_security_headers():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "healthy"}
        
        # Verify Security Headers
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"
        assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

        root_res = await ac.get("/")
        assert root_res.status_code == 200
        assert "KayıpQR" in root_res.json()["name"]


@pytest.mark.asyncio
async def test_forgot_password_no_token_leak():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/auth/forgot-password", json={"email": "anyuser@example.com"})
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        # Ensure token or reset_url is NEVER leaked in response
        assert "token" not in data
        assert "reset_url" not in data


@pytest.mark.asyncio
async def test_image_upload_and_exif_stripping():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Valid Image upload
        img = Image.new("RGB", (100, 100), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        files = {"file": ("test.jpg", buf.getvalue(), "image/jpeg")}
        upload_res = await ac.post("/api/v1/public/upload", files=files)
        assert upload_res.status_code == 201
        assert "url" in upload_res.json()
        assert upload_res.json()["url"].startswith("/uploads/")

        # 2. Spoofed/Corrupted file upload (text file with image extension)
        fake_files = {"file": ("malicious.jpg", b"NOT_AN_IMAGE_PAYLOAD", "image/jpeg")}
        fake_res = await ac.post("/api/v1/public/upload", files=fake_files)
        assert fake_res.status_code == 400


@pytest.mark.asyncio
async def test_email_service_and_templates():
    # 1. Password Reset template
    pwd_html = email_service.render_password_reset_email("http://test/reset-password?token=123", "Duran")
    assert "Şifre Sıfırlama Talebi" in pwd_html
    assert "http://test/reset-password?token=123" in pwd_html
    assert "Duran" in pwd_html

    # 2. QR Scanned template
    scan_html = email_service.render_qr_scanned_email("Siyah Çanta", "iPhone 15", "İzmir", "http://test/dashboard")
    assert "Siyah Çanta" in scan_html
    assert "iPhone 15" in scan_html
    assert "İzmir" in scan_html

    # 3. New Message template
    msg_html = email_service.render_new_message_email("Siyah Çanta", "Çantanızı buldum", "http://test/chat")
    assert "Siyah Çanta" in msg_html
    assert "Çantanızı buldum" in msg_html

    # 4. Cooldown test
    test_item_id = "test-item-cooldown-123"
    # First time: should NOT be suppressed
    assert await email_service.should_suppress_scan_email(test_item_id, cooldown_seconds=600) is False
    # Immediately after: should BE suppressed
    assert await email_service.should_suppress_scan_email(test_item_id, cooldown_seconds=600) is True

    # 5. Non-blocking async send execution
    success = await email_service.send_email("test@example.com", "Test Subject", pwd_html)
    assert success is True


@pytest.mark.asyncio
async def test_full_backend_workflow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register User
        register_payload = {
            "email": "duran@example.com",
            "password": "securepassword123",
            "full_name": "Duran B.",
        }
        reg_res = await ac.post("/api/v1/auth/register", json=register_payload)
        assert reg_res.status_code in [201, 400]

        # 2. Login
        login_res = await ac.post(
            "/api/v1/auth/login",
            json={"email": "duran@example.com", "password": "securepassword123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create Item
        item_payload = {
            "name": "Siyah Deri Cüzdan",
            "category": "Cüzdan",
            "description": "İçinde kimlik ve kartlar var.",
            "owner_display_name": "Duran B.",
            "status": "safe",
        }
        item_res = await ac.post("/api/v1/items", json=item_payload, headers=headers)
        assert item_res.status_code == 201
        item_data = item_res.json()
        assert item_data["name"] == "Siyah Deri Cüzdan"
        assert "qr_code" in item_data
        unique_code = item_data["qr_code"]["unique_code"]
        assert unique_code.startswith("KQ-")

        # 4. Public QR Lookup (Finder side - No Auth, Privacy Protected)
        public_res = await ac.get(f"/api/v1/public/q/{unique_code}")
        assert public_res.status_code == 200
        public_data = public_res.json()
        assert public_data["name"] == "Siyah Deri Cüzdan"
        assert "email" not in public_data
        assert "user_id" not in public_data

        # 5. Finder sends contact message (Sanitized + Session Token generated)
        contact_res = await ac.post(
            f"/api/v1/public/q/{unique_code}/contact",
            json={
                "message": "Merhaba, cüzdanınızı kafede buldum!",
                "location_lat": 38.4237,
                "location_lng": 27.1428,
            },
        )
        assert contact_res.status_code == 201
        contact_data = contact_res.json()
        assert "finder_session_token" in contact_data
        assert "conversation_id" in contact_data
        finder_token = contact_data["finder_session_token"]
        conv_id = contact_data["conversation_id"]

        # 6. Finder fetches conversation thread
        finder_conv_res = await ac.get(f"/api/v1/conversations/finder/{finder_token}")
        assert finder_conv_res.status_code == 200
        conv_details = finder_conv_res.json()
        assert len(conv_details["messages"]) >= 1

        # 7. Owner replies to finder
        reply_res = await ac.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": "Çok teşekkür ederim! Nereden alabilirim?"},
            headers=headers,
        )
        assert reply_res.status_code == 201

        # 8. Check Dashboard Stats for Owner
        stats_res = await ac.get("/api/v1/dashboard/stats", headers=headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_items"] >= 1
        assert stats["total_scans"] >= 1


@pytest.mark.asyncio
async def test_profile_preferences_reset_and_account_deletion():
    import uuid
    from app.core.security import create_password_reset_token
    from app.services.auth_service import auth_service
    from app.db.session import AsyncSessionLocal

    unique_email = f"delete_test_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register a temporary user
        reg_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email,
                "password": "initialpassword123",
                "full_name": "Silinecek Kullanıcı",
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Update notification preferences (email_on_scan=False, email_on_message=False)
        upd_res = await ac.put(
            "/api/v1/auth/me",
            json={
                "full_name": "Güncel İsim",
                "email_on_scan": False,
                "email_on_message": False,
            },
            headers=headers,
        )
        assert upd_res.status_code == 200
        upd_data = upd_res.json()
        assert upd_data["full_name"] == "Güncel İsim"
        assert upd_data["email_on_scan"] is False
        assert upd_data["email_on_message"] is False

        # 3. Mark all notifications read via both routes
        mark1 = await ac.patch("/api/v1/notifications/mark-all-read", headers=headers)
        assert mark1.status_code == 200
        mark2 = await ac.patch("/api/v1/notifications/read-all", headers=headers)
        assert mark2.status_code == 200

        # 4. Single-use password reset token test
        async with AsyncSessionLocal() as db:
            user_obj = await auth_service.get_by_email(db, unique_email)
            reset_token = create_password_reset_token(user_obj.email, user_obj.hashed_password)

        reset_res1 = await ac.post(
            "/api/v1/auth/reset-password",
            json={"token": reset_token, "new_password": "newpassword456"},
        )
        assert reset_res1.status_code == 200

        # Reusing the exact same reset token must fail with 400
        reset_res2 = await ac.post(
            "/api/v1/auth/reset-password",
            json={"token": reset_token, "new_password": "anotherpassword789"},
        )
        assert reset_res2.status_code == 400

        # Reset must revoke the old session; authenticate with the new password.
        assert (await ac.get("/api/v1/auth/me", headers=headers)).status_code == 401
        login = await ac.post("/api/v1/auth/login", json={"email": unique_email, "password": "newpassword456"})
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        # 5. Permanent account deletion
        del_res = await ac.delete("/api/v1/auth/me", headers=headers)
        assert del_res.status_code == 204

        # Verify user no longer exists
        me_res = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code in [401, 404]


@pytest.mark.asyncio
async def test_privacy_closed_conversation_and_photo_cleanup():
    import os
    import uuid
    from app.core.config import settings

    unique_email = f"privacy_test_{uuid.uuid4().hex[:8]}@example.com"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        reg_res = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email,
                "password": "securepassword123",
                "full_name": "Gizlilik Test",
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create an item with hidden name & description for finder
        item_res = await ac.post(
            "/api/v1/items",
            json={
                "name": "Gizli Elmas Kolye",
                "category": "Takı",
                "description": "Çok gizli açıklama",
                "show_name_to_finder": False,
                "show_desc_to_finder": False,
            },
            headers=headers,
        )
        assert item_res.status_code == 201
        unique_code = item_res.json()["qr_code"]["unique_code"]

        # 2. Upload a chat photo and send it in a finder message
        img = Image.new("RGB", (60, 60), color="green")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        up_res = await ac.post(
            "/api/v1/public/upload",
            files={"file": ("chat_pic.jpg", buf.getvalue(), "image/jpeg")},
        )
        assert up_res.status_code == 201
        uploaded_url = up_res.json()["url"]
        uploaded_filename = os.path.basename(urlsplit(uploaded_url).path)
        uploaded_filepath = os.path.join(settings.UPLOAD_DIR, uploaded_filename)
        assert os.path.exists(uploaded_filepath)

        contact_res = await ac.post(
            f"/api/v1/public/q/{unique_code}/contact",
            json={"message": f"Eşyanızı buldum! 📷 [Fotoğraf]({uploaded_url})"},
        )
        assert contact_res.status_code == 201
        finder_token = contact_res.json()["finder_session_token"]
        conv_id = contact_res.json()["conversation_id"]

        # 3. Verify finder conversation endpoint respects show_name_to_finder=False
        finder_conv = await ac.get(f"/api/v1/conversations/finder/{finder_token}")
        assert finder_conv.status_code == 200
        assert finder_conv.json()["item"]["name"] == "Kayıp Eşya"
        assert finder_conv.json()["item"]["description"] is None

        # 4. Close the conversation as owner and verify finder cannot send more messages
        close_res = await ac.patch(
            f"/api/v1/conversations/{conv_id}/status",
            json={"status": "closed"},
            headers=headers,
        )
        assert close_res.status_code == 200

        blocked_msg_res = await ac.post(
            f"/api/v1/conversations/finder/{finder_token}/messages",
            json={"content": "Kapalı konuşmaya mesaj denemesi"},
        )
        assert blocked_msg_res.status_code == 403

        # 5. Delete conversation and verify uploaded chat photo is cleaned up from disk
        del_conv_res = await ac.delete(f"/api/v1/conversations/{conv_id}", headers=headers)
        assert del_conv_res.status_code == 204
        assert not os.path.exists(uploaded_filepath)


@pytest.mark.asyncio
async def test_cross_user_file_deletion_protection_and_turkish_qr_png_and_sanitization():
    import os
    import uuid
    from app.core.config import settings
    from app.core.security import sanitize_text, sanitize_message_content, decode_access_token, create_password_reset_token

    # 1. Verify sanitize_text & sanitize_message_content idempotency (no double escaping of &#x27;)
    first_pass = sanitize_text("Duran'ın <script>alert(1)</script> Çantası")
    second_pass = sanitize_text(first_pass)
    assert first_pass == second_pass
    assert "&amp;#x27;" not in second_pass
    assert "<script>" not in second_pass

    msg_first = sanitize_message_content("Ahmet'in anahtarı")
    msg_second = sanitize_message_content(msg_first)
    assert msg_first == msg_second
    assert "&amp;#x27;" not in msg_second

    # 2. Verify password_reset token cannot be used as an access token
    reset_tok = create_password_reset_token("victim@example.com", "hashed_pw")
    assert decode_access_token(reset_tok) is None

    user_a_email = f"user_a_{uuid.uuid4().hex[:8]}@example.com"
    user_b_email = f"user_b_{uuid.uuid4().hex[:8]}@example.com"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register User A & User B
        reg_a = await ac.post(
            "/api/v1/auth/register",
            json={"email": user_a_email, "password": "password123", "full_name": "Kullanıcı A"},
        )
        assert reg_a.status_code == 201
        headers_a = {"Authorization": f"Bearer {reg_a.json()['access_token']}"}

        reg_b = await ac.post(
            "/api/v1/auth/register",
            json={"email": user_b_email, "password": "password123", "full_name": "Kullanıcı B"},
        )
        assert reg_b.status_code == 201
        headers_b = {"Authorization": f"Bearer {reg_b.json()['access_token']}"}

        # User A uploads an item photo and creates an item with Turkish characters in name
        img = Image.new("RGB", (80, 80), color="red")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        up_a = await ac.post(
            "/api/v1/uploads",
            files={"file": ("victim_item.png", buf.getvalue(), "image/png")},
            headers=headers_a,
        )
        assert up_a.status_code == 201
        victim_image_url = up_a.json()["url"]
        victim_filepath = os.path.join(settings.UPLOAD_DIR, os.path.basename(urlsplit(victim_image_url).path))
        assert os.path.exists(victim_filepath)

        item_a_res = await ac.post(
            "/api/v1/items",
            json={
                "name": "Gümüş Çağdaş Şemsiye & Cüzdanı",
                "category": "Aksesuar",
                "image_url": victim_image_url,
            },
            headers=headers_a,
        )
        assert item_a_res.status_code == 201
        item_a_id = item_a_res.json()["id"]

        # 3. Verify Turkish characters in QR PNG render return 200 OK without UnicodeEncodeError
        qr_png_res = await ac.get(f"/api/v1/qr/item/{item_a_id}/render-png", headers=headers_a)
        assert qr_png_res.status_code == 200
        assert qr_png_res.headers["content-type"] == "image/png"
        assert "filename*=" in qr_png_res.headers.get("content-disposition", "")

        # 4. Cross-user file deletion protection:
        # User B creates an item, and a finder sends a message referencing User A's victim_image_url
        item_b_res = await ac.post(
            "/api/v1/items",
            json={"name": "User B Anahtarlık", "category": "Anahtar"},
            headers=headers_b,
        )
        assert item_b_res.status_code == 201
        code_b = item_b_res.json()["qr_code"]["unique_code"]

        contact_b = await ac.post(
            f"/api/v1/public/q/{code_b}/contact",
            json={"message": f"Malicious reference to another user's file: {victim_image_url}"},
        )
        assert contact_b.status_code == 201
        conv_b_id = contact_b.json()["conversation_id"]
        finder_b_token = contact_b.json()["finder_session_token"]

        # Send a second message so total_messages is 2 in 1 active conversation
        msg2_res = await ac.post(
            f"/api/v1/conversations/finder/{finder_b_token}/messages",
            json={"content": "İkinci mesaj!"},
        )
        assert msg2_res.status_code == 201

        # 5. Verify Dashboard stats accuracy (total_messages == 2, active_conversations == 1)
        stats_b = await ac.get("/api/v1/dashboard/stats", headers=headers_b)
        assert stats_b.status_code == 200
        stats_data = stats_b.json()
        assert stats_data["total_messages"] == 2
        assert stats_data["active_conversations"] == 1

        # Close conversation and verify active_conversations becomes 0 while total_messages stays 2
        await ac.patch(
            f"/api/v1/conversations/{conv_b_id}/status",
            json={"status": "closed"},
            headers=headers_b,
        )
        stats_b_after = await ac.get("/api/v1/dashboard/stats", headers=headers_b)
        assert stats_b_after.json()["active_conversations"] == 0
        assert stats_b_after.json()["total_messages"] == 2

        # Delete User B's conversation and verify User A's image was NOT deleted from disk!
        del_b = await ac.delete(f"/api/v1/conversations/{conv_b_id}", headers=headers_b)
        assert del_b.status_code == 204
        assert os.path.exists(victim_filepath), "Victim's item photo must NOT be deleted when another conversation referencing it is deleted!"

        # Clean up User A's item and verify file is now deleted since no references remain
        del_item_a = await ac.delete(f"/api/v1/items/{item_a_id}", headers=headers_a)
        assert del_item_a.status_code == 200
        assert not os.path.exists(victim_filepath)



