"""Optional finder email and atomic first-reply notification reservation."""
from alembic import op
import sqlalchemy as sa

revision = "20261023_finder_reply"
down_revision = "20261022_ux"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("conversations", sa.Column("finder_email", sa.String(254), nullable=True))
    op.add_column("conversations", sa.Column("finder_reply_notified_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("conversations", "finder_reply_notified_at")
    op.drop_column("conversations", "finder_email")
