"""Persist transactional email and retries.

Revision ID: 20261019_email_outbox
Revises: 060074e17972
"""
from alembic import op
import sqlalchemy as sa

revision = "20261019_email_outbox"
down_revision = "060074e17972"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("email_outbox",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("html_body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_email_outbox_status", "email_outbox", ["status"])
    op.create_index("ix_email_outbox_next_attempt_at", "email_outbox", ["next_attempt_at"])


def downgrade():
    op.drop_index("ix_email_outbox_next_attempt_at", table_name="email_outbox")
    op.drop_index("ix_email_outbox_status", table_name="email_outbox")
    op.drop_table("email_outbox")
