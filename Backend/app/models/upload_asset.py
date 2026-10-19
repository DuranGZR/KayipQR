from datetime import datetime, timezone
from sqlalchemy import Column, Integer, BigInteger, String, DateTime
from app.db.base import Base


class UploadAsset(Base):
    __tablename__ = "upload_assets"
    filename = Column(String(40), primary_key=True)
    size_bytes = Column(BigInteger, nullable=False)
    content_type = Column(String(64), nullable=False)
    state = Column(String(16), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)


class StorageQuota(Base):
    __tablename__ = "storage_quota"
    id = Column(Integer, primary_key=True)
    used_bytes = Column(BigInteger, nullable=False, server_default="0")
