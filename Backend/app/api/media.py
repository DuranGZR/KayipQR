from pathlib import Path
import re
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse, Response
from sqlalchemy import select
from app.core.config import settings
from app.core.media import valid_signature
from app.db.session import AsyncSessionLocal
from app.models.item import Item
from app.models.user import User

router = APIRouter()


@router.get("/uploads/{filename}", include_in_schema=False)
async def get_upload(filename: str, expires: str = Query(""), signature: str = Query("")):
    if not re.fullmatch(r"[a-f0-9]{32}\.(?:jpg|png|webp)", filename):
        raise HTTPException(status_code=404)
    path = Path(settings.UPLOAD_DIR) / filename
    if settings.STORAGE_BACKEND == "local" and not path.is_file():
        raise HTTPException(status_code=404)
    public = False
    if not valid_signature(filename, expires, signature):
        url = f"/uploads/{filename}"
        async with AsyncSessionLocal() as db:
            public = bool((await db.execute(select(Item.id).where(Item.image_url == url).limit(1))).first())
            if not public:
                public = bool((await db.execute(select(User.id).where(User.avatar_url == url).limit(1))).first())
        if not public:
            raise HTTPException(status_code=403, detail="Görsel için geçerli erişim bağlantısı gerekli.")
    headers = {"Cache-Control": "public, max-age=300" if public else "private, no-store", "Referrer-Policy": "no-referrer"}
    if settings.STORAGE_BACKEND == "database":
        from app.services.database_storage import read_image
        content, content_type = await read_image(filename)
        return Response(content, media_type=content_type, headers={**headers, "X-Content-Type-Options": "nosniff"})
    if settings.STORAGE_BACKEND == "s3":
        from app.services.object_storage import download_url
        # Never cache a redirect beyond the lifetime of its S3 capability.
        return RedirectResponse(await download_url(filename), status_code=307,
            headers={**headers, "Cache-Control": "private, no-store"})
    return FileResponse(path, headers=headers)
