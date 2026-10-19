import html2canvas from "html2canvas";
import {
  generateCustomQrSvgString,
  resolveQrDesign,
} from "@/components/ui/DynamicQrRenderer";

export interface StickerPrintConfig {
  itemName: string;
  uniqueCode: string;
  designId?: string;
  frameText?: string;
  subText?: string;
  dotColor?: string;
  gradientColor?: string;
  bgColor?: string;
  dotType?: any;
  centerIconType?: any;
  monogramText?: string;
  sizePreset?: "nano" | "standard" | "luggage" | "round" | "mix";
}

/**
 * Captures the entire designed sticker element as a high-resolution 300 DPI transparent die-cut PNG.
 */
export const downloadFullCardPng = async (
  element: HTMLElement | null,
  fileName: string = "kayipqr-sticker"
) => {
  if (!element || typeof window === "undefined") return;

  try {
    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Full card export error:", err);
  }
};

/**
 * Downloads a single custom QR code in high-res 1200px PNG format
 */
export const downloadSinglePng = async (
  qrInstance: any,
  fileName: string = "kayipqr-etiket"
) => {
  if (!qrInstance) return;
  qrInstance.download({
    name: fileName,
    extension: "png",
  });
};

/**
 * Downloads a single custom QR code in clean vector SVG format
 */
export const downloadSingleSvg = async (
  qrInstance: any,
  fileName: string = "kayipqr-vektor"
) => {
  if (!qrInstance) return;
  qrInstance.download({
    name: fileName,
    extension: "svg",
  });
};

/**
 * Helper: Load an SVG string into an HTMLImageElement
 */
function loadSvgAsImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Helper: Draw a rounded rectangle on a 2D canvas context
 */
function drawCanvasRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/**
 * Generates and downloads a print-ready 300 DPI Ultra-HD A4 Sheet PNG image (2480 x 3508 px)
 * so the user can save the entire A4 template as an image and print it anywhere without quality loss.
 */
export const downloadA4SheetPng = async (config: StickerPrintConfig) => {
  if (typeof window === "undefined") return;

  const origin = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
  const qrDataUrl = `${origin}/q/${config.uniqueCode}`;
  const preset = config.sizePreset || "mix";
  const resolved = resolveQrDesign({
    designId: config.designId || config.dotType,
    dotType: config.dotType,
    dotColor: config.dotColor,
    bgColor: config.bgColor,
  });

  // Render master SVG at 2000px native vector resolution so downsampling to any sticker slot is razor-sharp
  const svgStr = generateCustomQrSvgString({
    data: qrDataUrl,
    size: 2000,
    designId: resolved.preset.id,
    dotColor: resolved.fgColor,
    bgColor: resolved.bgColor,
    accentColor: resolved.accentColor,
    labelText: config.frameText ?? "BENİ TARA",
  });

  const qrImg = await loadSvgAsImage(svgStr);
  const imgAspect = (qrImg.height || 2000) / (qrImg.width || 2000);

  // True 300 DPI A4 canvas (2480 x 3508 px)
  const W = 2480;
  const H = 3508;
  const padX = 120;
  const contentW = W - padX * 2;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. White A4 Paper Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // 2. Top Header
  ctx.fillStyle = "#33302B";
  ctx.font = "800 50px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("KayıpQR — A4 Çoklu Kes & Yapıştır Etiket Şablonu (300 DPI)", W / 2, 126);

  ctx.fillStyle = "#666057";
  ctx.font = "600 32px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(
    `Eşya: ${config.itemName || "Kişisel Eşya"}   ·   Kod: #${config.uniqueCode}   ·   Tasarım: ${resolved.preset.name}`,
    W / 2,
    184
  );

  // Dashed Header Rule
  ctx.save();
  ctx.strokeStyle = "#D99B26";
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(padX, 226);
  ctx.lineTo(W - padX, 226);
  ctx.stroke();
  ctx.restore();

  // Helper to draw a grid of sticker slots
  const drawStickerGrid = (
    startY: number,
    cols: number,
    count: number,
    qrTargetWidth: number,
    rowHeight: number,
    sectionTitle?: string
  ): number => {
    let curY = startY;

    if (sectionTitle) {
      ctx.save();
      ctx.font = "800 28px system-ui, -apple-system, 'Segoe UI', sans-serif";
      const textMetrics = ctx.measureText(sectionTitle);
      const badgeW = textMetrics.width + 48;
      const badgeH = 54;
      ctx.fillStyle = "#FEF3C7";
      ctx.strokeStyle = "#FDE68A";
      ctx.lineWidth = 3;
      drawCanvasRoundedRect(ctx, padX, curY, badgeW, badgeH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#78350F";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(sectionTitle, padX + 24, curY + badgeH / 2 + 1);
      ctx.restore();
      curY += badgeH + 24;
    }

    const gapX = 36;
    const gapY = 36;
    const slotW = (contentW - gapX * (cols - 1)) / cols;
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const sx = padX + c * (slotW + gapX);
      const sy = curY + r * (rowHeight + gapY);

      // Dashed scissor cut guide box
      ctx.save();
      ctx.strokeStyle = "rgba(51, 48, 43, 0.32)";
      ctx.lineWidth = 3.5;
      ctx.setLineDash([15, 12]);
      drawCanvasRoundedRect(ctx, sx, sy, slotW, rowHeight, 38);
      ctx.stroke();
      ctx.restore();

      // Draw QR SVG centered inside the slot at crisp integer pixel bounds
      const maxQrH = rowHeight - 44;
      const maxQrW = slotW - 44;
      let drawW = Math.min(qrTargetWidth, maxQrW);
      let drawH = drawW * imgAspect;
      if (drawH > maxQrH) {
        drawH = maxQrH;
        drawW = drawH / imgAspect;
      }

      const qx = Math.round(sx + (slotW - drawW) / 2);
      const qy = Math.round(sy + (rowHeight - drawH) / 2);
      ctx.drawImage(qrImg, qx, qy, Math.round(drawW), Math.round(drawH));
    }

    return curY + rows * rowHeight + (rows - 1) * gapY;
  };

  let currentY = 268;

  if (preset === "mix") {
    currentY = drawStickerGrid(
      currentY,
      2,
      2,
      680,
      920,
      "🧳 BAVUL & SEYAHAT ETİKETLERİ (2 Adet · Büyük Boy)"
    );
    currentY = drawStickerGrid(
      currentY + 48,
      3,
      3,
      510,
      740,
      "💻 LAPTOP, TERMOS & EKİPMAN (3 Adet · Orta Boy)"
    );
    currentY = drawStickerGrid(
      currentY + 48,
      4,
      4,
      430,
      620,
      "🔑 ANAHTARLIK, CÜZDAN & KAMERA (4 Adet · Küçük Boy — Yüksek Netlik)"
    );
  } else if (preset === "nano") {
    drawStickerGrid(
      currentY + 14,
      4,
      12,
      450,
      860,
      "🔑 KÜÇÜK BOY ETİKETLER (12 Adet · Anahtarlık, Cüzdan & Kamera — 300 DPI)"
    );
  } else if (preset === "luggage") {
    drawStickerGrid(
      currentY + 14,
      2,
      4,
      840,
      1320,
      "🧳 BÜYÜK BOY ETİKETLER (4 Adet · Bavul, Çanta & Kargo — 300 DPI)"
    );
  } else if (preset === "round") {
    drawStickerGrid(
      currentY + 14,
      3,
      8,
      600,
      860,
      "⭕ MADALYON / ROZET ETİKETLER (8 Adet)"
    );
  } else {
    // standard (6 items)
    drawStickerGrid(
      currentY + 14,
      2,
      6,
      650,
      860,
      "💻 STANDART ORTA BOY ETİKETLER (6 Adet · Laptop, Tablet & Defter — 300 DPI)"
    );
  }

  // Footer Cut Guide Note
  const footerY = H - 150;
  ctx.save();
  ctx.fillStyle = "#F5EFE0";
  ctx.strokeStyle = "rgba(51, 48, 43, 0.18)";
  ctx.lineWidth = 3;
  drawCanvasRoundedRect(ctx, padX, footerY, contentW, 94, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#33302B";
  ctx.font = "700 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "✂️ Kesim Tavsiyesi: Bu 300 DPI A4 şablonunu yapışkanlı (sticker) veya normal A4 kağıda tam boyutlu (100%) bastırıp kesikli çizgilerden kesebilirsiniz.",
    W / 2,
    footerY + 47
  );
  ctx.restore();

  const safeName = (config.itemName || "etiket").replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]/g, "-");
  const pngUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `kayipqr-A4-sablon-${safeName}.png`;
  link.href = pngUrl;
  link.click();
};

/**
 * Generates and triggers browser print for a standard A4 sheet containing pure vector SVG QR stickers
 */
export const printA4Sheet = (config: StickerPrintConfig, customCount?: number) => {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Baskı penceresi engellendi. Tarayıcından açılır pencerelere izin verip tekrar dene.");
  }

  const origin = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
  const qrDataUrl = `${origin}/q/${config.uniqueCode}`;
  const preset = config.sizePreset || "mix";
  const resolved = resolveQrDesign({
    designId: config.designId || config.dotType,
    dotType: config.dotType,
    dotColor: config.dotColor,
    bgColor: config.bgColor,
  });

  // Always generate SVG at 1200px intrinsic vector resolution and scale via CSS width so print/PDF engines never rasterize at low DPI
  const makeSvg = (displayWidthPx: number, includeLabel: boolean = true) => {
    const rawSvg = generateCustomQrSvgString({
      data: qrDataUrl,
      size: 1200,
      designId: resolved.preset.id,
      dotColor: resolved.fgColor,
      bgColor: resolved.bgColor,
      accentColor: resolved.accentColor,
      labelText: includeLabel ? config.frameText ?? "BENİ TARA" : "",
    });
    return `<div style="width: ${displayWidthPx}px; max-width: 100%; display: flex; align-items: center; justify-content: center;">${rawSvg}</div>`;
  };

  let htmlBodyContent = "";

  if (preset === "mix") {
    htmlBodyContent = `
      <div class="mix-section">
        <div class="section-title">🧳 BAVUL & SEYAHAT ETİKETLERİ (2 Adet · Büyük Boy)</div>
        <div class="grid grid-2">
          ${[1, 2]
            .map(
              () => `
            <div class="sticker-slot">
              ${makeSvg(185, true)}
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="mix-section" style="margin-top: 12px;">
        <div class="section-title">💻 LAPTOP, TERMOS & EKİPMAN (3 Adet · Orta Boy)</div>
        <div class="grid grid-3">
          ${[1, 2, 3]
            .map(
              () => `
            <div class="sticker-slot">
              ${makeSvg(145, true)}
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="mix-section" style="margin-top: 12px;">
        <div class="section-title">🔑 ANAHTARLIK, CÜZDAN & KAMERA (4 Adet · Küçük Boy)</div>
        <div class="grid grid-4">
          ${[1, 2, 3, 4]
            .map(
              () => `
            <div class="sticker-slot">
              ${makeSvg(120, true)}
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  } else {
    let count = customCount || 6;
    let gridCols = "repeat(2, 1fr)";
    let qrPxSize = 185;

    if (preset === "nano") {
      count = customCount || 12;
      gridCols = "repeat(4, 1fr)";
      qrPxSize = 125;
    } else if (preset === "luggage") {
      count = customCount || 4;
      gridCols = "repeat(2, 1fr)";
      qrPxSize = 220;
    } else if (preset === "round") {
      count = customCount || 8;
      gridCols = "repeat(3, 1fr)";
      qrPxSize = 150;
    }

    htmlBodyContent = `
      <div class="grid" style="grid-template-columns: ${gridCols};">
        ${Array.from({ length: count })
          .map(
            () => `
          <div class="sticker-slot">
            ${makeSvg(qrPxSize, true)}
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeItemName = escapeHtml(config.itemName || "Kişisel Eşya");
  const safeUniqueCode = escapeHtml(config.uniqueCode || "");
  const safePresetName = escapeHtml(resolved.preset.name || "");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>KayıpQR A4 Baskı Şablonu - #${safeUniqueCode}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #ffffff;
          color: #33302B;
          padding: 6mm;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
          border-bottom: 2px dashed #D99B26;
          padding-bottom: 8px;
        }
        .header h1 {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .header p {
          font-size: 11px;
          color: #555;
          margin-top: 2px;
        }
        .section-title {
          font-size: 9.5px;
          font-weight: 800;
          color: #78350F;
          background: #FEF3C7;
          border: 1px solid #FDE68A;
          padding: 3px 8px;
          border-radius: 4px;
          margin-bottom: 8px;
          display: inline-block;
          text-transform: uppercase;
        }
        .grid {
          display: grid;
          gap: 10px;
        }
        .grid-2 { grid-template-columns: repeat(2, 1fr); }
        .grid-3 { grid-template-columns: repeat(3, 1fr); }
        .grid-4 { grid-template-columns: repeat(4, 1fr); }
        .grid-6 { grid-template-columns: repeat(6, 1fr); }

        .sticker-slot {
          border: 1.5px dashed rgba(51, 48, 43, 0.35);
          border-radius: 18px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          page-break-inside: avoid;
        }
        .sticker-slot svg {
          display: block;
          width: 100%;
          height: auto;
        }
        .instructions {
          margin-top: 14px;
          padding: 8px 12px;
          background: #F5EFE0;
          border: 1px solid rgba(51, 48, 43, 0.15);
          border-radius: 8px;
          font-size: 9.5px;
          line-height: 1.4;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 12px; text-align: center;">
        <button onclick="window.print()" style="background: #D99B26; color: #333; font-weight: bold; font-size: 14px; padding: 10px 24px; border-radius: 8px; border: 2px solid #333; cursor: pointer; box-shadow: 0 2px 0 #333;">
          🖨️ Sayfayı Yazdır (Renkli A4 Sticker Şablonu)
        </button>
      </div>

      <div class="header">
        <h1>KayıpQR — Özel Tasarım A4 Kes & Yapıştır Şablonu</h1>
        <p>Eşya: <strong>${safeItemName}</strong> · Kod: <strong>#${safeUniqueCode}</strong> · Tasarım: <strong>${safePresetName}</strong></p>
      </div>

      ${htmlBodyContent}

      <div class="instructions">
        <strong>✂️ Kesim & Kullanım Tavsiyeleri:</strong>
        <p style="margin-top: 2px;">
          1. Yazdırırken tarayıcı ayarlarından "Arka Plan Grafiklerini Yazdır (Background Graphics)" seçeneğinin açık olduğundan emin olun. 2. Stickerları dış hatlarından veya kesikli çizgilerden makasla kesin.
        </p>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
