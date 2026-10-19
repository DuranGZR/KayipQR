from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# Public view of an item for a finder who scanned a QR
class PublicItemResponse(BaseModel):
    unique_code: str
    name: Optional[str] = "Kayıp Eşya"
    category: Optional[str] = "Genel"
    description: Optional[str] = None
    owner_display_name: Optional[str] = "Eşya Sahibi"
    image_url: Optional[str] = None
    status: str  # 'safe' | 'lost' | 'resolved'
    is_active: bool = True
    reward_text: Optional[str] = None
    created_at: datetime


# Public request when a finder starts a conversation
class PublicContactRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Finder message to the owner")
    location_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    location_lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    location_address: Optional[str] = Field(default=None, max_length=255)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    device_type: Optional[str] = Field(default="Mobil", max_length=50)
    browser: Optional[str] = Field(default=None, max_length=50)
    approximate_city: Optional[str] = Field(default=None, max_length=100)
    approximate_country: Optional[str] = Field(default=None, max_length=100)


# Public response returned to finder after starting conversation
class PublicContactResponse(BaseModel):
    conversation_id: str
    finder_session_token: str  # Token the finder keeps in localStorage / cookie to chat
    message: str
    status: str
