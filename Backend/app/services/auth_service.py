from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import select, update, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import create_access_token, password_needs_rehash, hash_password, check_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserPasswordChange, Token, UserResponse, RegistrationResponse


class AuthService:
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email.lower()))
        return result.scalars().first()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    @staticmethod
    async def register(db: AsyncSession, user_in: UserCreate) -> RegistrationResponse:
        await AuthService.email_cooldown("verify_email", user_in.email)
        existing_user = await AuthService.get_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu e-posta adresi ile kayıtlı bir hesap zaten var.",
            )

        hashed_password = await hash_password(user_in.password)
        db_user = User(
            email=user_in.email.lower(),
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            phone_number=user_in.phone_number,
            email_verified=False,
            email_on_scan=False,
        )
        db.add(db_user)
        try:
            await db.flush()
            from app.services.outbox_service import queue_auth_email
            await queue_auth_email(db, db_user, "verify_email", user_in.redirect_path)
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu e-posta adresi zaten kullanımda.",
            )
        await db.refresh(db_user)

        return RegistrationResponse(email=db_user.email,
            message="Hesabını etkinleştirmek için e-postana gönderilen doğrulama bağlantısını aç.")

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> Token:
        user = await AuthService.get_by_email(db, email)
        if not user or not await check_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-posta veya şifre hatalı.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu hesap devre dışı bırakılmıştır.",
            )
        if not user.email_verified:
            raise HTTPException(status_code=403, detail="Önce e-posta adresini doğrula. Doğrulama sayfasından yeni bağlantı isteyebilirsin.")

        verified_hash = user.hashed_password
        if password_needs_rehash(verified_hash):
            upgraded_hash = await hash_password(password)
            changed = await db.execute(update(User).where(
                User.id == user.id, User.hashed_password == verified_hash, User.is_active.is_(True)
            ).values(hashed_password=upgraded_hash).execution_options(synchronize_session=False))
            if changed.rowcount != 1:
                await db.rollback()
                raise HTTPException(status_code=401, detail="Oturum bilgileri değişti. Yeniden giriş yapın.")
            await db.commit()
            verified_hash = upgraded_hash
        await db.refresh(user)
        if not user.is_active or user.hashed_password != verified_hash:
            raise HTTPException(status_code=401, detail="Oturum bilgileri değişti. Yeniden giriş yapın.")
        token = create_access_token(subject=user.id, password_hash=user.hashed_password)
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, user_in: UserUpdate) -> UserResponse:
        from app.services.storage_service import storage_service

        old_avatar_url = None
        if user_in.full_name is not None:
            user.full_name = user_in.full_name
        if user_in.phone_number is not None:
            user.phone_number = user_in.phone_number
        if user_in.avatar_url is not None:
            from app.core.media import validate_attachments
            avatar_url = await validate_attachments(db, user_in.avatar_url)
            if user.avatar_url and user.avatar_url != avatar_url:
                old_avatar_url = user.avatar_url
            user.avatar_url = avatar_url
        if user_in.email_on_scan is not None:
            user.email_on_scan = False
        if user_in.email_on_message is not None:
            user.email_on_message = user_in.email_on_message

        db.add(user)
        await db.commit()
        await db.refresh(user)

        if old_avatar_url:
            await storage_service.safe_delete_file(db, old_avatar_url)

        return UserResponse.model_validate(user)

    @staticmethod
    async def delete_account(db: AsyncSession, user: User) -> None:
        from app.models.item import Item
        from app.models.conversation import Conversation
        from app.models.message import Message
        from app.services.storage_service import storage_service

        # Collect uploaded chat photos across all conversations of user's items
        msgs_res = await db.execute(
            select(Message.content)
            .join(Conversation, Conversation.id == Message.conversation_id)
            .join(Item, Item.id == Conversation.item_id)
            .where(Item.user_id == user.id)
        )
        msg_contents = [msg_content for (msg_content,) in msgs_res.all() if msg_content]

        # Collect uploaded item images and user avatar
        items_res = await db.execute(select(Item).where(Item.user_id == user.id))
        item_image_urls = [item.image_url for item in items_res.scalars().all() if item.image_url]
        old_avatar_url = user.avatar_url

        from app.models.email_outbox import EmailOutbox
        await db.execute(delete(EmailOutbox).where(EmailOutbox.recipient == user.email))
        await db.delete(user)
        await db.commit()

        for msg_content in msg_contents:
            await storage_service.safe_delete_files_in_text(db, msg_content)
        for img_url in item_image_urls:
            await storage_service.safe_delete_file(db, img_url)
        if old_avatar_url:
            await storage_service.safe_delete_file(db, old_avatar_url)

    @staticmethod
    async def change_password(db: AsyncSession, user: User, pass_in: UserPasswordChange) -> None:
        if not await check_password(pass_in.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mevcut şifreniz hatalı.",
            )

        new_hash = await hash_password(pass_in.new_password)
        changed = await db.execute(update(User).where(
            User.id == user.id, User.hashed_password == user.hashed_password
        ).values(hashed_password=new_hash).execution_options(synchronize_session=False))
        if changed.rowcount != 1:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Şifreniz başka bir işlemde değişti. Yeniden giriş yapın.")
        await db.commit()
        await db.refresh(user)

    @staticmethod
    async def forgot_password(db: AsyncSession, email: str) -> dict:
        await AuthService.email_cooldown("password_reset", email)
        user = await AuthService.get_by_email(db, email)
        if user and user.is_active:
            from app.services.outbox_service import queue_auth_email
            await queue_auth_email(db, user, "password_reset")
            await db.commit()

        # Consistent generic message to prevent user enumeration
        return {
            "message": "Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama e-postası gönderim için hazırlanmıştır.",
            "retry_after": 60,
        }

    @staticmethod
    async def email_cooldown(purpose: str, email: str):
        from app.services.runtime_limits import consume_window
        retry = await consume_window(f"auth-email:{purpose}:{email.lower()}", 1, 60)
        if retry:
            raise HTTPException(status_code=429, detail=f"Yeni e-posta için {retry} saniye bekle.", headers={"Retry-After": str(retry)})

    @staticmethod
    async def resend_verification(db: AsyncSession, email: str, redirect_path: str | None = None) -> dict:
        await AuthService.email_cooldown("verify_email", email)
        user = await AuthService.get_by_email(db, email)
        if user and user.is_active and not user.email_verified:
            from app.services.outbox_service import queue_auth_email
            await queue_auth_email(db, user, "verify_email", redirect_path)
            await db.commit()
        return {"message": "Doğrulanmamış bir hesabın varsa doğrulama e-postası gönderim için hazırlanmıştır.", "retry_after": 60}

    @staticmethod
    async def verify_email(db: AsyncSession, token: str) -> Token:
        from app.core.security import decode_email_verification_token, _password_fingerprint
        import hmac
        payload = decode_email_verification_token(token)
        user = await AuthService.get_by_email(db, payload["sub"]) if payload else None
        if (not user or not user.is_active or user.email_verified
            or not hmac.compare_digest(payload["fgp"], _password_fingerprint(user.hashed_password))):
            raise HTTPException(status_code=400, detail="Doğrulama bağlantısı geçersiz, kullanılmış veya süresi dolmuş.")
        changed = await db.execute(update(User).where(User.id == user.id, User.email_verified.is_(False),
            User.hashed_password == user.hashed_password).values(email_verified=True, email_verified_at=datetime.now(timezone.utc)).execution_options(synchronize_session=False))
        if changed.rowcount != 1:
            raise HTTPException(status_code=400, detail="Doğrulama bağlantısı daha önce kullanılmış.")
        await db.commit()
        await db.refresh(user)
        return Token(access_token=create_access_token(user.id, user.hashed_password), user=UserResponse.model_validate(user))

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> dict:
        from app.core.security import decode_password_reset_token
        email = decode_password_reset_token(token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Geçersiz veya süresi dolmuş sıfırlama bağlantısı.",
            )

        user = await AuthService.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Kullanıcı bulunamadı.",
            )

        # Verify single-use fingerprint against current hashed_password
        if not decode_password_reset_token(token, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu şifre sıfırlama bağlantısı daha önce kullanılmış veya geçersiz.",
            )

        new_hash = await hash_password(new_password)
        changed = await db.execute(update(User).where(
            User.id == user.id, User.hashed_password == user.hashed_password
        ).values(hashed_password=new_hash, email_verified=True, email_verified_at=datetime.now(timezone.utc)).execution_options(synchronize_session=False))
        if changed.rowcount != 1:
            await db.rollback()
            raise HTTPException(status_code=400, detail="Bu şifre sıfırlama bağlantısı daha önce kullanılmış veya geçersiz.")
        await db.commit()
        return {"message": "Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz."}


auth_service = AuthService()

