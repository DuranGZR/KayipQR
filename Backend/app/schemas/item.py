from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.qr_code import QRCodeResponse, Color, Style


class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="Kişisel Eşya", max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    owner_display_name: Optional[str] = Field(default=None, max_length=255)
    image_url: Optional[str] = Field(default=None, max_length=500)
    status: Literal["safe", "lost", "resolved"] = Field(default="safe", description="safe | lost | resolved")
    is_active: bool = True
    reward_text: Optional[str] = Field(default=None, max_length=255)
    show_name_to_finder: bool = True
    show_desc_to_finder: bool = True


class ItemCreate(ItemBase):
    qr_color_dark: Optional[Color] = None
    qr_color_light: Optional[Color] = None
    qr_pattern_style: Optional[Style] = None
    qr_frame_type: Optional[Style] = None
    qr_frame_text: Optional[str] = Field(default=None, max_length=60)


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    owner_display_name: Optional[str] = Field(default=None, max_length=255)
    image_url: Optional[str] = Field(default=None, max_length=500)
    status: Optional[Literal["safe", "lost", "resolved"]] = None
    is_active: Optional[bool] = None
    reward_text: Optional[str] = Field(default=None, max_length=255)
    show_name_to_finder: Optional[bool] = None
    show_desc_to_finder: Optional[bool] = None
    qr_color_dark: Optional[Color] = None
    qr_color_light: Optional[Color] = None
    qr_pattern_style: Optional[Style] = None
    qr_frame_type: Optional[Style] = None
    qr_frame_text: Optional[str] = Field(default=None, max_length=60)


class ItemStatusUpdate(BaseModel):
    status: str = Field(..., max_length=50, description="safe | lost | resolved")


class ItemResponse(ItemBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    qr_code: Optional[QRCodeResponse] = None
    total_scans: int = 0
    unread_messages_count: int = 0
    last_scanned_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
