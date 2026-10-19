"""Serialize PostgreSQL schema upgrades across simultaneous deployments."""
import asyncio
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from app.core.config import settings


async def migrate():
    config = Config("alembic.ini")
    if not settings.DATABASE_URL.startswith("postgresql"):
        await asyncio.to_thread(command.upgrade, config, "head")
        return
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            # Session advisory lock survives transaction boundaries in Alembic's
            # separate connection and is released if this deploy process dies.
            await conn.execute(text("SELECT pg_advisory_lock(725716231)"))
            try:
                await asyncio.to_thread(command.upgrade, config, "head")
            finally:
                await conn.execute(text("SELECT pg_advisory_unlock(725716231)"))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
