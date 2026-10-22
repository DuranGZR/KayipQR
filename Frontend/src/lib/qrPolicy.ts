export const ITEM_NAME_MAX = 255;
export const OWNER_NAME_MAX = 255;
export const ITEM_NOTE_MAX = 2000;
export const QR_LABEL_MAX = 22;
export const MIN_QR_CONTRAST = 3;
export const isQrColor = (value: string) => /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value);

export function qrContrast(foreground: string, background: string): number {
  if (!isQrColor(foreground) || !isQrColor(background)) return 0;
  const luminance = (value: string) => {
    if (value.length === 4) value = "#" + value.slice(1).split("").map(c => c + c).join("");
    const channels = value.slice(1).match(/.{2}/g)!.map(channel => parseInt(channel, 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export function qrColorError(foreground: string, background: string): string {
  if (!isQrColor(foreground) || !isQrColor(background)) return "Renkleri #1E7E75 biçiminde, altı haneli HEX koduyla yaz.";
  return qrContrast(foreground, background) < MIN_QR_CONTRAST
    ? "QR ve zemin renkleri yeterince farklı değil. İndirmeden önce zıt renkler seç veya orijinal renklere dön."
    : "";
}
