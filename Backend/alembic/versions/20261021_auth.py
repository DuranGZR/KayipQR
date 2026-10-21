"""Email verification, Google identity, and expiring authentication mail."""
from alembic import op
import sqlalchemy as sa

revision = "20261021_auth"
down_revision = "20261019_vercel"
branch_labels = None
depends_on = None


def upgrade():
    # Preserve accounts already in production; only new registrations need verification.
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("google_sub", sa.String(255), nullable=True))
    op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
    op.execute(sa.text("UPDATE users SET email_on_scan = false"))
    op.add_column("email_outbox", sa.Column("purpose", sa.String(32), nullable=False, server_default="notification"))
    op.add_column("email_outbox", sa.Column("auth_fingerprint", sa.String(64), nullable=True))
    op.add_column("email_outbox", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("email_outbox", sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True))
    # Old queued mail predates first-message-only behavior and delivery-time tokens.
    op.execute(sa.text("UPDATE email_outbox SET status='failed', html_body='' WHERE status IN ('pending', 'processing')"))


def downgrade():
    for name in ("token_expires_at", "expires_at", "auth_fingerprint", "purpose"):
        op.drop_column("email_outbox", name)
    op.drop_index("ix_users_google_sub", table_name="users")
    op.drop_column("users", "google_sub")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "email_verified")
