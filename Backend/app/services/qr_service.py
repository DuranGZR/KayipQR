import json
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import generate_unique_qr_code
from app.models.qr_code import QRCode
from app.models.item import Item
from app.schemas.qr_code import QRCodeResponse, QRCodeDesignConfig


DEFAULT_PRESET_COLORS = {
    "teal_liquid": ("#1E7E75", "#F6F0E4"),
    "indigo_leaf": ("#43468A", "#F6F0E4"),
    "orange_medallion": ("#F6F0E4", "#C84B0E"),
    "forest_core": ("#1D6F4A", "#F6F0E4"),
    "kayipqr_signature": ("#2C2925", "#FAF5EA"),
    "onyx_minimal": ("#18181B", "#F6F0E4"),
    "stealth_medallion": ("#F6F0E4", "#18181B"),
    "crimson_leaf": ("#8F2424", "#F6F0E4"),
}


class QRService:
    @staticmethod
    def get_public_scan_url(unique_code: str) -> str:
        return f"{settings.PUBLIC_APP_URL}/q/{unique_code}"

    @staticmethod
    async def create_qr_for_item(
        db: AsyncSession,
        item: Item,
        design_config: Optional[Dict[str, Any]] = None,
    ) -> QRCode:
        # Loop until unique code generated
        for _ in range(10):
            code = generate_unique_qr_code(length=8)
            existing = await db.execute(select(QRCode).where(QRCode.unique_code == code))
            if not existing.scalars().first():
                break
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Benzersiz QR kodu üretilemedi, lütfen tekrar deneyin.",
            )

        config_data: Dict[str, Any] = {
            "color_dark": "#1E7E75",
            "color_light": "#F6F0E4",
            "fg_color": "#1E7E75",
            "bg_color": "#F6F0E4",
            "pattern_style": "teal_liquid",
            "dot_style": "teal_liquid",
            "frame_type": "teal_liquid",
            "frame_style": "teal_liquid",
            "frame_text": "BENİ TARA",
            "label_text": "BENİ TARA",
            "show_label": True,
        }
        if design_config:
            config_data.update(design_config)

        db_qr = QRCode(
            item_id=item.id,
            unique_code=code,
            design_config=json.dumps(config_data),
        )
        db.add(db_qr)
        await db.commit()
        await db.refresh(db_qr)
        return db_qr

    @staticmethod
    async def get_by_item_id(db: AsyncSession, item_id: str) -> Optional[QRCode]:
        result = await db.execute(select(QRCode).where(QRCode.item_id == item_id))
        return result.scalars().first()

    @staticmethod
    async def get_by_unique_code(db: AsyncSession, unique_code: str) -> Optional[QRCode]:
        result = await db.execute(select(QRCode).where(QRCode.unique_code == unique_code.upper().strip()))
        return result.scalars().first()

    @staticmethod
    async def update_design(db: AsyncSession, qr_code: QRCode, design_config: Dict[str, Any]) -> QRCode:
        try:
            current_cfg = json.loads(qr_code.design_config) if qr_code.design_config else {}
        except Exception:
            current_cfg = {}

        design_config = QRCodeDesignConfig.model_validate(design_config).model_dump(exclude_unset=True)
        current_cfg.update(design_config)
        qr_code.design_config = json.dumps(current_cfg)
        db.add(qr_code)
        await db.commit()
        await db.refresh(qr_code)
        return qr_code

    @classmethod
    def to_response(cls, qr_code: QRCode, total_scans: int = 0) -> QRCodeResponse:
        try:
            cfg = json.loads(qr_code.design_config) if qr_code.design_config else {}
        except Exception:
            cfg = {}

        # Ignore malformed values from older persisted records rather than making
        # the whole item unreadable. New requests are strictly validated.
        if not isinstance(cfg, dict):
            cfg = {}
        clean = {}
        for key, value in cfg.items():
            try:
                clean.update(QRCodeDesignConfig.model_validate({key: value}).model_dump(exclude_unset=True))
            except ValueError:
                continue
        cfg = clean

        raw_style = cfg.get("frame_type") or cfg.get("pattern_style") or cfg.get("dot_style") or "teal_liquid"
        is_legacy_default = raw_style in ("rounded", "standard", "extra-rounded") and cfg.get("fg_color") == "#1B4DF5"

        if is_legacy_default:
            style_id = "teal_liquid"
            default_fg, default_bg = DEFAULT_PRESET_COLORS[style_id]
            color_dark = default_fg
            color_light = default_bg
            frame_text = "BENİ TARA"
        else:
            style_id = raw_style if raw_style in DEFAULT_PRESET_COLORS else "teal_liquid"
            default_fg, default_bg = DEFAULT_PRESET_COLORS.get(style_id, ("#1E7E75", "#F6F0E4"))
            color_dark = cfg.get("color_dark") or cfg.get("fg_color") or default_fg
            color_light = cfg.get("color_light") or cfg.get("bg_color") or default_bg
            if "frame_text" in cfg and cfg["frame_text"] is not None:
                frame_text = str(cfg["frame_text"])
            elif "label_text" in cfg and cfg["label_text"] is not None and not str(cfg["label_text"]).endswith("- KayıpQR"):
                frame_text = str(cfg["label_text"])
            else:
                frame_text = "BENİ TARA"

        public_url = cls.get_public_scan_url(qr_code.unique_code)

        return QRCodeResponse(
            id=qr_code.id,
            item_id=qr_code.item_id,
            unique_code=qr_code.unique_code,
            design_config=qr_code.design_config,
            qr_url=public_url,
            public_url=public_url,
            color_dark=color_dark,
            color_light=color_light,
            pattern_style=style_id,
            frame_type=style_id,
            frame_text=frame_text,
            total_scans=total_scans,
            created_at=qr_code.created_at,
            updated_at=qr_code.updated_at,
        )


qr_service = QRService()
