from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class QRScanCreate(BaseModel):
    user_agent: Optional[str] = Field(default=None, max_length=500)
    device_type: Optional[str] = Field(default="Mobil", max_length=50)
    browser: Optional[str] = Field(default=None, max_length=50)
    approximate_city: Optional[str] = Field(default=None, max_length=100)
    approximate_country: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)


class QRScanResponse(BaseModel):
    id: str
    item_id: str
    device_type: Optional[str] = "Mobil"
    browser: Optional[str] = None
    approximate_city: Optional[str] = None
    approximate_country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scanned_at: datetime

    model_config = ConfigDict(from_attributes=True)
