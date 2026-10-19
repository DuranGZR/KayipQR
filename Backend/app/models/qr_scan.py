import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class QRScan(Base):
    __tablename__ = "qr_scans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    item_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    
    ip_hash = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_type = Column(String(50), default="Mobil")
    browser = Column(String(50), nullable=True)
    
    approximate_city = Column(String(100), nullable=True)
    approximate_country = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    scanned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    item = relationship("Item", back_populates="scans")
