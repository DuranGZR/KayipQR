import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, Text, Index
from app.db.base import Base


class EmailOutbox(Base):
    __tablename__ = "email_outbox"
    __table_args__ = (
        Index("ix_email_outbox_pending", "status", "next_attempt_at"),
        Index("ix_email_outbox_lease", "status", "locked_until"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    html_body = Column(Text, nullable=False)
    purpose = Column(String(32), nullable=False, default="notification", server_default="notification")
    auth_fingerprint = Column(String(64), nullable=True)
    redirect_path = Column(String(512), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(16), nullable=False, default="pending", index=True)
    attempts = Column(Integer, nullable=False, default=0)
    next_attempt_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    lease_token = Column(String(36), nullable=True)
    locked_until = Column(DateTime(timezone=True), nullable=True)
