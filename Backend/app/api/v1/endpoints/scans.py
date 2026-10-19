from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.qr_scan import QRScanResponse
from app.schemas.dashboard import RecentScanItem
from app.services.item_service import item_service
from app.services.scan_service import scan_service

router = APIRouter()


@router.get("/item/{item_id}", response_model=List[QRScanResponse])
async def get_item_scans(
    item_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Belirli bir eşyanın QR tarama geçmişini listeler."""
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eşya bulunamadı.",
        )
    return await scan_service.get_item_scans(db=db, item_id=item_id, limit=limit)


@router.get("/recent", response_model=List[RecentScanItem])
async def get_recent_scans(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının tüm eşyalarındaki son taramaları listeler."""
    return await scan_service.get_recent_scans_for_user(
        db=db, user_id=current_user.id, limit=limit
    )
