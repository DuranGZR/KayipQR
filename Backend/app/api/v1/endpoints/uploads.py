from fastapi import APIRouter, Depends, File, Request, UploadFile, status
from app.api.deps import get_current_user
from app.core.rate_limiter import rate_limiter
from app.models.user import User
from app.services.storage_service import storage_service

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Görsel (eşya fotoğrafı / avatar) yükler ve erişilebilir URL döner."""
    await rate_limiter.check_rate_limit(request, max_requests=15, window_seconds=60, key_prefix="auth_upload")
    await rate_limiter.check_rate_limit(request, max_requests=150, window_seconds=86400, key_prefix="user_upload_daily", identity=current_user.id)
    file_url = await storage_service.save_upload_file(file)
    return {"url": file_url}

