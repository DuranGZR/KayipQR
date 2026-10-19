import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class QRCode(Base):
    __tablename__ = "qr_codes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    item_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    unique_code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Store custom design JSON (e.g. dot_type, corner_style, fg_color, bg_color, frame_style, label_text, logo)
    design_config = Column(Text, nullable=False, default=lambda: json.dumps({
        "fg_color": "#1B4DF5",
        "bg_color": "#FFFFFF",
        "dot_style": "rounded",
        "corner_square_style": "extra-rounded",
        "corner_dot_style": "dot",
        "frame_style": "standard",
        "label_text": "KayıpQR ile Güvende",
        "show_label": True,
    }))
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    item = relationship("Item", back_populates="qr_code")
