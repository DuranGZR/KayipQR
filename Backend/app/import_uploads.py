"""Copy referenced local files to S3 without deleting the originals.

Dry run: python -m app.import_uploads --directory /path/to/uploads
Apply:   python -m app.import_uploads --directory /path/to/uploads --apply
Run against the destination business database, during a maintenance window.
"""
import argparse
import asyncio
import hashlib
from pathlib import Path
from botocore.exceptions import ClientError
from sqlalchemy import select, update
from app.core.config import settings
from app.core.media import UPLOAD_REFERENCE
from app.db.session import AsyncSessionLocal, engine
from app.models.user import User
from app.models.item import Item
from app.models.message import Message
from app.models.upload_asset import UploadAsset
from app.services.object_storage import get_s3, save_object, delete_object


async def referenced_files():
    names = set()
    async with AsyncSessionLocal() as db:
        for column in (User.avatar_url, Item.image_url, Message.content):
            async for value in await db.stream_scalars(select(column).where(column.is_not(None))):
                names.update(match.group(1) for match in UPLOAD_REFERENCE.finditer(value))
    return names


async def import_files(directory: Path, apply: bool = False):
    names = await referenced_files()
    missing = [name for name in names if not (directory / name).is_file() or (directory / name).is_symlink()]
    if missing:
        raise RuntimeError(f"{len(missing)} referenced files are missing or symlinks; no files were imported")
    if not apply:
        return {"referenced_files": len(names), "imported_files": 0, "dry_run": True}
    if settings.STORAGE_BACKEND != "s3":
        raise RuntimeError("Apply requires STORAGE_BACKEND=s3")
    imported = 0
    for filename in sorted(names):
        content = await asyncio.to_thread((directory / filename).read_bytes)
        if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise RuntimeError("Referenced file exceeds the configured upload limit")
        digest = hashlib.sha256(content).hexdigest()
        exists = False
        try:
            head = await asyncio.to_thread(get_s3().head_object, Bucket=settings.S3_BUCKET, Key=filename)
            exists = True
            if head.get("Metadata", {}).get("sha256") != digest:
                raise RuntimeError("Existing bucket object differs; refusing to overwrite")
        except ClientError as exc:
            if exc.response["Error"]["Code"] not in ("404", "NoSuchKey", "NotFound"):
                raise
        async with AsyncSessionLocal() as db:
            asset = await db.get(UploadAsset, filename)
            if asset is not None and exists:
                if asset.size_bytes != len(content):
                    raise RuntimeError("Stored size differs; inspect storage accounting before retrying")
                await db.execute(update(UploadAsset).where(UploadAsset.filename == filename).values(state="stored"))
                await db.commit()
                continue
            registered = asset is not None
        if registered:
            await delete_object(filename)
        content_type = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}[Path(filename).suffix]
        await save_object(filename, content, content_type)
        imported += 1
    return {"referenced_files": len(names), "imported_files": imported, "dry_run": False}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", required=True, type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    directory = args.directory.resolve(strict=True)
    if not directory.is_dir():
        raise RuntimeError("Directory is required")
    try:
        print(await import_files(directory, args.apply))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
