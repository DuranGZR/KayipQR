import json
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.item import Item
from app.models.qr_code import QRCode
from app.models.qr_scan import QRScan
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.services.qr_service import qr_service, DEFAULT_PRESET_COLORS
from app.core.media import validate_attachments
from app.core.qr_policy import validate_qr_colors


class ItemService:
    @staticmethod
    async def create_item(db: AsyncSession, user_id: str, item_in: ItemCreate) -> ItemResponse:
        item = Item(
            user_id=user_id,
            name=item_in.name,
            category=item_in.category or "Kişisel Eşya",
            description=item_in.description,
            owner_display_name=item_in.owner_display_name if item_in.owner_display_name is not None else "",
            image_url=await validate_attachments(db, item_in.image_url) if item_in.image_url else item_in.image_url,
            status=item_in.status or "safe",
            is_active=item_in.is_active,
            reward_text=item_in.reward_text,
            show_name_to_finder=item_in.show_name_to_finder,
            show_desc_to_finder=item_in.show_desc_to_finder,
        )
        db.add(item)
        await db.flush()

        style_id = item_in.qr_frame_type or item_in.qr_pattern_style or "teal_liquid"
        default_fg, default_bg = DEFAULT_PRESET_COLORS.get(style_id, ("#1E7E75", "#F6F0E4"))
        color_dark = item_in.qr_color_dark or default_fg
        color_light = item_in.qr_color_light or default_bg
        frame_text = item_in.qr_frame_text if item_in.qr_frame_text is not None else "BENİ TARA"

        design_config: Dict[str, Any] = {
            "color_dark": color_dark,
            "color_light": color_light,
            "fg_color": color_dark,
            "bg_color": color_light,
            "pattern_style": style_id,
            "dot_style": style_id,
            "frame_type": style_id,
            "frame_style": style_id,
            "frame_text": frame_text,
            "label_text": frame_text,
            "show_label": bool(frame_text),
        }

        # Automatically generate its unique QR code with the chosen design (commits atomically)
        qr = await qr_service.create_qr_for_item(db, item, design_config=design_config)
        await db.refresh(item)

        return ItemResponse(
            id=item.id,
            user_id=item.user_id,
            name=item.name,
            category=item.category,
            description=item.description,
            owner_display_name=item.owner_display_name,
            image_url=item.image_url,
            status=item.status,
            is_active=item.is_active,
            reward_text=item.reward_text,
            show_name_to_finder=item.show_name_to_finder,
            show_desc_to_finder=item.show_desc_to_finder,
            created_at=item.created_at,
            updated_at=item.updated_at,
            qr_code=qr_service.to_response(qr, total_scans=0),
            total_scans=0,
            unread_messages_count=0,
            last_scanned_at=None,
        )

    @staticmethod
    async def get_by_id(db: AsyncSession, item_id: str, user_id: Optional[str] = None) -> Optional[Item]:
        query = (
            select(Item)
            .where(Item.id == item_id)
            .options(selectinload(Item.qr_code))
        )
        if user_id:
            query = query.where(Item.user_id == user_id)
        result = await db.execute(query)
        return result.scalars().first()

    @staticmethod
    async def build_item_response(db: AsyncSession, itm: Item, summaries: Optional[dict] = None) -> ItemResponse:
        if summaries is None:
            summaries = await ItemService.get_summaries(db, [itm.id])
        total_scans, last_scanned, unread_count = summaries.get(itm.id, (0, None, 0))

        qr_resp = qr_service.to_response(itm.qr_code, total_scans=total_scans) if itm.qr_code else None

        return ItemResponse(
            id=itm.id,
            user_id=itm.user_id,
            name=itm.name,
            category=itm.category,
            description=itm.description,
            owner_display_name=itm.owner_display_name,
            image_url=itm.image_url,
            status=itm.status,
            is_active=itm.is_active,
            reward_text=itm.reward_text,
            show_name_to_finder=itm.show_name_to_finder,
            show_desc_to_finder=itm.show_desc_to_finder,
            created_at=itm.created_at,
            updated_at=itm.updated_at,
            qr_code=qr_resp,
            total_scans=total_scans,
            unread_messages_count=unread_count,
            last_scanned_at=last_scanned,
        )

    @staticmethod
    async def get_summaries(db: AsyncSession, item_ids: list[str]) -> dict:
        if not item_ids:
            return {}
        scans = await db.execute(select(QRScan.item_id, func.count(QRScan.id), func.max(QRScan.scanned_at))
            .where(QRScan.item_id.in_(item_ids)).group_by(QRScan.item_id))
        summaries = {item_id: (count, latest, 0) for item_id, count, latest in scans}
        unread = await db.execute(select(Conversation.item_id, func.count(Message.id))
            .join(Message, Message.conversation_id == Conversation.id)
            .where(Conversation.item_id.in_(item_ids), Message.sender_type == "finder", Message.is_read.is_(False))
            .group_by(Conversation.item_id))
        for item_id, count in unread:
            scans, latest, _ = summaries.get(item_id, (0, None, 0))
            summaries[item_id] = (scans, latest, count)
        return summaries

    @staticmethod
    async def get_items_for_user(
        db: AsyncSession,
        user_id: str,
        status_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[ItemResponse]:
        query = (
            select(Item)
            .where(Item.user_id == user_id)
            .options(selectinload(Item.qr_code))
            .order_by(Item.created_at.desc(), Item.id.desc())
        )

        if status_filter and status_filter.lower() != "all":
            query = query.where(Item.status == status_filter.lower())

        if search_query:
            term = "%" + search_query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            query = query.where(or_(Item.name.ilike(term, escape="\\"), Item.category.ilike(term, escape="\\"),
                Item.qr_code.has(QRCode.unique_code.ilike(term, escape="\\"))))

        if limit is not None:
            query = query.limit(limit).offset(offset)
        result = await db.execute(query)
        items = result.scalars().all()
        summaries = await ItemService.get_summaries(db, [item.id for item in items])

        response_list: List[ItemResponse] = []
        for itm in items:
            response_list.append(await ItemService.build_item_response(db, itm, summaries))
        return response_list

    @staticmethod
    async def update_item(db: AsyncSession, item: Item, item_in: ItemUpdate) -> Item:
        from app.services.storage_service import storage_service

        update_data = item_in.model_dump(exclude_unset=True)
        if update_data.get("image_url"):
            update_data["image_url"] = await validate_attachments(db, update_data["image_url"])

        old_image_url = None
        if "image_url" in update_data and item.image_url and item.image_url != update_data["image_url"]:
            old_image_url = item.image_url

        qr_fields = {
            "qr_color_dark": update_data.pop("qr_color_dark", None),
            "qr_color_light": update_data.pop("qr_color_light", None),
            "qr_pattern_style": update_data.pop("qr_pattern_style", None),
            "qr_frame_type": update_data.pop("qr_frame_type", None),
            "qr_frame_text": update_data.pop("qr_frame_text", None),
        }

        non_nullable_fields = {
            "name",
            "category",
            "status",
            "is_active",
            "show_name_to_finder",
            "show_desc_to_finder",
        }

        for field, value in update_data.items():
            if field in non_nullable_fields and value is None:
                continue
            setattr(item, field, value)

        db.add(item)

        if item.qr_code and any(v is not None for v in qr_fields.values()):
            try:
                cfg = json.loads(item.qr_code.design_config) if item.qr_code.design_config else {}
            except Exception:
                cfg = {}

            style_id = (
                qr_fields["qr_frame_type"]
                or qr_fields["qr_pattern_style"]
                or cfg.get("frame_type")
                or cfg.get("pattern_style")
                or "teal_liquid"
            )
            default_fg, default_bg = DEFAULT_PRESET_COLORS.get(style_id, ("#1E7E75", "#F6F0E4"))

            if qr_fields["qr_color_dark"] is not None:
                cfg["color_dark"] = qr_fields["qr_color_dark"]
                cfg["fg_color"] = qr_fields["qr_color_dark"]
            elif "color_dark" not in cfg:
                cfg["color_dark"] = default_fg
                cfg["fg_color"] = default_fg

            if qr_fields["qr_color_light"] is not None:
                cfg["color_light"] = qr_fields["qr_color_light"]
                cfg["bg_color"] = qr_fields["qr_color_light"]
            elif "color_light" not in cfg:
                cfg["color_light"] = default_bg
                cfg["bg_color"] = default_bg

            cfg["pattern_style"] = style_id
            cfg["dot_style"] = style_id
            cfg["frame_type"] = style_id
            cfg["frame_style"] = style_id

            if qr_fields["qr_frame_text"] is not None:
                cfg["frame_text"] = qr_fields["qr_frame_text"]
                cfg["label_text"] = qr_fields["qr_frame_text"]
                cfg["show_label"] = bool(qr_fields["qr_frame_text"])

            validate_qr_colors(cfg["color_dark"], cfg["color_light"])
            item.qr_code.design_config = json.dumps(cfg)
            db.add(item.qr_code)

        await db.commit()
        if old_image_url:
            await storage_service.safe_delete_file(db, old_image_url)

        refreshed = await ItemService.get_by_id(db=db, item_id=item.id, user_id=item.user_id)
        return refreshed or item

    @staticmethod
    async def delete_item(db: AsyncSession, item: Item) -> None:
        from app.services.storage_service import storage_service

        # Collect any photos shared in conversations belonging to this item
        msgs_res = await db.execute(
            select(Message.content)
            .join(Conversation, Conversation.id == Message.conversation_id)
            .where(Conversation.item_id == item.id)
        )
        msg_contents = [msg_content for (msg_content,) in msgs_res.all() if msg_content]
        old_image_url = item.image_url

        await db.delete(item)
        await db.commit()

        for msg_content in msg_contents:
            await storage_service.safe_delete_files_in_text(db, msg_content)
        if old_image_url:
            await storage_service.safe_delete_file(db, old_image_url)


item_service = ItemService()


