"""Small sanitized images in PostgreSQL BYTEA, with atomic shared quota."""
from fastapi import HTTPException
from sqlalchemy import text, update, delete, select
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.upload_asset import UploadAsset, StorageQuota
from app.models.runtime_state import UploadContent


async def save_image(filename: str, content: bytes, content_type: str):
    if len(content) > settings.DB_IMAGE_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Görsel sıkıştırıldıktan sonra da çok büyük.")
    async with AsyncSessionLocal() as db:
        await db.execute(text("INSERT INTO storage_quota (id, used_bytes) VALUES (1, 0) ON CONFLICT (id) DO NOTHING"))
        result = await db.execute(update(StorageQuota).where(
            StorageQuota.id == 1,
            StorageQuota.used_bytes + len(content) <= settings.MAX_STORAGE_SIZE_MB * 1024 * 1024,
        ).values(used_bytes=StorageQuota.used_bytes + len(content)))
        if result.rowcount != 1:
            raise HTTPException(status_code=507, detail="Görsel depolama alanı dolu.")
        db.add(UploadAsset(filename=filename, size_bytes=len(content), content_type=content_type, state="stored"))
        await db.flush()
        db.add(UploadContent(filename=filename, content=content))
        await db.commit()


async def read_image(filename: str) -> tuple[bytes, str]:
    async with AsyncSessionLocal() as db:
        row = (await db.execute(select(UploadContent.content, UploadAsset.content_type).join(
            UploadAsset, UploadAsset.filename == UploadContent.filename,
        ).where(UploadAsset.filename == filename, UploadAsset.state == "stored"))).first()
        if row is None:
            raise HTTPException(status_code=404)
        return row.content, row.content_type


async def delete_image(filename: str):
    async with AsyncSessionLocal() as db:
        size = (await db.execute(delete(UploadAsset).where(UploadAsset.filename == filename)
            .returning(UploadAsset.size_bytes))).scalar_one_or_none()
        if size is not None:
            await db.execute(update(StorageQuota).where(StorageQuota.id == 1)
                .values(used_bytes=StorageQuota.used_bytes - size))
        await db.commit()
