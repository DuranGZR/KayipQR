"""Short-lived capabilities for chat images; database values stay canonical."""
import hashlib
import hmac
import html
import re
import time
from urllib.parse import parse_qs
from app.core.config import settings

UPLOAD_REFERENCE = re.compile(r"/uploads/([a-f0-9]{32}\.(?:jpg|png|webp))(?:\?[^\s)<>\"']*)?")


def sign_upload(filename: str, expires: int | None = None) -> str:
    expires = expires if expires is not None else int(time.time()) + 3600
    signature = hmac.new(settings.SECRET_KEY.encode(), f"media:{filename}:{expires}".encode(), hashlib.sha256).hexdigest()
    return f"/uploads/{filename}?expires={expires}&signature={signature}"


def valid_signature(filename: str, expires: str, signature: str) -> bool:
    try:
        deadline = int(expires)
        if deadline < time.time() or deadline > time.time() + 86400:
            return False
        expected = sign_upload(filename, deadline).split("signature=", 1)[1]
        return hmac.compare_digest(expected, signature)
    except (ValueError, TypeError):
        return False


def signed_message_content(content: str) -> str:
    return UPLOAD_REFERENCE.sub(lambda match: sign_upload(match.group(1)), content)


async def validate_attachments(db, content: str) -> str:
    """Require possession of an unexpired upload/read capability on new messages."""
    from fastapi import HTTPException
    from sqlalchemy import select
    from app.models.item import Item
    from app.models.user import User
    for match in UPLOAD_REFERENCE.finditer(html.unescape(content)):
        filename = match.group(1)
        query = parse_qs(match.group(0).partition("?")[2])
        if valid_signature(filename, query.get("expires", [""])[0], query.get("signature", [""])[0]):
            continue
        url = f"/uploads/{filename}"
        # Public profile/item images remain shareable without a chat capability.
        public = (await db.execute(select(Item.id).where(Item.image_url == url).limit(1))).first()
        if not public:
            public = (await db.execute(select(User.id).where(User.avatar_url == url).limit(1))).first()
        if not public:
            raise HTTPException(status_code=403, detail="Görsel bağlantısının süresi dolmuş. Görseli tekrar yükleyin.")
    return UPLOAD_REFERENCE.sub(lambda match: f"/uploads/{match.group(1)}", content)
