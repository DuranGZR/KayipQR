import asyncio
import os
import sys
from app.core.config import settings


def main():
    if settings.RUN_MIGRATIONS:
        from app.migrate import migrate
        asyncio.run(migrate())
    if settings.APP_ROLE == "worker":
        os.execv(sys.executable, [sys.executable, "-m", "app.worker"])
    port = int(os.environ.get("PORT", "8000"))
    if not 1 <= port <= 65535:
        raise ValueError("PORT must be between 1 and 65535")
    os.execv(sys.executable, [sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0", "--port", str(port), "--workers", "1",
        "--no-proxy-headers", "--ws-max-size", "65536", "--ws-max-queue", "32"])


if __name__ == "__main__":
    main()
