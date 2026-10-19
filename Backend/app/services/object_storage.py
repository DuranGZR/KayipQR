"""Private S3-compatible storage. All network I/O is moved off the event loop."""
import asyncio
import hashlib
from functools import lru_cache
import boto3
from botocore.config import Config
from fastapi import HTTPException
from sqlalchemy import select, update, delete, text
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.upload_asset import UploadAsset, StorageQuota


@lru_cache(maxsize=1)
def get_s3():
    return boto3.client("s3", endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID, aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION, config=Config(signature_version="s3v4",
            s3={"addressing_style": settings.S3_ADDRESSING_STYLE},
            retries={"max_attempts": 2, "mode": "standard"}, connect_timeout=3, read_timeout=10))


async def check_bucket():
    await asyncio.to_thread(get_s3().head_bucket, Bucket=settings.S3_BUCKET)


async def save_object(filename: str, content: bytes, content_type: str):
    async with AsyncSessionLocal() as db:
        await db.execute(text("INSERT INTO storage_quota (id, used_bytes) VALUES (1, 0) ON CONFLICT (id) DO NOTHING"))
        reserved = await db.execute(update(StorageQuota).where(
            StorageQuota.id == 1, StorageQuota.used_bytes + len(content) <= settings.MAX_STORAGE_SIZE_MB * 1024 * 1024
        ).values(used_bytes=StorageQuota.used_bytes + len(content)))
        if reserved.rowcount != 1:
            await db.rollback()
            raise HTTPException(status_code=507, detail="Görsel depolama alanı dolu.")
        db.add(UploadAsset(filename=filename, size_bytes=len(content), content_type=content_type))
        await db.commit()
    try:
        await asyncio.to_thread(get_s3().put_object, Bucket=settings.S3_BUCKET, Key=filename,
            Body=content, ContentType=content_type, CacheControl="private, no-store",
            Metadata={"sha256": hashlib.sha256(content).hexdigest()})
        async with AsyncSessionLocal() as db:
            await db.execute(update(UploadAsset).where(UploadAsset.filename == filename).values(state="stored"))
            await db.commit()
    except Exception:
        # Preserve the reservation until deletion is confirmed. A timed-out PUT
        # may still have reached S3; releasing quota here would undercount storage.
        async with AsyncSessionLocal() as db:
            await db.execute(update(UploadAsset).where(UploadAsset.filename == filename).values(state="uncertain"))
            await db.commit()
        raise HTTPException(status_code=503, detail="Görsel kaydedilemedi. Lütfen tekrar deneyin.")


async def delete_object(filename: str):
    # S3 DELETE is idempotent; concurrent cleanup cannot release quota twice.
    async with AsyncSessionLocal() as db:
        await db.execute(update(UploadAsset).where(UploadAsset.filename == filename).values(state="deleting"))
        await db.commit()
    await asyncio.to_thread(get_s3().delete_object, Bucket=settings.S3_BUCKET, Key=filename)
    async with AsyncSessionLocal() as db:
        size = (await db.execute(delete(UploadAsset).where(UploadAsset.filename == filename)
            .returning(UploadAsset.size_bytes))).scalar_one_or_none()
        if size is not None:
            await db.execute(update(StorageQuota).where(StorageQuota.id == 1).values(used_bytes=StorageQuota.used_bytes - size))
        await db.commit()


async def download_url(filename: str) -> str:
    async with AsyncSessionLocal() as db:
        asset = await db.get(UploadAsset, filename)
        if asset is None or asset.state != "stored":
            raise HTTPException(status_code=404)
    return await asyncio.to_thread(get_s3().generate_presigned_url, "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": filename}, ExpiresIn=60)
