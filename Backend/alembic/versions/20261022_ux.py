"""Preserve the verification flow's permitted return path."""
from alembic import op
import sqlalchemy as sa

revision = "20261022_ux"
down_revision = "20261021_auth"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("email_outbox", sa.Column("redirect_path", sa.String(512), nullable=True))


def downgrade():
    op.drop_column("email_outbox", "redirect_path")
