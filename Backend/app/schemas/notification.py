from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    type: str
    title: str
    body: str
    link: Optional[str] = None


class NotificationCreate(NotificationBase):
    user_id: str
    item_id: Optional[str] = None


class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    item_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
