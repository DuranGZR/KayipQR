"""A conservative color guard, not a promise of physical camera readability."""
import re
from fastapi import HTTPException


def validate_qr_colors(foreground: str, background: str) -> None:
    def luminance(color: str) -> float:
        if not isinstance(color, str) or not re.fullmatch(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?", color):
            raise HTTPException(status_code=422, detail="Geçerli bir HEX renk kodu seçin.")
        if len(color) == 4:
            color = "#" + "".join(c * 2 for c in color[1:])
        channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        channels = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in channels]
        return sum(c * weight for c, weight in zip(channels, (.2126, .7152, .0722)))
    a, b = luminance(foreground), luminance(background)
    if (max(a, b) + .05) / (min(a, b) + .05) < 3:
        raise HTTPException(status_code=422, detail="QR ve zemin renkleri yeterince farklı değil. Zıt renkler seçin.")
