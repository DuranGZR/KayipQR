import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.orm import relationship
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    email_verified = Column(Boolean, nullable=False, default=False, server_default="true")
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    google_sub = Column(String(255), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=True)
    phone_number = Column(String(50), nullable=True)  # Private, never exposed in public
    avatar_url = Column(String(500), nullable=True)
    
    # Notification preferences
    email_on_scan = Column(Boolean, default=False)
    email_on_message = Column(Boolean, default=True)

    is_active = Column(Boolean, default=True, index=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    items = relationship("Item", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    @property
    def has_password(self):
        return not self.hashed_password.startswith("google:")
