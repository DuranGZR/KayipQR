import hashlib
import os
from pathlib import Path
import uuid
import pytest
from PIL import Image
from sqlalchemy import insert, select, func
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.schema import CreateSchema, DropSchema
from app.db.base import Base
from app.models.user import User
from app.models.runtime_state import UploadContent
from app.models.upload_asset import StorageQuota
from app.core.config import settings
from app.import_database import import_snapshot


@pytest.mark.asyncio
@pytest.mark.parametrize("target_kind", ["sqlite", "postgres"])
async def test_import_is_atomic_readonly_dry_run_and_refuses_nonempty_target(tmp_path, monkeypatch, target_kind):
    monkeypatch.setattr(settings, "STORAGE_BACKEND", "database")
    source = tmp_path / "source.db"
    target = tmp_path / "target.db"
    uploads = tmp_path / "uploads"
    uploads.mkdir()
    filename = uuid.uuid4().hex + ".png"
    Image.new("RGB", (1800, 1200), "green").save(uploads / filename)
    source_engine = create_async_engine(f"sqlite+aiosqlite:///{source.as_posix()}")
    admin = None
    schema = "import_test_" + uuid.uuid4().hex
    if target_kind == "postgres":
        url = os.getenv("TEST_DATABASE_URL")
        if not url:
            await source_engine.dispose()
            pytest.skip("Requires isolated TEST_DATABASE_URL")
        admin = create_async_engine(url)
        async with admin.begin() as conn:
            await conn.execute(CreateSchema(schema))
        target_engine = create_async_engine(url, connect_args={"server_settings": {"search_path": schema}})
    else:
        target_engine = create_async_engine(f"sqlite+aiosqlite:///{target.as_posix()}")
    async with source_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(insert(User).values(id="isolated-user", email="import@example.org",
            hashed_password="isolated-original-hash", avatar_url=f"/uploads/{filename}"))
    await source_engine.dispose()
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    async with target_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        result = await import_snapshot(source, uploads, target_engine=target_engine)
        assert result["dry_run"] and result["rows"]["users"] == 1 and result["photos"] == 1
        async with target_engine.connect() as conn:
            assert (await conn.execute(select(func.count()).select_from(User))).scalar_one() == 0
        await import_snapshot(source, uploads, apply=True, target_engine=target_engine)
        async with target_engine.connect() as conn:
            assert (await conn.execute(select(User.hashed_password))).scalar_one() == "isolated-original-hash"
            content = (await conn.execute(select(UploadContent.content))).scalar_one()
            assert (await conn.execute(select(StorageQuota.used_bytes))).scalar_one() == len(content)
        with pytest.raises(RuntimeError, match="not empty"):
            await import_snapshot(source, uploads, apply=True, target_engine=target_engine)
        assert hashlib.sha256(source.read_bytes()).hexdigest() == before
        assert (uploads / filename).is_file()
    finally:
        await target_engine.dispose()
        if admin is not None:
            async with admin.begin() as conn:
                await conn.execute(DropSchema(schema, cascade=True))
            await admin.dispose()
