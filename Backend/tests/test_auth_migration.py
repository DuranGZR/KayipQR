"""Exercise the upgrade with a legacy account, without touching the developer DB."""
import os
import sqlite3
import subprocess
import sys
from contextlib import closing
from pathlib import Path


def test_auth_migration_preserves_existing_accounts_and_matches_models(tmp_path):
    database = tmp_path / "isolated-test.db"
    env = dict(os.environ, ENVIRONMENT="test", DATABASE_URL="sqlite+aiosqlite:///" + database.as_posix(),
        RUN_BACKGROUND_TASKS="false", SERVERLESS_MODE="false")
    root = Path(__file__).resolve().parents[1]

    def alembic(*args):
        result = subprocess.run([sys.executable, "-m", "alembic", *args], cwd=root, env=env, capture_output=True, text=True)
        assert result.returncode == 0, result.stdout + result.stderr

    alembic("upgrade", "20261019_vercel")
    with closing(sqlite3.connect(database)) as db:
        db.execute("INSERT INTO users(id,email,hashed_password,email_on_scan,is_active) VALUES ('legacy','legacy@example.org','legacy-hash',1,1)")
        db.commit()
    alembic("upgrade", "head")
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("SELECT email_verified,email_on_scan FROM users WHERE id='legacy'").fetchone() == (1, 0)
    alembic("check")
    alembic("downgrade", "20261019_vercel")
    alembic("upgrade", "head")
