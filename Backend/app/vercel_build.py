"""Run schema upgrades with a direct (non-pooler) connection during deploy build."""
import asyncio
import os


def main():
    direct_url = os.getenv("DIRECT_DATABASE_URL", "")
    if not direct_url.startswith(("postgres://", "postgresql://", "postgresql+asyncpg://")):
        raise RuntimeError("Set DIRECT_DATABASE_URL to this environment's direct PostgreSQL connection before deploying.")
    os.environ["DATABASE_URL"] = direct_url
    from app.migrate import migrate
    asyncio.run(migrate())


if __name__ == "__main__":
    main()
