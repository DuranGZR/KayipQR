from datetime import datetime
from typing import Annotated, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


Color = Annotated[str, Field(strict=True, pattern=r"^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$")]
Style = Literal["teal_liquid", "indigo_leaf", "orange_medallion", "forest_core", "kayipqr_signature", "onyx_minimal", "stealth_medallion", "crimson_leaf", "rounded", "standard", "extra-rounded", "dots", "dot", "square", "gapped"]


class QRCodeDesignConfig(BaseModel):
    # Optional defaults allow partial updates, but explicit null is rejected.
    color_dark: Color = "#1E7E75"
    color_light: Color = "#F6F0E4"
    fg_color: Color = "#1E7E75"
    bg_color: Color = "#F6F0E4"
    pattern_style: Style = "teal_liquid"
    dot_style: Style = "teal_liquid"
    frame_type: Style = "teal_liquid"
    frame_style: Style = "teal_liquid"
    corner_square_style: Literal["dot", "square", "extra-rounded"] = "extra-rounded"
    corner_dot_style: Literal["dot", "square"] = "dot"
    frame_text: str = Field(default="BENİ TARA", max_length=60, strict=True)
    label_text: str = Field(default="BENİ TARA", max_length=60, strict=True)
    show_label: bool = Field(default=True, strict=True)
    logo_type: Literal["none", "kq_badge", "custom"] = "none"
    logo_url: Optional[str] = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")


class QRCodeBase(BaseModel):
    design_config: Optional[QRCodeDesignConfig] = None


class QRCodeUpdate(BaseModel):
    design_config: QRCodeDesignConfig


class QRCodeResponse(BaseModel):
    id: str
    item_id: str
    unique_code: str
    design_config: str  # JSON string
    qr_url: str  # Full public scan URL
    public_url: str = ""
    color_dark: str = "#1E7E75"
    color_light: str = "#F6F0E4"
    pattern_style: str = "teal_liquid"
    frame_type: str = "teal_liquid"
    frame_text: str = "BENİ TARA"
    total_scans: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
