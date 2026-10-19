import asyncio
import io
import json
import re
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import (
    RoundedModuleDrawer,
    CircleModuleDrawer,
    SquareModuleDrawer,
    GappedSquareModuleDrawer,
)
from app.api.deps import get_current_user
from app.core.rate_limiter import rate_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.qr_code import QRCodeResponse, QRCodeUpdate
from app.services.item_service import item_service
from app.services.qr_service import qr_service

router = APIRouter()


def _render_qr_png_sync(qr_url: str, design: dict) -> bytes:
    fg = design.get("fg_color") or design.get("color_dark") or "#1B4DF5"
    bg = design.get("bg_color") or design.get("color_light") or "#FFFFFF"
    dot_style = design.get("dot_style") or design.get("pattern_style") or "rounded"

    drawer = RoundedModuleDrawer()
    if dot_style == "dots":
        drawer = CircleModuleDrawer()
    elif dot_style == "square":
        drawer = SquareModuleDrawer()
    elif dot_style == "gapped":
        drawer = GappedSquareModuleDrawer()

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=3,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)

    try:
        img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=drawer,
            back_color=bg,
            fill_color=fg,
        )
    except Exception:
        img = qr.make_image(fill_color=fg, back_color=bg)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_ascii_filename(raw_name: str) -> str:
    tr_map = str.maketrans("ğĞüÜşŞıİöÖçÇ", "gGuUsSiIoOcC")
    translated = (raw_name or "kayipqr").translate(tr_map)
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", translated).strip("_")
    return cleaned or "kayipqr"


@router.get("/item/{item_id}", response_model=QRCodeResponse)
async def get_item_qr(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Eşyaya ait QR kodu bilgilerini ve tasarım ayarlarını getirir."""
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item or not item.qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR Kod bulunamadı.",
        )
    return qr_service.to_response(item.qr_code)


@router.put("/item/{item_id}", response_model=QRCodeResponse)
async def update_item_qr_design(
    item_id: str,
    qr_in: QRCodeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """QR kodunun renklerini, desenini ve etiket ayarlarını günceller."""
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item or not item.qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR Kod bulunamadı.",
        )

    updated_qr = await qr_service.update_design(
        db=db, qr_code=item.qr_code, design_config=qr_in.design_config.model_dump(exclude_unset=True)
    )
    return qr_service.to_response(updated_qr)


@router.get("/item/{item_id}/render-png")
async def render_qr_png(
    item_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sunucu taraflı yedek PNG QR üretici."""
    await rate_limiter.check_rate_limit(request, max_requests=30, window_seconds=60, key_prefix="qr_render")
    item = await item_service.get_by_id(db=db, item_id=item_id, user_id=current_user.id)
    if not item or not item.qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR Kod bulunamadı.",
        )

    qr_url = qr_service.get_public_scan_url(item.qr_code.unique_code)
    try:
        design = json.loads(item.qr_code.design_config) if item.qr_code.design_config else {}
    except Exception:
        design = {}

    png_bytes = await asyncio.to_thread(_render_qr_png_sync, qr_url, design)

    ascii_base = _make_ascii_filename(item.name)
    utf8_quoted = urllib.parse.quote(f"{item.name or 'kayipqr'}_qr.png", safe="")

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f"inline; filename=\"{ascii_base}_qr.png\"; filename*=UTF-8''{utf8_quoted}"
        },
    )
