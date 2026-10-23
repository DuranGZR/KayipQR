import os
import sqlite3
import subprocess
import sys
from pathlib import Path


def test_finder_email_migration_preserves_existing_conversations(tmp_path):
    database = tmp_path / "migration-test.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite+aiosqlite:///{database.as_posix()}"}
    backend = Path(__file__).resolve().parents[1]

    def migrate(*args):
        subprocess.run([sys.executable, "-m", "alembic", *args], cwd=backend, env=env,
            capture_output=True, text=True, check=True)

    migrate("upgrade", "20261022_ux")
    with sqlite3.connect(database) as db:
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("INSERT INTO users (id,email,hashed_password) VALUES ('owner','migration@example.org','unused')")
        db.execute("INSERT INTO items (id,user_id,name,status) VALUES ('item','owner','Anahtar','lost')")
        db.execute("INSERT INTO conversations (id,item_id,finder_session_token,status) VALUES ('chat','item','existing-token','active')")
    migrate("upgrade", "head")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT finder_session_token,finder_email,finder_reply_notified_at FROM conversations WHERE id='chat'").fetchone() == ("existing-token", None, None)
    migrate("downgrade", "20261022_ux")
    migrate("upgrade", "head")
    with sqlite3.connect(database) as db:
        assert db.execute("SELECT finder_session_token FROM conversations WHERE id='chat'").fetchone() == ("existing-token",)
