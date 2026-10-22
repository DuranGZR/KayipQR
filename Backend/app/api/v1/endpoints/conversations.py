from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.message import Message
from app.api.deps import get_current_user
from app.core.rate_limiter import rate_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.conversation import (
    ConversationResponse,
    ConversationDetailResponse,
    ConversationUpdate,
    ConversationItemSummary,
)
from app.schemas.message import MessageCreate, MessageResponse
from app.services.chat_service import chat_service
from app.services.item_service import item_service

router = APIRouter()


async def message_response(db: AsyncSession, conversation_id: str, message_id: str) -> MessageResponse:
    message = await db.scalar(select(Message).where(
        Message.conversation_id == conversation_id, Message.id == message_id
    ))
    if message is None:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı.")
    return MessageResponse.model_validate(message)


@router.get("/{conversation_id}/messages/{message_id}", response_model=MessageResponse)
async def get_owner_message(conversation_id: str, message_id: str,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Refresh one message's media capability without loading the history."""
    conv = await chat_service.get_conversation_by_id(db, conversation_id, include_messages=False)
    if not conv or not conv.item or conv.item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı.")
    return await message_response(db, conv.id, message_id)


@router.get("/finder/{session_token}/messages/{message_id}", response_model=MessageResponse)
async def get_finder_message(session_token: str, message_id: str, request: Request,
    db: AsyncSession = Depends(get_db)):
    await rate_limiter.check_rate_limit(request, max_requests=60, window_seconds=60, key_prefix="finder_message")
    conv = await chat_service.get_conversation_by_token(db, session_token, include_messages=False)
    if not conv:
        raise HTTPException(status_code=404, detail="Konuşma oturumu bulunamadı.")
    return await message_response(db, conv.id, message_id)


# ==============================================================================
# Eşya Sahibi (Owner) Endpoint'leri
# ==============================================================================

@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    status: Optional[str] = Query(None, description="Filtre: all, active, closed, blocked, resolved"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, max_length=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Eşya sahibine ait tüm konuşmaları listeler."""
    return await chat_service.get_conversations_for_owner(
        db=db, user_id=current_user.id, status_filter=status, limit=limit, offset=offset, search_query=search
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_details(
    conversation_id: str,
    limit: int = Query(100, ge=1, le=200),
    before: Optional[str] = Query(None, max_length=36),
    after: Optional[str] = Query(None, max_length=36),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Konuşma geçmişini getirir."""
    conv = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id, include_messages=False)
    if not conv or not conv.item or conv.item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konuşma bulunamadı.",
        )

    messages, next_cursor = await chat_service.get_message_page(db, conv.id, limit, before, after)
    await chat_service.mark_conversation_as_read(
        db=db, conversation_id=conv.id, sender_type_to_mark="finder"
    )
    for m in messages or []:
        if m.sender_type == "finder":
            m.is_read = True

    latest_messages, _ = await chat_service.get_message_page(db, conv.id, 1) if before or after else (messages, None)
    last_msg = latest_messages[-1] if latest_messages else None
    last_msg_resp = MessageResponse.model_validate(last_msg) if last_msg else None

    item_summary = ConversationItemSummary(
        id=conv.item.id,
        name=conv.item.name,
        category=conv.item.category,
        image_url=conv.item.image_url,
        status=conv.item.status,
        unique_code=conv.item.qr_code.unique_code if conv.item.qr_code else None,
        description=conv.item.description,
        reward_text=conv.item.reward_text,
    )

    return ConversationDetailResponse(
        id=conv.id,
        item_id=conv.item_id,
        finder_alias=conv.finder_alias,
        status=conv.status,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        item=item_summary,
        last_message=last_msg_resp,
        unread_count=sum(1 for m in messages if m.sender_type == "finder" and not m.is_read),
        messages=[MessageResponse.model_validate(m) for m in messages],
        next_cursor=next_cursor,
        read_through=await db.scalar(select(func.max(Message.created_at)).where(Message.conversation_id == conv.id,
            Message.sender_type == "owner", Message.is_read.is_(True))),
    )


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message_as_owner(
    conversation_id: str,
    msg_in: MessageCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Eşya sahibi olarak bulan kişiye mesaj yazar."""
    await rate_limiter.check_rate_limit(request, max_requests=30, window_seconds=60, key_prefix="msg_owner", identity=current_user.id)
    conv = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id, include_messages=False)
    if not conv or not conv.item or conv.item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konuşma bulunamadı.",
        )

    msg = await chat_service.add_message(
        db=db,
        conversation=conv,
        sender_type="owner",
        content=msg_in.content,
        location_lat=msg_in.location_lat,
        location_lng=msg_in.location_lng,
        location_address=msg_in.location_address,
    )
    return MessageResponse.model_validate(msg)


@router.patch("/{conversation_id}/status", response_model=ConversationResponse)
async def update_conversation_status(
    conversation_id: str,
    update_in: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Konuşmayı kapatır, engeller veya çözüldü olarak işaretler."""
    if update_in.status not in ["active", "closed", "blocked", "resolved"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geçersiz durum.",
        )

    conv = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id, include_messages=False)
    if not conv or not conv.item or conv.item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konuşma bulunamadı.",
        )

    updated_conv = await chat_service.update_status(db=db, conversation=conv, new_status=update_in.status)

    # If resolved, optionally update item status to resolved
    if update_in.status == "resolved":
        conv.item.status = "resolved"
        db.add(conv.item)
        await db.commit()

    return ConversationResponse(
        id=updated_conv.id,
        item_id=updated_conv.item_id,
        finder_alias=updated_conv.finder_alias,
        status=updated_conv.status,
        created_at=updated_conv.created_at,
        updated_at=updated_conv.updated_at,
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Eşya sahibinin konuşmayı ve içindeki fotoğrafları silmesini sağlar."""
    conv = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id)
    if not conv or not conv.item or conv.item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konuşma bulunamadı.",
        )
    await chat_service.delete_conversation(db=db, conversation=conv)


# ==============================================================================
# Bulan Kişi (Finder) Anonim Endpoint'leri
# ==============================================================================

@router.get("/finder/{session_token}", response_model=ConversationDetailResponse)
async def get_finder_conversation(
    session_token: str,
    request: Request,
    limit: int = Query(100, ge=1, le=200),
    before: Optional[str] = Query(None, max_length=36),
    after: Optional[str] = Query(None, max_length=36),
    db: AsyncSession = Depends(get_db),
):
    """Bulan kişinin anonim token'ı ile mesajlaşma geçmişini getirir."""
    await rate_limiter.check_rate_limit(request, max_requests=60, window_seconds=60, key_prefix="finder_get_conv")
    conv = await chat_service.get_conversation_by_token(db=db, session_token=session_token, include_messages=False)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konuşma oturumu bulunamadı.",
        )

    messages, next_cursor = await chat_service.get_message_page(db, conv.id, limit, before, after)

    # Mark owner's unread messages as read by finder
    await chat_service.mark_conversation_as_read(
        db=db, conversation_id=conv.id, sender_type_to_mark="owner"
    )
    for m in messages or []:
        if m.sender_type == "owner":
            m.is_read = True

    latest_messages, _ = await chat_service.get_message_page(db, conv.id, 1) if before or after else (messages, None)
    last_msg = latest_messages[-1] if latest_messages else None
    last_msg_resp = MessageResponse.model_validate(last_msg) if last_msg else None

    item_summary = None
    if conv.item:
        item_summary = ConversationItemSummary(
            id=conv.item.id,
            name=conv.item.name if conv.item.show_name_to_finder else "Kayıp Eşya",
            category=conv.item.category,
            image_url=conv.item.image_url,
            status=conv.item.status,
            unique_code=conv.item.qr_code.unique_code if conv.item.qr_code else None,
            description=conv.item.description if conv.item.show_desc_to_finder else None,
            reward_text=conv.item.reward_text,
        )

    return ConversationDetailResponse(
        id=conv.id,
        item_id=conv.item_id,
        finder_alias=conv.finder_alias,
        status=conv.status,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        item=item_summary,
        last_message=last_msg_resp,
        unread_count=0,
        messages=[MessageResponse.model_validate(m) for m in messages],
        next_cursor=next_cursor,
        read_through=await db.scalar(select(func.max(Message.created_at)).where(Message.conversation_id == conv.id,
            Message.sender_type == "finder", Message.is_read.is_(True))),
    )


@router.post("/finder/{session_token}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message_as_finder(
    session_token: str,
    msg_in: MessageCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Bulan kişi olarak sahibe cevap mesajı gönderir."""
    await rate_limiter.check_rate_limit(request, max_requests=20, window_seconds=60, key_prefix="msg_finder_edge")
    conv = await chat_service.get_conversation_by_token(db=db, session_token=session_token, include_messages=False)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konuşma oturumu bulunamadı.",
        )

    await rate_limiter.check_rate_limit(request, max_requests=20, window_seconds=60, key_prefix="msg_finder", identity=conv.id)

    msg = await chat_service.add_message(
        db=db,
        conversation=conv,
        sender_type="finder",
        content=msg_in.content,
        location_lat=msg_in.location_lat,
        location_lng=msg_in.location_lng,
        location_address=msg_in.location_address,
    )
    return MessageResponse.model_validate(msg)

