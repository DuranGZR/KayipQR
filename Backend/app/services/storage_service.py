import asyncio
import io
import os
import re
import uuid
import aiofiles
from PIL import Image, ImageOps
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.media import sign_upload

Image.MAX_IMAGE_PIXELS = 25_000_000  # Prevent decompression bomb attacks

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # bytes
MAX_IMAGE_DIMENSION = 2560  # max width/height in px
_upload_lock = asyncio.Lock()
_image_slots = asyncio.Semaphore(2)


def _storage_size() -> int:
    from pathlib import Path
    return sum(path.stat().st_size for path in Path(settings.UPLOAD_DIR).iterdir() if path.is_file())


def _process_and_sanitize_image_sync(content: bytes) -> tuple[bytes, str]:
    """Synchronous Pillow verification, EXIF stripping, and resizing executed in a worker thread."""
    try:
        image_stream = io.BytesIO(content)
        img = Image.open(image_stream)
        img.verify()  # verify integrity
        # Reopen because verify() closes/invalidates the stream in PIL
        image_stream.seek(0)
        img = Image.open(image_stream)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz veya bozuk görsel dosyası.",
        )

    # Strip EXIF data & auto-orient
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    if settings.STORAGE_BACKEND == "database":
        # Bound both dimensions and encoded bytes. EXIF is never copied.
        img.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        for _ in range(4):
            for quality in (80, 65, 50):
                output = io.BytesIO()
                img.save(output, format="WEBP", quality=quality, method=4)
                if output.tell() <= settings.DB_IMAGE_MAX_BYTES:
                    return output.getvalue(), ".webp"
            img.thumbnail((max(1, int(img.width * .75)), max(1, int(img.height * .75))), Image.Resampling.LANCZOS)
        raise HTTPException(status_code=413, detail="Görsel yeterince küçültülemedi. Daha küçük bir fotoğraf seçin.")

    # Resize if overly large to prevent storage/memory bloat
    if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

    # Determine clean format and extension
    img_format = (img.format or "JPEG").upper()
    if img_format not in ["JPEG", "PNG", "WEBP"]:
        img_format = "JPEG"

    ext_map = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
    ext = ext_map.get(img_format, ".jpg")

    # Create clean byte buffer without EXIF
    output_buffer = io.BytesIO()
    if img_format == "JPEG":
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        img.save(output_buffer, format="JPEG", quality=88, optimize=True)
    elif img_format == "PNG":
        img.save(output_buffer, format="PNG", optimize=True)
    elif img_format == "WEBP":
        img.save(output_buffer, format="WEBP", quality=88)

    return output_buffer.getvalue(), ext


class StorageService:
    @staticmethod
    async def save_upload_file(file: UploadFile) -> str:
        async with _image_slots:
            return await StorageService._save_upload_file(file)

    @staticmethod
    async def _save_upload_file(file: UploadFile) -> str:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Desteklenmeyen dosya türü: {file.content_type}. Sadece JPG, PNG veya WEBP yükleyebilirsiniz.",
            )

        # 1. Read bounded content to check file size without memory exhaustion
        content = await file.read(MAX_FILE_SIZE + 1)
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dosya boyutu çok büyük. Maksimum {settings.MAX_UPLOAD_SIZE_MB}MB yükleyebilirsiniz.",
            )

        # 2. Validate, strip EXIF, and resize in a background thread
        cleaned_content, ext = await asyncio.to_thread(_process_and_sanitize_image_sync, content)

        # 3. Save clean sanitized file to disk
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        if settings.STORAGE_BACKEND == "database":
            from app.services.database_storage import save_image
            await save_image(unique_filename, cleaned_content, "image/webp")
            return sign_upload(unique_filename)
        if settings.STORAGE_BACKEND == "s3":
            from app.services.object_storage import save_object
            content_type = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}[ext]
            await save_object(unique_filename, cleaned_content, content_type)
            return sign_upload(unique_filename)
        destination = os.path.join(settings.UPLOAD_DIR, unique_filename)

        async with _upload_lock:
            size = await asyncio.to_thread(_storage_size)
            if size + len(cleaned_content) > settings.MAX_STORAGE_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=507, detail="Görsel depolama alanı dolu. Lütfen daha sonra tekrar deneyin.")
            try:
                async with aiofiles.open(destination, "wb") as out_file:
                    await out_file.write(cleaned_content)
            except Exception:
                if os.path.isfile(destination):
                    os.remove(destination)
                raise

        return sign_upload(unique_filename)

    @staticmethod
    def _extract_clean_filename(file_url: str | None) -> str | None:
        if not file_url or not isinstance(file_url, str):
            return None
        if "/uploads/" not in file_url:
            return None
        filename = file_url.split("/uploads/")[-1].split("?")[0].strip()
        if not filename or "/" in filename or "\\" in filename or ".." in filename:
            return None
        return filename

    @classmethod
    def delete_file(cls, file_url: str | None) -> None:
        """Safely deletes a locally stored upload file if it exists under UPLOAD_DIR."""
        filename = cls._extract_clean_filename(file_url)
        if not filename:
            return
        upload_root = os.path.abspath(settings.UPLOAD_DIR)
        target_path = os.path.abspath(os.path.join(upload_root, filename))
        if os.path.commonpath([upload_root, target_path]) == upload_root and os.path.isfile(target_path):
            try:
                os.remove(target_path)
            except OSError:
                pass

    @classmethod
    def delete_files_in_text(cls, text: str | None) -> None:
        """Extracts any '/uploads/<filename>' references from a message string and deletes them from disk."""
        if not text or "/uploads/" not in text:
            return
        matches = re.findall(r"/uploads/[a-zA-Z0-9._-]+", text)
        for match in matches:
            cls.delete_file(match)

    @classmethod
    async def safe_delete_file(cls, db: AsyncSession, file_url: str | None) -> None:
        # Business data is already committed. Cleanup failure must not cause a
        # false HTTP 500; tracked S3 objects are retried by the worker.
        try:
            await cls._delete_unreferenced_file(db, file_url)
        except Exception:
            import logging
            await db.rollback()
            logging.getLogger(__name__).warning("Upload cleanup deferred")

    @classmethod
    async def _delete_unreferenced_file(cls, db: AsyncSession, file_url: str | None) -> None:
        """Deletes '/uploads/<filename>' from disk ONLY if no remaining User, Item, or Message references it."""
        filename = cls._extract_clean_filename(file_url)
        if not filename:
            return
        rel_url = f"/uploads/{filename}"

        from app.models.user import User
        from app.models.item import Item
        from app.models.message import Message

        user_ref = await db.execute(select(User.id).where(User.avatar_url.like(f"%{rel_url}%")).limit(1))
        if user_ref.scalars().first():
            return

        item_ref = await db.execute(select(Item.id).where(Item.image_url.like(f"%{rel_url}%")).limit(1))
        if item_ref.scalars().first():
            return

        msg_ref = await db.execute(select(Message.id).where(Message.content.like(f"%{rel_url}%")).limit(1))
        if msg_ref.scalars().first():
            return

        if settings.STORAGE_BACKEND == "database":
            from app.services.database_storage import delete_image
            await delete_image(filename)
        elif settings.STORAGE_BACKEND == "s3":
            from app.services.object_storage import delete_object
            await delete_object(filename)
        else:
            cls.delete_file(rel_url)

    @classmethod
    async def safe_delete_files_in_text(cls, db: AsyncSession, text: str | None) -> None:
        """Extracts '/uploads/<filename>' URLs from text and safely deletes unreferenced files."""
        if not text or "/uploads/" not in text:
            return
        matches = set(re.findall(r"/uploads/[a-zA-Z0-9._-]+", text))
        for match in matches:
            await cls.safe_delete_file(db, match)


storage_service = StorageService()


async def cleanup_orphan_uploads() -> int:
    """Only unreferenced, expired uploads, bounded to 100 files per pass."""
    import time
    from pathlib import Path
    from app.db.session import AsyncSessionLocal
    if settings.STORAGE_BACKEND in ("s3", "database"):
        from datetime import datetime, timedelta, timezone
        from app.models.upload_asset import UploadAsset
        from app.models.user import User
        from app.models.item import Item
        from app.models.message import Message
        from sqlalchemy import or_, literal
        url = literal("/uploads/") + UploadAsset.filename
        async with AsyncSessionLocal() as db:
            assets = (await db.execute(select(UploadAsset.filename).where(
                or_(UploadAsset.state == "deleting", UploadAsset.created_at < datetime.now(timezone.utc) - timedelta(days=1)),
                ~select(User.id).where(User.avatar_url.contains(url)).exists(),
                ~select(Item.id).where(Item.image_url.contains(url)).exists(),
                ~select(Message.id).where(Message.content.contains(url)).exists(),
            ).order_by(UploadAsset.created_at).limit(100))).scalars().all()
            removed = 0
            for filename in assets:
                await storage_service.safe_delete_file(db, f"/uploads/{filename}")
                removed += await db.get(UploadAsset, filename) is None
            return removed

    def candidates():
        result = []
        for path in Path(settings.UPLOAD_DIR).iterdir():
            if re.fullmatch(r"[a-f0-9]{32}\.(jpg|png|webp)", path.name) and path.is_file() and path.stat().st_mtime < time.time() - 86400:
                result.append(path.name)
                if len(result) == 100:
                    break
        return result

    removed = 0
    async with AsyncSessionLocal() as db:
        for filename in await asyncio.to_thread(candidates):
            await storage_service.safe_delete_file(db, f"/uploads/{filename}")
            removed += not (Path(settings.UPLOAD_DIR) / filename).exists()
    return removed


