from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.message import MessageResponse


class ConversationBase(BaseModel):
    status: str = "active"


class ConversationUpdate(BaseModel):
    status: str  # 'active', 'closed', 'blocked', 'resolved'


class ConversationItemSummary(BaseModel):
    id: str
    name: str
    category: str
    image_url: Optional[str] = None
    status: str
    unique_code: Optional[str] = None
    description: Optional[str] = None
    reward_text: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: str
    item_id: str
    finder_alias: str
    status: str
    created_at: datetime
    updated_at: datetime
    item: Optional[ConversationItemSummary] = None
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse] = []
    next_cursor: Optional[str] = None
