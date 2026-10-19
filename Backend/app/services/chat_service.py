from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import func, select, update, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.core.security import generate_finder_session_token, sanitize_message_content
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.item import Item
from app.models.user import User
from app.schemas.message import MessageCreate, MessageResponse
from app.schemas.conversation import ConversationResponse, ConversationDetailResponse, ConversationItemSummary
from app.services.notification_service import notification_service
from app.websockets.connection_manager import manager
from app.core.media import validate_attachments


class ChatService:
    @staticmethod
    async def create_conversation_from_finder(
        db: AsyncSession,
        item: Item,
        content: str,
        location_lat: Optional[float] = None,
        location_lng: Optional[float] = None,
        location_address: Optional[str] = None,
    ) -> tuple[Conversation, Message]:
        content = await validate_attachments(db, content)
        content = sanitize_message_content(content)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mesaj içeriği boş olamaz.",
            )
        if len(content) > 2000:
            content = content[:2000]

        # Count existing conversations for this item to generate friendly alias
        conv_count_res = await db.execute(
            select(func.count(Conversation.id)).where(Conversation.item_id == item.id)
        )
        count = conv_count_res.scalar() or 0
        alias = f"Bulan Kişi #{count + 1}"

        session_token = generate_finder_session_token()
        conv = Conversation(
            item_id=item.id,
            finder_session_token=session_token,
            finder_alias=alias,
            status="active",
        )
        db.add(conv)
        await db.flush()

        # Create first message
        first_msg = Message(
            conversation_id=conv.id,
            sender_type="finder",
            content=content,
            location_lat=location_lat,
            location_lng=location_lng,
            location_address=location_address,
            is_read=False,
        )
        db.add(first_msg)
        await db.flush()

        # Notify owner
        owner_res = await db.execute(select(User).where(User.id == item.user_id))
        owner = owner_res.scalars().first()
        owner_email = owner.email if owner else None
        send_email = owner.email_on_message if owner else True

        await notification_service.create_notification(
            db=db,
            user_id=item.user_id,
            type_="new_message",
            title=f"Yeni Mesaj: {item.name}",
            body=f"{alias}: {content[:120]}",
            item_id=item.id,
            link=f"/messages?id={conv.id}",
            send_email=send_email,
            user_email=owner_email,
            extra_data={
                "item_name": item.name,
            },
        )
        await db.refresh(conv)
        await db.refresh(first_msg)

        return conv, first_msg

    @staticmethod
    async def get_conversation_by_id(
        db: AsyncSession, conversation_id: str, include_messages: bool = True
    ) -> Optional[Conversation]:
        query = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(
                selectinload(Conversation.item).selectinload(Item.qr_code),
            )
        )
        if include_messages:
            query = query.options(selectinload(Conversation.messages))
        result = await db.execute(query)
        return result.scalars().first()

    @staticmethod
    async def get_conversation_by_token(
        db: AsyncSession, session_token: str, include_messages: bool = True
    ) -> Optional[Conversation]:
        query = (
            select(Conversation)
            .where(Conversation.finder_session_token == session_token)
            .options(
                selectinload(Conversation.item).selectinload(Item.qr_code),
            )
        )
        if include_messages:
            query = query.options(selectinload(Conversation.messages))
        result = await db.execute(query)
        return result.scalars().first()

    @staticmethod
    async def get_message_page(db: AsyncSession, conversation_id: str, limit: int = 100, before: Optional[str] = None):
        query = select(Message).where(Message.conversation_id == conversation_id)
        if before:
            cursor = (await db.execute(select(Message.created_at, Message.id).where(
                Message.id == before, Message.conversation_id == conversation_id))).first()
            if cursor is None:
                raise HTTPException(status_code=404, detail="Mesaj sayfası bulunamadı.")
            query = query.where(or_(Message.created_at < cursor.created_at,
                and_(Message.created_at == cursor.created_at, Message.id < cursor.id)))
        messages = list((await db.execute(query.order_by(Message.created_at.desc(), Message.id.desc()).limit(limit + 1))).scalars())
        has_more = len(messages) > limit
        messages = messages[:limit]
        next_cursor = messages[-1].id if has_more else None
        return list(reversed(messages)), next_cursor

    @staticmethod
    async def get_conversations_for_owner(
        db: AsyncSession, user_id: str, status_filter: Optional[str] = None, limit: Optional[int] = None, offset: int = 0
    ) -> List[ConversationResponse]:
        query = (
            select(Conversation)
            .join(Item, Item.id == Conversation.item_id)
            .where(Item.user_id == user_id)
            .options(
                selectinload(Conversation.item).selectinload(Item.qr_code),
            )
            .order_by(Conversation.updated_at.desc())
        )

        if status_filter and status_filter.lower() != "all":
            query = query.where(Conversation.status == status_filter.lower())

        if limit is not None:
            query = query.limit(limit).offset(offset)
        result = await db.execute(query)
        conversations = result.scalars().all()

        ids = [conv.id for conv in conversations]
        last_messages = {}
        unread_counts = {}
        if ids:
            ranked = select(Message.id, func.row_number().over(
                partition_by=Message.conversation_id,
                order_by=(Message.created_at.desc(), Message.id.desc()),
            ).label("position")).where(Message.conversation_id.in_(ids)).subquery()
            messages = await db.execute(select(Message).join(ranked, Message.id == ranked.c.id).where(ranked.c.position == 1))
            last_messages = {msg.conversation_id: msg for msg in messages.scalars()}
            unread = await db.execute(select(Message.conversation_id, func.count(Message.id)).where(
                Message.conversation_id.in_(ids), Message.sender_type == "finder", Message.is_read.is_(False)
            ).group_by(Message.conversation_id))
            unread_counts = dict(unread.all())

        responses: List[ConversationResponse] = []
        for conv in conversations:
            # Last message
            last_msg = last_messages.get(conv.id)
            last_msg_resp = MessageResponse.model_validate(last_msg) if last_msg else None

            # Unread messages from finder
            unread_count = unread_counts.get(conv.id, 0)

            item_summary = None
            if conv.item:
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

            responses.append(
                ConversationResponse(
                    id=conv.id,
                    item_id=conv.item_id,
                    finder_alias=conv.finder_alias,
                    status=conv.status,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    item=item_summary,
                    last_message=last_msg_resp,
                    unread_count=unread_count,
                )
            )
        return responses

    @staticmethod
    async def add_message(
        db: AsyncSession,
        conversation: Conversation,
        sender_type: str,
        content: str,
        location_lat: Optional[float] = None,
        location_lng: Optional[float] = None,
        location_address: Optional[str] = None,
    ) -> Message:
        if conversation.status == "blocked":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu konuşma engellenmiştir.",
            )
        if conversation.status == "closed":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu konuşma kapatılmıştır. Mesaj göndermek için konuşmayı yeniden açın.",
            )
        if sender_type == "finder" and conversation.item and not conversation.item.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu QR kodu sahibi tarafından geçici olarak pasife alınmıştır.",
            )

        content = await validate_attachments(db, content)
        clean_content = sanitize_message_content(content)
        if not clean_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mesaj içeriği boş olamaz.",
            )
        if len(clean_content) > 2000:
            clean_content = clean_content[:2000]

        msg = Message(
            conversation_id=conversation.id,
            sender_type=sender_type,
            content=clean_content,
            location_lat=location_lat,
            location_lng=location_lng,
            location_address=location_address,
            is_read=False,
        )
        db.add(msg)
        conversation.updated_at = datetime.now(timezone.utc)
        db.add(conversation)
        await db.flush()

        # Notify owner if sender is finder
        if sender_type == "finder" and conversation.item:
            owner_res = await db.execute(select(User).where(User.id == conversation.item.user_id))
            owner = owner_res.scalars().first()
            owner_email = owner.email if owner else None
            send_email = owner.email_on_message if owner else True

            await notification_service.create_notification(
                db=db,
                user_id=conversation.item.user_id,
                type_="new_message",
                title=f"Yeni Mesaj: {conversation.item.name}",
                body=f"{conversation.finder_alias}: {clean_content[:120]}",
                item_id=conversation.item.id,
                link=f"/messages?id={conversation.id}",
                send_email=send_email,
                user_email=owner_email,
                extra_data={
                    "item_name": conversation.item.name,
                },
            )

        await db.commit()
        await db.refresh(msg)

        msg_dict = {
            "type": "new_message",
            "message": {
                "id": msg.id,
                "conversation_id": msg.conversation_id,
                "sender_type": msg.sender_type,
                "content": MessageResponse.model_validate(msg).model_dump()["content"],
                "location_lat": msg.location_lat,
                "location_lng": msg.location_lng,
                "location_address": msg.location_address,
                "is_read": msg.is_read,
                "created_at": msg.created_at.isoformat(),
            },
        }

        # Broadcast message via WebSocket
        await manager.broadcast_to_conversation(conversation.id, msg_dict)

        return msg

    @staticmethod
    async def mark_conversation_as_read(
        db: AsyncSession, conversation_id: str, sender_type_to_mark: str
    ):
        stmt = (
            update(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.sender_type == sender_type_to_mark,
                Message.is_read == False,  # noqa: E712
            )
            .values(is_read=True)
        )
        res = await db.execute(stmt)
        await db.commit()
        if res.rowcount and res.rowcount > 0:
            reader = "owner" if sender_type_to_mark == "finder" else "finder"
            await manager.broadcast_to_conversation(
                conversation_id,
                {
                    "type": "read_ack",
                    "reader": reader,
                    "conversation_id": conversation_id,
                },
            )

    @staticmethod
    async def update_status(
        db: AsyncSession, conversation: Conversation, new_status: str
    ) -> Conversation:
        conversation.status = new_status
        conversation.updated_at = datetime.now(timezone.utc)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

        # Broadcast status update
        await manager.broadcast_to_conversation(
            conversation.id,
            {"type": "status_update", "status": new_status, "conversation_id": conversation.id},
        )
        return conversation

    @staticmethod
    async def delete_conversation(db: AsyncSession, conversation: Conversation) -> None:
        from app.services.storage_service import storage_service

        msg_contents = [msg.content for msg in (conversation.messages or []) if msg.content]

        await db.delete(conversation)
        await db.commit()

        for content in msg_contents:
            await storage_service.safe_delete_files_in_text(db, content)


chat_service = ChatService()

