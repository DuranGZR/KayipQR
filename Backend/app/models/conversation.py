import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    item_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    finder_session_token = Column(String(100), unique=True, nullable=False, index=True)
    finder_alias = Column(String(100), default="Bulan Kişi")
    finder_email = Column(String(254), nullable=True)
    finder_reply_notified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status: 'active', 'closed', 'blocked', 'resolved'
    status = Column(String(50), default="active", nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    item = relationship("Item", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
