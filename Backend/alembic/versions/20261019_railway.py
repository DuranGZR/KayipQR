"""Shared storage accounting and leased email workers.

Revision ID: 20261019_railway
Revises: 20261019_email_outbox
"""
from alembic import op
import sqlalchemy as sa

revision = "20261019_railway"
down_revision = "20261019_email_outbox"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("email_outbox", sa.Column("lease_token", sa.String(36), nullable=True))
    op.add_column("email_outbox", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_email_outbox_pending", "email_outbox", ["status", "next_attempt_at"])
    op.create_index("ix_email_outbox_lease", "email_outbox", ["status", "locked_until"])
    op.create_index("ix_messages_history", "messages", ["conversation_id", "created_at", "id"])
    op.create_table("storage_quota",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("used_bytes", sa.BigInteger(), nullable=False, server_default="0"))
    op.execute("INSERT INTO storage_quota (id, used_bytes) VALUES (1, 0)")
    op.create_table("upload_assets",
        sa.Column("filename", sa.String(40), primary_key=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("content_type", sa.String(64), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_upload_assets_created_at", "upload_assets", ["created_at"])


def downgrade():
    op.drop_index("ix_messages_history", table_name="messages")
    op.drop_index("ix_email_outbox_lease", table_name="email_outbox")
    op.drop_index("ix_email_outbox_pending", table_name="email_outbox")
    op.drop_index("ix_upload_assets_created_at", table_name="upload_assets")
    op.drop_table("upload_assets")
    op.drop_table("storage_quota")
    with op.batch_alter_table("email_outbox") as batch:
        batch.drop_column("locked_until")
        batch.drop_column("lease_token")
