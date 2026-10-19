"""Durable, shared state for serverless instances without Redis."""
from sqlalchemy import Column, String, Integer, DateTime, LargeBinary, ForeignKey
from app.db.base import Base


class RuntimeBucket(Base):
    __tablename__ = "runtime_buckets"
    key = Column(String(64), primary_key=True)
    count = Column(Integer, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)


class UploadContent(Base):
    __tablename__ = "upload_contents"
    filename = Column(String(40), ForeignKey("upload_assets.filename", ondelete="CASCADE"), primary_key=True)
    content = Column(LargeBinary, nullable=False)
