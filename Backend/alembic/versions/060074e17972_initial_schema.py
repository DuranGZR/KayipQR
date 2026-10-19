"""Initial schema

Revision ID: 060074e17972
Revises: 
Create Date: 2026-09-05 14:21:53.603106

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '060074e17972'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _ensure_index(existing_indexes: set[str], index_name: str, table_name: str, columns: list[str], unique: bool = False) -> None:
    if index_name not in existing_indexes:
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # 1. users
    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('hashed_password', sa.String(length=255), nullable=False),
            sa.Column('full_name', sa.String(length=255), nullable=True),
            sa.Column('phone_number', sa.String(length=50), nullable=True),
            sa.Column('avatar_url', sa.String(length=500), nullable=True),
            sa.Column('email_on_scan', sa.Boolean(), nullable=True),
            sa.Column('email_on_message', sa.Boolean(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('is_superuser', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
    user_indexes = {idx['name'] for idx in inspector.get_indexes('users')} if 'users' in existing_tables else set()
    _ensure_index(user_indexes, op.f('ix_users_email'), 'users', ['email'], unique=True)
    _ensure_index(user_indexes, op.f('ix_users_is_active'), 'users', ['is_active'], unique=False)
    _ensure_index(user_indexes, op.f('ix_users_created_at'), 'users', ['created_at'], unique=False)

    # 2. items
    if 'items' not in existing_tables:
        op.create_table(
            'items',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('category', sa.String(length=100), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('owner_display_name', sa.String(length=255), nullable=True),
            sa.Column('image_url', sa.String(length=500), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('reward_text', sa.String(length=255), nullable=True),
            sa.Column('show_name_to_finder', sa.Boolean(), nullable=True),
            sa.Column('show_desc_to_finder', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
    item_indexes = {idx['name'] for idx in inspector.get_indexes('items')} if 'items' in existing_tables else set()
    _ensure_index(item_indexes, op.f('ix_items_user_id'), 'items', ['user_id'], unique=False)
    _ensure_index(item_indexes, op.f('ix_items_status'), 'items', ['status'], unique=False)
    _ensure_index(item_indexes, op.f('ix_items_is_active'), 'items', ['is_active'], unique=False)
    _ensure_index(item_indexes, op.f('ix_items_created_at'), 'items', ['created_at'], unique=False)

    # 3. qr_codes
    if 'qr_codes' not in existing_tables:
        op.create_table(
            'qr_codes',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('item_id', sa.String(length=36), nullable=False),
            sa.Column('unique_code', sa.String(length=50), nullable=False),
            sa.Column('design_config', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
    qr_indexes = {idx['name'] for idx in inspector.get_indexes('qr_codes')} if 'qr_codes' in existing_tables else set()
    _ensure_index(qr_indexes, op.f('ix_qr_codes_item_id'), 'qr_codes', ['item_id'], unique=True)
    _ensure_index(qr_indexes, op.f('ix_qr_codes_unique_code'), 'qr_codes', ['unique_code'], unique=True)

    # 4. qr_scans
    if 'qr_scans' not in existing_tables:
        op.create_table(
            'qr_scans',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('item_id', sa.String(length=36), nullable=False),
            sa.Column('ip_hash', sa.String(length=64), nullable=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('device_type', sa.String(length=50), nullable=True),
            sa.Column('browser', sa.String(length=50), nullable=True),
            sa.Column('approximate_city', sa.String(length=100), nullable=True),
            sa.Column('approximate_country', sa.String(length=100), nullable=True),
            sa.Column('latitude', sa.Float(), nullable=True),
            sa.Column('longitude', sa.Float(), nullable=True),
            sa.Column('scanned_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
    scan_indexes = {idx['name'] for idx in inspector.get_indexes('qr_scans')} if 'qr_scans' in existing_tables else set()
    _ensure_index(scan_indexes, op.f('ix_qr_scans_item_id'), 'qr_scans', ['item_id'], unique=False)
    _ensure_index(scan_indexes, op.f('ix_qr_scans_scanned_at'), 'qr_scans', ['scanned_at'], unique=False)

    # 5. conversations
    if 'conversations' not in existing_tables:
        op.create_table(
            'conversations',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('item_id', sa.String(length=36), nullable=False),
            sa.Column('finder_session_token', sa.String(length=100), nullable=False),
            sa.Column('finder_alias', sa.String(length=100), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
    conv_indexes = {idx['name'] for idx in inspector.get_indexes('conversations')} if 'conversations' in existing_tables else set()
    _ensure_index(conv_indexes, op.f('ix_conversations_item_id'), 'conversations', ['item_id'], unique=False)
    _ensure_index(conv_indexes, op.f('ix_conversations_finder_session_token'), 'conversations', ['finder_session_token'], unique=True)
    _ensure_index(conv_indexes, op.f('ix_conversations_status'), 'conversations', ['status'], unique=False)
    _ensure_index(conv_indexes, op.f('ix_conversations_updated_at'), 'conversations', ['updated_at'], unique=False)

    # 6. messages
    if 'messages' not in existing_tables:
        op.create_table(
            'messages',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('conversation_id', sa.String(length=36), nullable=False),
            sa.Column('sender_type', sa.String(length=20), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('location_lat', sa.Float(), nullable=True),
            sa.Column('location_lng', sa.Float(), nullable=True),
            sa.Column('location_address', sa.String(length=255), nullable=True),
            sa.Column('is_read', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
    msg_indexes = {idx['name'] for idx in inspector.get_indexes('messages')} if 'messages' in existing_tables else set()
    _ensure_index(msg_indexes, op.f('ix_messages_conversation_id'), 'messages', ['conversation_id'], unique=False)
    _ensure_index(msg_indexes, op.f('ix_messages_is_read'), 'messages', ['is_read'], unique=False)
    _ensure_index(msg_indexes, op.f('ix_messages_created_at'), 'messages', ['created_at'], unique=False)

    # 7. notifications
    if 'notifications' not in existing_tables:
        op.create_table(
            'notifications',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(length=36), nullable=False),
            sa.Column('item_id', sa.String(length=36), nullable=True),
            sa.Column('type', sa.String(length=50), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('link', sa.String(length=255), nullable=True),
            sa.Column('is_read', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['item_id'], ['items.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
    notif_indexes = {idx['name'] for idx in inspector.get_indexes('notifications')} if 'notifications' in existing_tables else set()
    _ensure_index(notif_indexes, op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    _ensure_index(notif_indexes, op.f('ix_notifications_item_id'), 'notifications', ['item_id'], unique=False)
    _ensure_index(notif_indexes, op.f('ix_notifications_type'), 'notifications', ['type'], unique=False)
    _ensure_index(notif_indexes, op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)
    _ensure_index(notif_indexes, op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('notifications')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('qr_scans')
    op.drop_table('qr_codes')
    op.drop_table('items')
    op.drop_table('users')

