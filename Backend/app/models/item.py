import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="Genel")
    description = Column(Text, nullable=True)
    owner_display_name = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)
    
    # Status: 'safe' (Güvende), 'lost' (Kayıp), 'resolved' (Teslim Edildi)
    status = Column(String(50), default="safe", nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)  # Can temporarily deactivate QR
    
    # Custom message / reward info
    reward_text = Column(String(255), nullable=True)
    
    # Finder visibility flags
    show_name_to_finder = Column(Boolean, default=True)
    show_desc_to_finder = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="items")
    qr_code = relationship("QRCode", back_populates="item", uselist=False, cascade="all, delete-orphan")
    scans = relationship("QRScan", back_populates="item", cascade="all, delete-orphan", order_by="desc(QRScan.scanned_at)")
    conversations = relationship("Conversation", back_populates="item", cascade="all, delete-orphan", order_by="desc(Conversation.updated_at)")
