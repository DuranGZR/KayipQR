from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.core.rate_limiter import rate_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.item import (
    ItemCreate,
    ItemUpdate,
    ItemStatusUpdate,
    ItemResponse,
)
from app.services.item_service import item_service

router = APIRouter()


@router.get("", response_model=List[ItemResponse])
async def list_items(
    status: Optional[str] = Query(None, description="Filtre: all, safe, lost, resolved"),
    search: Optional[str] = Query(None, description="Eşya adı arama terimi"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının eşyalarını listeler."""
    return await item_service.get_items_for_user(
        db=db, user_id=current_user.id, status_filter=status, search_query=search, limit=limit, offset=offset
    )


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    request: Request,
    item_in: ItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Yeni eşya oluşturur ve otomatik benzersiz QR kodunu üretir."""
    await rate_limiter.check_rate_limit(request, max_requests=20, window_seconds=60, key_prefix="items_create")
    return await item_service.create_item(db=db, user_id=current_user.id, item_in=item_in)


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Belirli bir eşyanın tüm detaylarını ve QR kodunu getirir."""
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eşya bulunamadı.",
        )

    return await item_service.build_item_response(db, item)


@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: str,
    item_in: ItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Eşya bilgilerini ve QR tasarımını günceller."""
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eşya bulunamadı.",
        )
    updated_item = await item_service.update_item(db=db, item=item, item_in=item_in)
    return await item_service.build_item_response(db, updated_item)


@router.put("/{item_id}/status", response_model=ItemResponse)
@router.patch("/{item_id}/status", response_model=ItemResponse)
async def update_item_status(
    item_id: str,
    status_in: ItemStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Eşya durumunu (safe, lost, resolved) değiştirir."""
    if status_in.status not in ["safe", "lost", "resolved"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz durum. safe, lost veya resolved olmalıdır.",
        )

    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eşya bulunamadı.",
        )

    item.status = status_in.status
    db.add(item)
    await db.commit()
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)

    return await item_service.build_item_response(db, item)


@router.patch("/{item_id}/toggle-active", response_model=ItemResponse)
async def toggle_item_active(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """QR kodunu geçici olarak devre dışı bırakır veya tekrar aktif eder."""
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eşya bulunamadı.",
        )

    item.is_active = not item.is_active
    db.add(item)
    await db.commit()
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)

    return await item_service.build_item_response(db, item)


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
async def delete_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Eşyayı ve ilişkili QR / sohbet kayıtlarını siler."""
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Eşya bulunamadı.",
        )
    await item_service.delete_item(db=db, item=item)
    return {"message": "Eşya ve ilişkili tüm veriler başarıyla silindi."}
