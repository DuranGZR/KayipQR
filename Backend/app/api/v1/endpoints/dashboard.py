from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.item import Item
from app.models.qr_scan import QRScan
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.dashboard import DashboardStatsResponse
from app.services.scan_service import scan_service

router = APIRouter()


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard ana ekranı için genel istatistikleri ve son hareketleri döner."""
    user_id = current_user.id

    # Items summary
    items_query = select(Item.status, func.count(Item.id)).where(Item.user_id == user_id).group_by(Item.status)
    items_res = await db.execute(items_query)
    status_counts = dict(items_res.all())

    total_items = sum(status_counts.values())
    safe_items = status_counts.get("safe", 0)
    lost_items = status_counts.get("lost", 0)
    resolved_items = status_counts.get("resolved", 0)

    # Scans total
    scans_res = await db.execute(
        select(func.count(QRScan.id)).join(Item, Item.id == QRScan.item_id).where(Item.user_id == user_id)
    )
    total_scans = scans_res.scalar() or 0

    # Active conversations
    active_conv_res = await db.execute(
        select(func.count(Conversation.id))
        .join(Item, Item.id == Conversation.item_id)
        .where(Item.user_id == user_id, Conversation.status == "active")
    )
    active_conversations = active_conv_res.scalar() or 0

    # Total messages
    total_msg_res = await db.execute(
        select(func.count(Message.id))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .join(Item, Item.id == Conversation.item_id)
        .where(Item.user_id == user_id)
    )
    total_messages = total_msg_res.scalar() or 0

    # Unread messages
    unread_res = await db.execute(
        select(func.count(Message.id))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .join(Item, Item.id == Conversation.item_id)
        .where(
            Item.user_id == user_id,
            Message.sender_type == "finder",
            Message.is_read == False,  # noqa: E712
        )
    )
    unread_messages = unread_res.scalar() or 0

    # Recent scans
    recent_scans = await scan_service.get_recent_scans_for_user(db=db, user_id=user_id, limit=5)

    return DashboardStatsResponse(
        total_items=total_items,
        safe_items=safe_items,
        lost_items=lost_items,
        resolved_items=resolved_items,
        total_scans=total_scans,
        total_messages=total_messages,
        unread_messages=unread_messages,
        active_conversations=active_conversations,
        recent_scans=recent_scans,
    )
