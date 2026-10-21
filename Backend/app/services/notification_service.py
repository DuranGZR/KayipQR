import html
from typing import List, Optional
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.services.email_service import email_service

from app.services.outbox_service import queue_email


class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: str,
        type_: str,
        title: str,
        body: str,
        item_id: Optional[str] = None,
        link: Optional[str] = None,
        send_email: bool = True,
        user_email: Optional[str] = None,
        extra_data: Optional[dict] = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            item_id=item_id,
            type=type_,
            title=title[:255],
            body=body,
            link=link,
        )
        db.add(notif)
        if type_ == "qr_scanned":
            send_email = False

        if send_email and user_email:
            # Render tailored HTML body based on notification type
            html_body = None
            extra = extra_data or {}
            full_link = f"{settings.PUBLIC_APP_URL}{link}" if link and link.startswith("/") else (link or settings.PUBLIC_APP_URL)

            if type_ == "qr_scanned":
                html_body = email_service.render_qr_scanned_email(
                    item_name=extra.get("item_name", "Eşyanız"),
                    device_type=extra.get("device_type", "Mobil"),
                    city=extra.get("city"),
                    dashboard_url=full_link,
                )
            elif type_ == "new_message":
                html_body = email_service.render_new_message_email(
                    item_name=extra.get("item_name", "Eşyanız"),
                    message_snippet=body,
                    chat_url=full_link,
                )
            elif type_ == "password_reset":
                html_body = email_service.render_password_reset_email(
                    reset_url=full_link,
                    user_name=extra.get("user_name"),
                )
            else:
                safe_title = html.escape(title or "", quote=True)
                safe_body = html.escape(body or "", quote=True)
                safe_link = html.escape(full_link or "", quote=True)
                html_body = email_service._get_base_template(
                    title=title,
                    preheader=title,
                    content_html=f"<h2>{safe_title}</h2><p>{safe_body}</p><div style='text-align:center;'><a href='{safe_link}' class='btn'>Detayları Görüntüle →</a></div>",
                )

            queue_email(db, user_email, title, html_body)

        await db.commit()
        await db.refresh(notif)

        return notif

    @staticmethod
    async def get_user_notifications(
        db: AsyncSession, user_id: str, limit: int = 50
    ) -> List[NotificationResponse]:
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        notifs = result.scalars().all()
        return [NotificationResponse.model_validate(n) for n in notifs]

    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: str) -> int:
        query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id, Notification.is_read == False  # noqa: E712
        )
        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def mark_as_read(db: AsyncSession, notification_id: str, user_id: str) -> Optional[Notification]:
        query = select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
        result = await db.execute(query)
        notif = result.scalars().first()
        if notif:
            notif.is_read = True
            db.add(notif)
            await db.commit()
            await db.refresh(notif)
        return notif

    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: str) -> int:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
            .values(is_read=True)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount


notification_service = NotificationService()
