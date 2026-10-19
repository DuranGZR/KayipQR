from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.qr_scan import QRScanResponse


class RecentScanItem(BaseModel):
    scan_id: str
    item_id: str
    item_name: str
    scanned_at: datetime
    device_type: Optional[str] = "Mobil"
    approximate_city: Optional[str] = None
    approximate_country: Optional[str] = None


class DashboardStatsResponse(BaseModel):
    total_items: int = 0
    safe_items: int = 0
    lost_items: int = 0
    resolved_items: int = 0
    total_scans: int = 0
    total_messages: int = 0
    unread_messages: int = 0
    active_conversations: int = 0
    recent_scans: List[RecentScanItem] = []
