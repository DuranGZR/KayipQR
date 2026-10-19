"""Copy a local SQLite snapshot and referenced photos into an empty target DB.

Defaults to dry run. Does not change or delete source data. Stop local writes
while taking the source snapshot and keep a backup before applying.
"""
import argparse
import asyncio
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import select, func, insert, DateTime, Boolean, update
from app.core.config import settings
from app.core.media import UPLOAD_REFERENCE
from app.db.base import Base
from app.db.session import engine
from app.models.upload_asset import UploadAsset, StorageQuota
from app.models.runtime_state import UploadContent
from app.services.storage_service import _process_and_sanitize_image_sync
import app.models  # noqa: F401

BUSINESS_TABLES = {"users", "items", "qr_codes", "qr_scans", "conversations", "messages", "notifications"}


def read_snapshot(source: Path, uploads: Path):
    if not source.is_file():
        raise RuntimeError("Source SQLite file does not exist.")
    data = {}
    filenames = set()
    with sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.row_factory = sqlite3.Row
        db.execute("BEGIN")
        existing = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not BUSINESS_TABLES.issubset(existing):
            raise RuntimeError("Source is missing business tables; check the SQLite snapshot.")
        for table in Base.metadata.sorted_tables:
            if table.name not in BUSINESS_TABLES:
                continue
            rows = []
            for row in db.execute(f'SELECT * FROM "{table.name}"'):
                values = dict(row)
                for column in table.columns:
                    value = values.get(column.name)
                    if value is not None and isinstance(column.type, DateTime):
                        parsed = datetime.fromisoformat(value) if isinstance(value, str) else value
                        values[column.name] = parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
                    elif value is not None and isinstance(column.type, Boolean):
                        values[column.name] = bool(value)
                rows.append({key: value for key, value in values.items() if key in table.columns})
                for key in ("avatar_url", "image_url", "content"):
                    filenames.update(match.group(1) for match in UPLOAD_REFERENCE.finditer(values.get(key) or ""))
            data[table.name] = rows
    photos = {}
    for filename in sorted(filenames):
        path = uploads / filename
        if path.is_symlink() or not path.is_file():
            raise RuntimeError("Referenced photo is missing or a symlink; import cancelled.")
        if path.stat().st_size > 20 * 1024 * 1024:
            raise RuntimeError("Source photo exceeds the import size limit.")
        content, _ = _process_and_sanitize_image_sync(path.read_bytes())
        photos[filename] = content
    return data, photos


async def import_snapshot(source: Path, uploads: Path, apply=False, target_engine=engine):
    if settings.STORAGE_BACKEND != "database":
        raise RuntimeError("Import requires STORAGE_BACKEND=database.")
    data, photos = await asyncio.to_thread(read_snapshot, source, uploads)
    size = sum(map(len, photos.values()))
    if size > settings.MAX_STORAGE_SIZE_MB * 1024 * 1024:
        raise RuntimeError("Imported photos would exceed the image storage quota.")
    async with target_engine.begin() as conn:
        if conn.dialect.name == "postgresql":
            # Serialize this one-time importer; reject concurrent application writes.
            await conn.exec_driver_sql("LOCK TABLE users, items, qr_codes, qr_scans, conversations, messages, notifications, upload_assets, storage_quota IN ACCESS EXCLUSIVE MODE")
        for table in Base.metadata.sorted_tables:
            if table.name in BUSINESS_TABLES | {"upload_assets", "upload_contents", "email_outbox"}:
                if (await conn.execute(select(func.count()).select_from(table))).scalar_one():
                    raise RuntimeError("Target is not empty; refusing to overwrite or merge data.")
        if apply:
            for table in Base.metadata.sorted_tables:
                rows = data.get(table.name, [])
                for offset in range(0, len(rows), 100):
                    await conn.execute(insert(table), rows[offset:offset + 100])
            for filename, content in photos.items():
                await conn.execute(insert(UploadAsset).values(filename=filename, size_bytes=len(content), content_type="image/webp", state="stored"))
                await conn.execute(insert(UploadContent).values(filename=filename, content=content))
            quota = (await conn.execute(select(StorageQuota.id).where(StorageQuota.id == 1))).scalar_one_or_none()
            if quota is None:
                await conn.execute(insert(StorageQuota).values(id=1, used_bytes=size))
            else:
                await conn.execute(update(StorageQuota).where(StorageQuota.id == 1).values(used_bytes=size))
    return {"dry_run": not apply, "rows": {key: len(value) for key, value in data.items()}, "photos": len(photos), "photo_bytes": size}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--uploads", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not settings.DATABASE_URL.startswith("postgresql"):
        raise RuntimeError("CLI target must be PostgreSQL; the local SQLite source remains read-only.")
    try:
        print(await import_snapshot(args.source, args.uploads, args.apply))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
