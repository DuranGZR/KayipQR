from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import notification_service

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının bildirimlerini listeler."""
    return await notification_service.get_user_notifications(
        db=db, user_id=current_user.id, limit=limit
    )


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Okunmamış bildirim sayısını döner."""
    count = await notification_service.get_unread_count(db=db, user_id=current_user.id)
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bildirimi okundu olarak işaretler."""
    notif = await notification_service.mark_as_read(
        db=db, notification_id=notification_id, user_id=current_user.id
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bildirim bulunamadı.",
        )
    return notif


@router.patch("/mark-all-read")
@router.patch("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tüm bildirimleri okundu olarak işaretler."""
    count = await notification_service.mark_all_as_read(db=db, user_id=current_user.id)
    return {"message": "Tüm bildirimler okundu olarak işaretlendi.", "updated_count": count}

