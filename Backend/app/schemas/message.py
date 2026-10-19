from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer
from app.core.media import signed_message_content


class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    location_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    location_lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    location_address: Optional[str] = Field(default=None, max_length=255)


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: str
    conversation_id: str
    sender_type: str  # 'finder' or 'owner'
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("content")
    def serialize_content(self, value: str) -> str:
        return signed_message_content(value)
