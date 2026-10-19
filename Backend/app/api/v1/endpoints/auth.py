from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.core.rate_limiter import rate_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserPasswordChange,
    UserForgotPassword,
    UserResetPassword,
    UserResponse,
    Token,
)
from app.services.auth_service import auth_service
from app.core.security import create_access_token

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Yeni kullanıcı hesabı oluşturur ve JWT token döner."""
    await rate_limiter.check_rate_limit(request, max_requests=10, window_seconds=60, key_prefix="auth_register")
    return await auth_service.register(db, user_in)


@router.post("/login", response_model=Token)
async def login(request: Request, user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    """E-posta ve şifre ile giriş yapar ve JWT token döner."""
    await rate_limiter.check_rate_limit(request, max_requests=15, window_seconds=60, key_prefix="auth_login")
    return await auth_service.authenticate(db, user_in.email, user_in.password)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Giriş yapmış kullanıcının profil bilgilerini getirir."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının görünen adını, telefonunu, avatarını veya bildirim tercihlerini günceller."""
    return await auth_service.update_profile(db, current_user, user_in)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının hesabını ve tüm ilişkili verilerini (eşyalar, QR kodlar, mesajlar, görseller) kalıcı olarak siler."""
    await auth_service.delete_account(db, current_user)


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    request: Request,
    pass_in: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mevcut şifreyi doğrulayarak yeni şifre belirler."""
    await rate_limiter.check_rate_limit(request, max_requests=10, window_seconds=60, key_prefix="auth_change_password")
    await auth_service.change_password(db, current_user, pass_in)
    # Revoke every old session, but let this verified browser continue with a new token.
    return {"message": "Şifreniz başarıyla güncellendi.", "access_token": create_access_token(current_user.id, current_user.hashed_password)}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    request: Request,
    forgot_in: UserForgotPassword,
    db: AsyncSession = Depends(get_db),
):
    """Şifre sıfırlama bağlantısı üretir."""
    await rate_limiter.check_rate_limit(request, max_requests=5, window_seconds=60, key_prefix="auth_forgot")
    return await auth_service.forgot_password(db, forgot_in.email)


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request: Request,
    reset_in: UserResetPassword,
    db: AsyncSession = Depends(get_db),
):
    """Şifre sıfırlama token'ını doğrulayıp yeni şifreyi kaydeder."""
    await rate_limiter.check_rate_limit(request, max_requests=5, window_seconds=60, key_prefix="auth_reset")
    return await auth_service.reset_password(db, reset_in.token, reset_in.new_password)


