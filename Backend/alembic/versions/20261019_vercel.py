"""Database images and shared serverless limits."""
from alembic import op
import sqlalchemy as sa

revision = "20261019_vercel"
down_revision = "20261019_railway"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("runtime_buckets",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_runtime_buckets_expires_at", "runtime_buckets", ["expires_at"])
    op.create_table("upload_contents",
        sa.Column("filename", sa.String(40), sa.ForeignKey("upload_assets.filename", ondelete="CASCADE"), primary_key=True),
        sa.Column("content", sa.LargeBinary(), nullable=False))


def downgrade():
    op.drop_table("upload_contents")
    op.drop_index("ix_runtime_buckets_expires_at", table_name="runtime_buckets")
    op.drop_table("runtime_buckets")
