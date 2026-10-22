"use client";

import { qrColorError } from "@/lib/qrPolicy";
import React, { useMemo, useEffect } from "react";
import qrcode from "qrcode-generator";

export type CustomQrVariant =
  | "liquid_bullseye"
  | "organic_leaf"
  | "circle_medallion"
  | "center_core"
  | "kayipqr_gold"
  | "horizontal_wave"
  | "polka_rivet"
  | "vertical_stamp";

export interface CustomQrDesignPreset {
  id: string;
  name: string;
  badge: string;
  desc: string;
  variant: CustomQrVariant;
  fgColor: string;
  bgColor: string;
  accentColor?: string;
  shape: "square" | "circle";
  defaultText: string;
}

/**
 * 8 Structurally & Geometrically Distinct Minimal QR Designs
 * Every single design has a unique matrix geometry, unique finder eyes,
 * and a unique frame/typography architecture — even when set to the exact same colors.
 */
export const CUSTOM_QR_DESIGNS: CustomQrDesignPreset[] = [
  {
    id: "teal_liquid",
    name: "1. Okyanus Damlası",
    badge: "8-Yönlü Sıvı & Halka Göz",
    desc: "Hedef halkası gözler ve çapraz köprülerle su damlası gibi eriyerek birleşen akışkan matris",
    variant: "liquid_bullseye",
    fgColor: "#1E7E75",
    bgColor: "#F6F0E4",
    accentColor: "#1E7E75",
    shape: "square",
    defaultText: "BENİ TARA",
  },
  {
    id: "indigo_leaf",
    name: "2. Çivit Yaprak Labirent",
    badge: "Tek Sivri Göz & Labirent",
    desc: "Merkeze bakan su damlası gözler ve çaprazsız, sadece dik açıyla dönen yapboz labirent matrisi",
    variant: "organic_leaf",
    fgColor: "#43468A",
    bgColor: "#F6F0E4",
    accentColor: "#43468A",
    shape: "square",
    defaultText: "BENİ TARA",
  },
  {
    id: "orange_medallion",
    name: "3. Turuncu Madalyon",
    badge: "100% Dairesel Mühür",
    desc: "Kare çerçevesiz, tam daire rozet içinde kapsül oymalar ve dairesel yörünge noktaları",
    variant: "circle_medallion",
    fgColor: "#F6F0E4",
    bgColor: "#C84B0E",
    accentColor: "#F6F0E4",
    shape: "circle",
    defaultText: "BENİ TARA",
  },
  {
    id: "forest_core",
    name: "4. Orman Çekirdeği",
    badge: "Çift Sivri Yaprak & 4. Göz",
    desc: "Botanik yaprak köşe gözleri ve QR'ın tam kalbinde yer alan dördüncü odak halkası",
    variant: "center_core",
    fgColor: "#1D6F4A",
    bgColor: "#F6F0E4",
    accentColor: "#1D6F4A",
    shape: "square",
    defaultText: "BENİ TARA",
  },
  {
    id: "kayipqr_signature",
    name: "5. KayıpQR İmza",
    badge: "Pusula Yıldızı & Kapsül Bar",
    desc: "Çift çerçeveli kart, merkezde 4 köşeli pusula yıldızı ve altında dolu kapsül yazı barı",
    variant: "kayipqr_gold",
    fgColor: "#2C2925",
    bgColor: "#FAF5EA",
    accentColor: "#D99B26",
    shape: "square",
    defaultText: "BENİ TARA",
  },
  {
    id: "onyx_minimal",
    name: "6. Karbon Yatay Dalga",
    badge: "Yatay Bar & Vizör Köşe",
    desc: "Sadece yatayda birleşen ses dalgası kapsülleri, vizör köşe çentikleri ve çizgili tipografi",
    variant: "horizontal_wave",
    fgColor: "#18181B",
    bgColor: "#F6F0E4",
    accentColor: "#18181B",
    shape: "square",
    defaultText: "BENİ TARA",
  },
  {
    id: "stealth_medallion",
    name: "7. Gece Nokta Plaka",
    badge: "Saf Nokta & Perçinli Plaka",
    desc: "Hiçbir hücresi birleşmeyen saf dairesel nokta matrisi, 4 köşe perçini ve çerçeveli rozet yazı",
    variant: "polka_rivet",
    fgColor: "#F6F0E4",
    bgColor: "#18181B",
    accentColor: "#F6F0E4",
    shape: "square",
    defaultText: "BENİ TARA",
  },
  {
    id: "crimson_leaf",
    name: "8. Kiremit Dikey Pul",
    badge: "Dikey Akış & Elmas Göz",
    desc: "Sadece dikeyde akan yağmur damlası sütunları, 45° elmas göz çekirdekleri ve kesikli pul çerçevesi",
    variant: "vertical_stamp",
    fgColor: "#8F2424",
    bgColor: "#F6F0E4",
    accentColor: "#8F2424",
    shape: "square",
    defaultText: "BENİ TARA",
  },
];

export interface QrRendererProps {
  data: string;
  size?: number;
  designId?: string;
  variant?: CustomQrVariant;
  dotColor?: string;
  gradientColor?: string;
  gradientType?: "linear" | "radial";
  bgColor?: string;
  accentColor?: string;
  labelText?: string;
  dotType?: string;
  cornerSquareType?: string;
  cornerDotType?: string;
  cornerSquareColor?: string;
  cornerDotColor?: string;
  logoUrl?: string;
  monogramText?: string;
  centerIconType?: string;
  className?: string;
  onInstanceReady?: (instance: any) => void;
}

/**
 * Helper: Build a rounded rectangle SVG path with independent corner radii
 */
function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rTL: number,
  rTR: number,
  rBR: number,
  rBL: number
): string {
  const maxR = Math.min(w, h) / 2;
  const tl = Math.min(rTL, maxR);
  const tr = Math.min(rTR, maxR);
  const br = Math.min(rBR, maxR);
  const bl = Math.min(rBL, maxR);

  return [
    `M ${x + tl} ${y}`,
    `L ${x + w - tr} ${y}`,
    tr > 0 ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : `L ${x + w} ${y}`,
    `L ${x + w} ${y + h - br}`,
    br > 0 ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : `L ${x + w} ${y + h}`,
    `L ${x + bl} ${y + h}`,
    bl > 0 ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : `L ${x} ${y + h}`,
    `L ${x} ${y + tl}`,
    tl > 0 ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : `L ${x} ${y}`,
    "Z",
  ].join(" ");
}

/**
 * Helper: Build a 45°-rotated rounded diamond SVG path centered at (cx, cy)
 */
function roundedDiamondPath(
  cx: number,
  cy: number,
  halfDiag: number,
  roundFrac = 0.22
): string {
  const t = Math.max(0.02, Math.min(0.45, roundFrac));
  const v = [
    { x: cx, y: cy - halfDiag }, // Top
    { x: cx + halfDiag, y: cy }, // Right
    { x: cx, y: cy + halfDiag }, // Bottom
    { x: cx - halfDiag, y: cy }, // Left
  ];

  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, f: number) => ({
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
  });

  const p0Start = lerp(v[0], v[1], t);
  const segs: string[] = [`M ${p0Start.x.toFixed(3)} ${p0Start.y.toFixed(3)}`];

  for (let i = 0; i < 4; i++) {
    const curr = v[i];
    const next = v[(i + 1) % 4];
    const after = v[(i + 2) % 4];
    const pBeforeCorner = lerp(curr, next, 1 - t);
    const pAfterCorner = lerp(next, after, t);
    segs.push(
      `L ${pBeforeCorner.x.toFixed(3)} ${pBeforeCorner.y.toFixed(3)}`,
      `Q ${next.x.toFixed(3)} ${next.y.toFixed(3)} ${pAfterCorner.x.toFixed(3)} ${pAfterCorner.y.toFixed(3)}`
    );
  }
  segs.push("Z");
  return segs.join(" ");
}

/**
 * Helper: Build a 4-point compass starburst SVG path centered at (cx, cy)
 */
function starburstPath(cx: number, cy: number, outerR: number, waistR: number): string {
  return [
    `M ${cx} ${(cy - outerR).toFixed(3)}`,
    `Q ${(cx + waistR).toFixed(3)} ${(cy - waistR).toFixed(3)} ${(cx + outerR).toFixed(3)} ${cy}`,
    `Q ${(cx + waistR).toFixed(3)} ${(cy + waistR).toFixed(3)} ${cx} ${(cy + outerR).toFixed(3)}`,
    `Q ${(cx - waistR).toFixed(3)} ${(cy + waistR).toFixed(3)} ${(cx - outerR).toFixed(3)} ${cy}`,
    `Q ${(cx - waistR).toFixed(3)} ${(cy - waistR).toFixed(3)} ${cx} ${(cy - outerR).toFixed(3)}`,
    "Z",
  ].join(" ");
}

/**
 * Helper: Escape XML special chars for safe SVG text embedding
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Resolve preset from designId or legacy props
 */
export function resolveQrDesign(props: {
  designId?: string;
  variant?: CustomQrVariant;
  dotType?: string;
  dotColor?: string;
  bgColor?: string;
  accentColor?: string;
}): {
  preset: CustomQrDesignPreset;
  variant: CustomQrVariant;
  fgColor: string;
  bgColor: string;
  accentColor: string;
  shape: "square" | "circle";
} {
  const matchedPreset =
    CUSTOM_QR_DESIGNS.find((d) => d.id === props.designId) ||
    CUSTOM_QR_DESIGNS.find((d) => d.id === props.dotType) ||
    CUSTOM_QR_DESIGNS.find((d) => d.variant === props.variant) ||
    CUSTOM_QR_DESIGNS[0];

  const variant = props.variant || matchedPreset.variant;
  const fgColor =
    props.dotColor && props.dotColor !== "transparent"
      ? props.dotColor
      : matchedPreset.fgColor;
  const bgColor =
    props.bgColor && props.bgColor !== "transparent"
      ? props.bgColor
      : matchedPreset.bgColor;

  // If user customized fgColor away from preset default on KayıpQR Signature, adapt accentColor gracefully
  const isDefaultFg =
    fgColor.toLowerCase() === matchedPreset.fgColor.toLowerCase();
  const accentColor = isDefaultFg
    ? props.accentColor || matchedPreset.accentColor || fgColor
    : fgColor;
  const shape = variant === "circle_medallion" ? "circle" : "square";

  return {
    preset: matchedPreset,
    variant,
    fgColor,
    bgColor,
    accentColor,
    shape,
  };
}

/**
 * Generates a pure, self-contained, razor-sharp SVG string for any of the 8 custom QR designs.
 */
export function generateCustomQrSvgString(options: {
  data: string;
  size?: number;
  designId?: string;
  variant?: CustomQrVariant;
  dotType?: string;
  dotColor?: string;
  bgColor?: string;
  accentColor?: string;
  labelText?: string;
}): string {
  const { data, size = 240, labelText } = options;

  const { variant, fgColor, bgColor, accentColor, shape } = resolveQrDesign(options);
  const cleanLabel = (labelText ?? "").trim();

  // Use Error Correction 'L' across all variants so the module count (N) stays
  // low, chunky, and crystal-clear even on small nano/keychain stickers!
  // A 3x3 center emblem only covers 9 modules (~1.2%), well within 'L' (7% recovery).
  const hasCenterCore =
    variant === "center_core" ||
    variant === "kayipqr_gold" ||
    variant === "vertical_stamp";

  const qr = qrcode(0, "L");
  qr.addData(data || "https://kayipqr.com");
  qr.make();
  const N = qr.getModuleCount();

  const mid = Math.floor(N / 2);

  // Check if a module is inside one of the 3 corner 7x7 finder patterns
  const isFinderArea = (r: number, c: number): boolean => {
    if (r < 7 && c < 7) return true;
    if (r < 7 && c >= N - 7) return true;
    if (r >= N - 7 && c < 7) return true;
    return false;
  };

  // Check if a module is inside the optional 3x3 center core emblem
  const isCenterCoreArea = (r: number, c: number): boolean => {
    if (!hasCenterCore) return false;
    return Math.abs(r - mid) <= 1 && Math.abs(c - mid) <= 1;
  };

  const isDataDark = (r: number, c: number): boolean => {
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    if (isFinderArea(r, c)) return false;
    if (isCenterCoreArea(r, c)) return false;
    return qr.isDark(r, c);
  };

  // ============================================================================
  // DESIGN 3: CIRCULAR MEDALLION (`circle_medallion`)
  // ============================================================================
  if (shape === "circle") {
    const viewSize = 1000;
    const cx = 500;
    const cy = 500;
    const radius = 485;

    const qrBoxSize = cleanLabel ? 560 : 610;
    const cell = qrBoxSize / N;
    const startX = cx - qrBoxSize / 2;
    const startY = (cleanLabel ? cy - 32 : cy) - qrBoxSize / 2;

    const elements: string[] = [];

    // 1. Solid Medallion Circle Background
    elements.push(
      `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${bgColor}" />`
    );

    // 2. Render 3 Squircle Finder Rings
    const renderMedallionFinder = (r0: number, c0: number) => {
      const fx = startX + c0 * cell;
      const fy = startY + r0 * cell;
      const fw = 7 * cell;
      const outerR = 2.35 * cell;
      const innerCutR = 1.45 * cell;
      const dotR = 0.9 * cell;

      const outerPath = roundedRectPath(fx, fy, fw, fw, outerR, outerR, outerR, outerR);
      const cutPath = roundedRectPath(
        fx + cell,
        fy + cell,
        5 * cell,
        5 * cell,
        innerCutR,
        innerCutR,
        innerCutR,
        innerCutR
      );
      const centerPath = roundedRectPath(
        fx + 2 * cell,
        fy + 2 * cell,
        3 * cell,
        3 * cell,
        dotR,
        dotR,
        dotR,
        dotR
      );

      elements.push(
        `<path d="${outerPath} ${cutPath} ${centerPath}" fill="${fgColor}" fill-rule="evenodd" />`
      );
    };

    renderMedallionFinder(0, 0);
    renderMedallionFinder(0, N - 7);
    renderMedallionFinder(N - 7, 0);

    // 3. Spaced-Out Pill / Capsule & Dot Modules
    const pad = 0.09 * cell;
    const seamOverlap = 0.02 * cell;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!isDataDark(r, c)) continue;

        const T = isDataDark(r - 1, c);
        const B = isDataDark(r + 1, c);
        const L = isDataDark(r, c - 1);
        const R = isDataDark(r, c + 1);

        const x = startX + c * cell + (L ? -seamOverlap : pad);
        const y = startY + r * cell + (T ? -seamOverlap : pad);
        const w = cell - (L ? -seamOverlap : pad) - (R ? -seamOverlap : pad);
        const h = cell - (T ? -seamOverlap : pad) - (B ? -seamOverlap : pad);

        const rad = Math.min(w, h) / 2;
        const rTL = !T && !L ? rad : 0;
        const rTR = !T && !R ? rad : 0;
        const rBR = !B && !R ? rad : 0;
        const rBL = !B && !L ? rad : 0;

        elements.push(
          `<path d="${roundedRectPath(x, y, w, h, rTL, rTR, rBR, rBL)}" fill="${fgColor}" />`
        );
      }
    }

    // 4. Decorative Circular Perimeter Dots
    const quietMinX = startX - 1.55 * cell;
    const quietMaxX = startX + qrBoxSize + 1.55 * cell;
    const quietMinY = startY - 1.55 * cell;
    const quietMaxY = startY + qrBoxSize + 1.55 * cell;
    const maxCircleDist = radius - 1.35 * cell;
    const dotRadius = 0.37 * cell;

    for (let r = -5; r <= N + 4; r++) {
      for (let c = -5; c <= N + 4; c++) {
        const px = startX + (c + 0.5) * cell;
        const py = startY + (r + 0.5) * cell;

        if (px > quietMinX && px < quietMaxX && py > quietMinY && py < quietMaxY) {
          continue;
        }
        if (cleanLabel && py > startY + qrBoxSize + 0.8 * cell) {
          continue;
        }

        const dist = Math.hypot(px - cx, py - cy);
        if (dist <= maxCircleDist) {
          const hash = Math.abs((r * 37 + c * 53 + r * c * 7) % 11);
          if (hash < 6) {
            elements.push(
              `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${dotRadius.toFixed(1)}" fill="${fgColor}" />`
            );
          }
        }
      }
    }

    // 5. Single Minimalist Text Slot at the bottom of the Medallion
    if (cleanLabel) {
      const pillY = startY + qrBoxSize + 44;
      elements.push(
        `<text x="${cx}" y="${pillY}" text-anchor="middle" dominant-baseline="middle" fill="${fgColor}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="44" font-weight="900" letter-spacing="4">${escapeXml(
          cleanLabel.toLocaleUpperCase("tr-TR")
        )}</text>`
      );
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${size}" height="${size}">${elements.join(
      ""
    )}</svg>`;
  }

  // ============================================================================
  // CARD-BASED STRUCTURAL DESIGNS (DESIGNS 1, 2, 4, 5, 6, 7, 8)
  // ============================================================================
  const marginModules = 2.4;
  const bottomTextExtraModules = cleanLabel ? 3.5 : 0;
  const totalWidthModules = N + marginModules * 2;
  const totalHeightModules = N + marginModules * 2 + bottomTextExtraModules;

  const scale = 30; // 30 SVG units per module for ultra-crisp vector precision at any zoom
  const svgW = Math.round(totalWidthModules * scale);
  const svgH = Math.round(totalHeightModules * scale);
  const offsetX = marginModules;
  const offsetY = marginModules;

  const paths: string[] = [];
  const fillets: string[] = [];
  const finderElements: string[] = [];
  const frameDecorElements: string[] = [];

  // ----------------------------------------------------------------------------
  // 1. DATA MATRIX GEOMETRY BY VARIANT
  // ----------------------------------------------------------------------------
  if (variant === "polka_rivet") {
    // DESIGN 7: 100% Isolated Pure Polka Dots (Braun / Industrial Dot Matrix)
    const dotR = 0.43;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!isDataDark(r, c)) continue;
        const cx = offsetX + c + 0.5;
        const cy = offsetY + r + 0.5;
        finderElements.push(
          `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${dotR}" fill="${fgColor}" />`
        );
      }
    }
  } else if (variant === "horizontal_wave") {
    // DESIGN 6: Horizontal-Only Synthesizer Wave Pills (merges Left/Right only, vertical breathing gap)
    const padY = 0.12;
    const padX = 0.08;
    for (let r = 0; r < N; r++) {
      let c = 0;
      while (c < N) {
        if (!isDataDark(r, c)) {
          c++;
          continue;
        }
        let endC = c;
        while (endC + 1 < N && isDataDark(r, endC + 1)) {
          endC++;
        }
        const runLen = endC - c + 1;
        const x = offsetX + c + padX;
        const y = offsetY + r + padY;
        const w = runLen - padX * 2;
        const h = 1 - padY * 2;
        const rad = h / 2;
        paths.push(roundedRectPath(x, y, w, h, rad, rad, rad, rad));
        c = endC + 1;
      }
    }
  } else if (variant === "vertical_stamp") {
    // DESIGN 8: Vertical-Only Raindrop Streams (merges Top/Bottom only, horizontal breathing gap)
    const padX = 0.12;
    const padY = 0.08;
    for (let c = 0; c < N; c++) {
      let r = 0;
      while (r < N) {
        if (!isDataDark(r, c)) {
          r++;
          continue;
        }
        let endR = r;
        while (endR + 1 < N && isDataDark(endR + 1, c)) {
          endR++;
        }
        const runLen = endR - r + 1;
        const x = offsetX + c + padX;
        const y = offsetY + r + padY;
        const w = 1 - padX * 2;
        const h = runLen - padY * 2;
        const rad = w / 2;
        paths.push(roundedRectPath(x, y, w, h, rad, rad, rad, rad));
        r = endR + 1;
      }
    }
  } else {
    // DESIGNS 1, 2, 4, 5: Clean Orthogonal Connected Matrices (No skinny diagonal necks or pinholes!)
    // - Design 1 (`liquid_bullseye`) & Design 4 (`center_core`): Smooth Liquid with L-turn concave fillets
    // - Design 2 (`organic_leaf`): Crisp Rounded Labyrinth Corridors (spaced 0.04 breathing gap)
    // - Design 5 (`kayipqr_gold`): Soft Architectural Blocks
    const useConcaveFillets =
      variant === "liquid_bullseye" || variant === "center_core";
    const cellPad = variant === "organic_leaf" ? 0.04 : 0;
    const weld = 0.02; // Sub-pixel overlap on connected edges to eliminate anti-aliasing seams
    const cornerR = variant === "kayipqr_gold" ? 0.38 : 0.48;

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!isDataDark(r, c)) continue;

        const T = isDataDark(r - 1, c);
        const B = isDataDark(r + 1, c);
        const L = isDataDark(r, c - 1);
        const R = isDataDark(r, c + 1);

        const x = offsetX + c + (L ? -weld : cellPad);
        const y = offsetY + r + (T ? -weld : cellPad);
        const w = 1 - (L ? -weld : cellPad) - (R ? -weld : cellPad);
        const h = 1 - (T ? -weld : cellPad) - (B ? -weld : cellPad);

        const rTL = !T && !L ? cornerR : 0;
        const rTR = !T && !R ? cornerR : 0;
        const rBR = !B && !R ? cornerR : 0;
        const rBL = !B && !L ? cornerR : 0;

        paths.push(roundedRectPath(x, y, w, h, rTL, rTR, rBR, rBL));
      }
    }

    // Add clean concave L-turn fillets ONLY when exactly 3 orthogonal neighbors around a vertex are dark
    if (useConcaveFillets) {
      const f = 0.34;
      const eps = 0.03;
      for (let vr = 1; vr < N; vr++) {
        for (let vc = 1; vc < N; vc++) {
          const vx = offsetX + vc;
          const vy = offsetY + vr;

          const cTL = isDataDark(vr - 1, vc - 1);
          const cTR = isDataDark(vr - 1, vc);
          const cBL = isDataDark(vr, vc - 1);
          const cBR = isDataDark(vr, vc);

          const darkCount =
            (cTL ? 1 : 0) + (cTR ? 1 : 0) + (cBL ? 1 : 0) + (cBR ? 1 : 0);
          if (darkCount !== 3) continue;

          if (!cTR) {
            fillets.push(
              `M ${vx - eps} ${vy + eps} L ${vx - eps} ${vy - f} L ${vx} ${vy - f} A ${f} ${f} 0 0 0 ${vx + f} ${vy} L ${vx + f} ${vy + eps} Z`
            );
          } else if (!cBR) {
            fillets.push(
              `M ${vx - eps} ${vy - eps} L ${vx + f} ${vy - eps} L ${vx + f} ${vy} A ${f} ${f} 0 0 0 ${vx} ${vy + f} L ${vx - eps} ${vy + f} Z`
            );
          } else if (!cBL) {
            fillets.push(
              `M ${vx + eps} ${vy - eps} L ${vx + eps} ${vy + f} L ${vx} ${vy + f} A ${f} ${f} 0 0 0 ${vx - f} ${vy} L ${vx - f} ${vy - eps} Z`
            );
          } else if (!cTL) {
            fillets.push(
              `M ${vx + eps} ${vy + eps} L ${vx - f} ${vy + eps} L ${vx - f} ${vy} A ${f} ${f} 0 0 0 ${vx} ${vy - f} L ${vx + eps} ${vy - f} Z`
            );
          }
        }
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 2. CORNER FINDER EYES (3x 7x7) BY VARIANT
  // ----------------------------------------------------------------------------
  const drawFinderEye = (r0: number, c0: number, cornerPos: "TL" | "TR" | "BL") => {
    const fx = offsetX + c0;
    const fy = offsetY + r0;
    const cx = fx + 3.5;
    const cy = fy + 3.5;

    if (variant === "liquid_bullseye") {
      // DESIGN 1: Concentric Circular Bullseye Ring + Solid Dot
      finderElements.push(
        `<circle cx="${cx}" cy="${cy}" r="3" fill="none" stroke="${fgColor}" stroke-width="1.05" />`,
        `<circle cx="${cx}" cy="${cy}" r="1.55" fill="${fgColor}" />`
      );
      return;
    }

    if (variant === "polka_rivet") {
      // DESIGN 7: Precision Double-Ring Target Eye
      finderElements.push(
        `<circle cx="${cx}" cy="${cy}" r="3.02" fill="none" stroke="${fgColor}" stroke-width="0.96" />`,
        `<circle cx="${cx}" cy="${cy}" r="1.52" fill="${fgColor}" />`
      );
      return;
    }

    if (variant === "horizontal_wave") {
      // DESIGN 6: Stadium Squircle Outer Ring + Horizontal Capsule Pill Center
      const outerPath = `${roundedRectPath(fx, fy, 7, 7, 2.5, 2.5, 2.5, 2.5)} ${roundedRectPath(
        fx + 1,
        fy + 1,
        5,
        5,
        1.6,
        1.6,
        1.6,
        1.6
      )}`;
      // Keep the finder center three modules wide and tall at small print sizes.
      const innerPill = roundedRectPath(fx + 2, fy + 2, 3, 3, 0.65, 0.65, 0.65, 0.65);
      finderElements.push(
        `<path d="${outerPath}" fill="${fgColor}" fill-rule="evenodd" />`,
        `<path d="${innerPill}" fill="${fgColor}" />`
      );
      return;
    }

    if (variant === "vertical_stamp") {
      // DESIGN 8: Rounded Stamp Frame + 45°-Rotated Rounded Diamond Core (`◆`)
      const outerPath = `${roundedRectPath(fx, fy, 7, 7, 1.85, 1.85, 1.85, 1.85)} ${roundedRectPath(
        fx + 1,
        fy + 1,
        5,
        5,
        1.05,
        1.05,
        1.05,
        1.05
      )}`;
      const diamondCore = roundedDiamondPath(cx, cy, 1.95, 0.22);
      finderElements.push(
        `<path d="${outerPath}" fill="${fgColor}" fill-rule="evenodd" />`,
        `<path d="${diamondCore}" fill="${fgColor}" />`
      );
      return;
    }

    if (variant === "kayipqr_gold") {
      // DESIGN 5: Architectural Inward-Notched Squircle Ring + Circular Gold/Accent Core
      const rRoundO = 2.2;
      const rPinchO = 0.45;
      const rRoundC = 1.35;
      const rPinchC = 0.2;

      const tlO = rRoundO;
      const trO = cornerPos === "BL" ? rPinchO : rRoundO;
      const brO = cornerPos === "TL" ? rPinchO : rRoundO;
      const blO = cornerPos === "TR" ? rPinchO : rRoundO;

      const tlC = rRoundC;
      const trC = cornerPos === "BL" ? rPinchC : rRoundC;
      const brC = cornerPos === "TL" ? rPinchC : rRoundC;
      const blC = cornerPos === "TR" ? rPinchC : rRoundC;

      const outerRingPath = `${roundedRectPath(fx, fy, 7, 7, tlO, trO, brO, blO)} ${roundedRectPath(
        fx + 1,
        fy + 1,
        5,
        5,
        tlC,
        trC,
        brC,
        blC
      )}`;

      finderElements.push(
        `<path d="${outerRingPath}" fill="${fgColor}" fill-rule="evenodd" />`,
        `<circle cx="${cx}" cy="${cy}" r="1.55" fill="${accentColor}" />`
      );
      return;
    }

    if (variant === "center_core") {
      // DESIGN 4: True Botanical Leaf Eye (2 opposite diagonal corners sharp, 2 deeply rounded)
      const rRoundO = 2.65;
      const rSharpO = 0.35;
      const rRoundC = 1.7;
      const rSharpC = 0.2;
      const rRoundI = 1.15;
      const rSharpI = 0.18;

      const useMainDiag = cornerPos === "TL";
      const tlO = useMainDiag ? rSharpO : rRoundO;
      const brO = useMainDiag ? rSharpO : rRoundO;
      const trO = useMainDiag ? rRoundO : rSharpO;
      const blO = useMainDiag ? rRoundO : rSharpO;

      const tlC = useMainDiag ? rSharpC : rRoundC;
      const brC = useMainDiag ? rSharpC : rRoundC;
      const trC = useMainDiag ? rRoundC : rSharpC;
      const blC = useMainDiag ? rRoundC : rSharpC;

      const tlI = useMainDiag ? rSharpI : rRoundI;
      const brI = useMainDiag ? rSharpI : rRoundI;
      const trI = useMainDiag ? rRoundI : rSharpI;
      const blI = useMainDiag ? rRoundI : rSharpI;

      const outerRingPath = `${roundedRectPath(fx, fy, 7, 7, tlO, trO, brO, blO)} ${roundedRectPath(
        fx + 1,
        fy + 1,
        5,
        5,
        tlC,
        trC,
        brC,
        blC
      )}`;
      const innerLeafPath = roundedRectPath(fx + 2, fy + 2, 3, 3, tlI, trI, brI, blI);

      finderElements.push(
        `<path d="${outerRingPath}" fill="${fgColor}" fill-rule="evenodd" />`,
        `<path d="${innerLeafPath}" fill="${fgColor}" />`
      );
      return;
    }

    // DESIGN 2 (`organic_leaf`): 1-Corner-Sharp Inward Teardrop Eye
    const rRoundOuter = 2.45;
    const rSharpOuter = 0.38;
    const rRoundCut = 1.55;
    const rSharpCut = 0.2;
    const rRoundInner = 1.05;
    const rSharpInner = 0.18;

    const tlO = rRoundOuter;
    const trO = cornerPos === "BL" ? rSharpOuter : rRoundOuter;
    const brO = cornerPos === "TL" ? rSharpOuter : rRoundOuter;
    const blO = cornerPos === "TR" ? rSharpOuter : rRoundOuter;

    const tlC = rRoundCut;
    const trC = cornerPos === "BL" ? rSharpCut : rRoundCut;
    const brC = cornerPos === "TL" ? rSharpCut : rRoundCut;
    const blC = cornerPos === "TR" ? rSharpCut : rRoundCut;

    const tlI = rRoundInner;
    const trI = cornerPos === "BL" ? rSharpInner : rRoundInner;
    const brI = cornerPos === "TL" ? rSharpInner : rRoundInner;
    const blI = cornerPos === "TR" ? rSharpInner : rRoundInner;

    const outerRingPath = `${roundedRectPath(fx, fy, 7, 7, tlO, trO, brO, blO)} ${roundedRectPath(
      fx + 1,
      fy + 1,
      5,
      5,
      tlC,
      trC,
      brC,
      blC
    )}`;
    const innerDotPath = roundedRectPath(fx + 2, fy + 2, 3, 3, tlI, trI, brI, blI);

    finderElements.push(
      `<path d="${outerRingPath}" fill="${fgColor}" fill-rule="evenodd" />`,
      `<path d="${innerDotPath}" fill="${fgColor}" />`
    );
  };

  drawFinderEye(0, 0, "TL");
  drawFinderEye(0, N - 7, "TR");
  drawFinderEye(N - 7, 0, "BL");

  // ----------------------------------------------------------------------------
  // 3. CENTER FOCAL ARCHITECTURE (3x3 Clear Zone -> Crisp & Scannable with EC 'L')
  // ----------------------------------------------------------------------------
  if (variant === "center_core") {
    // DESIGN 4: 4th Concentric Leaf Core Eye (3.2x3.2 centered at mid+0.5)
    const cfx = offsetX + mid - 1.1;
    const cfy = offsetY + mid - 1.1;
    const coreOuter = `${roundedRectPath(cfx, cfy, 3.2, 3.2, 0.25, 1.25, 0.25, 1.25)} ${roundedRectPath(
      cfx + 0.58,
      cfy + 0.58,
      2.04,
      2.04,
      0.15,
      0.75,
      0.15,
      0.75
    )}`;
    const coreInner = roundedRectPath(cfx + 1.05, cfy + 1.05, 1.1, 1.1, 0.1, 0.42, 0.1, 0.42);

    finderElements.push(
      `<path d="${coreOuter}" fill="${fgColor}" fill-rule="evenodd" />`,
      `<path d="${coreInner}" fill="${fgColor}" />`
    );
  } else if (variant === "kayipqr_gold") {
    // DESIGN 5: Center Compass Ring + 4-Point Starburst Emblem (`✦`)
    const ccx = offsetX + mid + 0.5;
    const ccy = offsetY + mid + 0.5;
    const starPath = starburstPath(ccx, ccy, 1.15, 0.32);
    finderElements.push(
      `<circle cx="${ccx}" cy="${ccy}" r="1.58" fill="none" stroke="${fgColor}" stroke-width="0.52" />`,
      `<path d="${starPath}" fill="${accentColor}" />`
    );
  } else if (variant === "vertical_stamp") {
    // DESIGN 8: Center Rotated Diamond Shield (`◇` + `◆`)
    const ccx = offsetX + mid + 0.5;
    const ccy = offsetY + mid + 0.5;
    const outerDiamond = roundedDiamondPath(ccx, ccy, 1.75, 0.18);
    const cutDiamond = roundedDiamondPath(ccx, ccy, 1.12, 0.18);
    const innerDiamond = roundedDiamondPath(ccx, ccy, 0.68, 0.2);
    finderElements.push(
      `<path d="${outerDiamond} ${cutDiamond}" fill="${fgColor}" fill-rule="evenodd" />`,
      `<path d="${innerDiamond}" fill="${fgColor}" />`
    );
  }

  // ----------------------------------------------------------------------------
  // 4. PERIMETER FRAME & SILHOUETTE ARCHITECTURE BY VARIANT
  // ----------------------------------------------------------------------------
  if (variant === "kayipqr_gold") {
    // DESIGN 5: Architectural Double-Framed Inset Border
    const inset = 0.75;
    frameDecorElements.push(
      `<rect x="${inset}" y="${inset}" width="${(totalWidthModules - inset * 2).toFixed(
        2
      )}" height="${(totalHeightModules - inset * 2).toFixed(
        2
      )}" rx="1.65" fill="none" stroke="${fgColor}" stroke-width="0.22" opacity="0.35" />`
    );
  } else if (variant === "horizontal_wave") {
    // DESIGN 6: Minimalist Camera Viewfinder Corner Brackets (`⌜ ⌝ ⌞ ⌟`)
    const m = 0.85;
    const len = 2.2;
    const w = totalWidthModules;
    const h = totalHeightModules;
    const bracketStroke = `fill="none" stroke="${fgColor}" stroke-width="0.32" stroke-linecap="round" opacity="0.55"`;
    frameDecorElements.push(
      `<path d="M ${m} ${m + len} L ${m} ${m + 0.6} A 0.6 0.6 0 0 1 ${m + 0.6} ${m} L ${m + len} ${m}" ${bracketStroke} />`,
      `<path d="M ${w - m - len} ${m} L ${w - m - 0.6} ${m} A 0.6 0.6 0 0 1 ${w - m} ${m + 0.6} L ${w - m} ${m + len}" ${bracketStroke} />`,
      `<path d="M ${m} ${h - m - len} L ${m} ${h - m - 0.6} A 0.6 0.6 0 0 0 ${m + 0.6} ${h - m} L ${m + len} ${h - m}" ${bracketStroke} />`,
      `<path d="M ${w - m - len} ${h - m} L ${w - m - 0.6} ${h - m} A 0.6 0.6 0 0 0 ${w - m} ${h - m - 0.6} L ${w - m} ${h - m - len}" ${bracketStroke} />`
    );
  } else if (variant === "polka_rivet") {
    // DESIGN 7: 4 Industrial Plate Corner Rivet Dots (`•`)
    const rOff = 1.25;
    const w = totalWidthModules;
    const h = totalHeightModules;
    const rivR = 0.34;
    frameDecorElements.push(
      `<circle cx="${rOff}" cy="${rOff}" r="${rivR}" fill="${fgColor}" opacity="0.5" />`,
      `<circle cx="${(w - rOff).toFixed(2)}" cy="${rOff}" r="${rivR}" fill="${fgColor}" opacity="0.5" />`,
      `<circle cx="${rOff}" cy="${(h - rOff).toFixed(2)}" r="${rivR}" fill="${fgColor}" opacity="0.5" />`,
      `<circle cx="${(w - rOff).toFixed(2)}" cy="${(h - rOff).toFixed(2)}" r="${rivR}" fill="${fgColor}" opacity="0.5" />`
    );
  } else if (variant === "vertical_stamp") {
    // DESIGN 8: Boutique Perforated/Dashed Stamp Inset Frame
    const inset = 0.8;
    frameDecorElements.push(
      `<rect x="${inset}" y="${inset}" width="${(totalWidthModules - inset * 2).toFixed(
        2
      )}" height="${(totalHeightModules - inset * 2).toFixed(
        2
      )}" rx="1.4" fill="none" stroke="${fgColor}" stroke-width="0.24" stroke-dasharray="0.65 0.55" opacity="0.45" />`
    );
  }

  // ----------------------------------------------------------------------------
  // 5. BOTTOM SINGLE-LINE LABEL ARCHITECTURE BY VARIANT
  // ----------------------------------------------------------------------------
  let bottomTextElement = "";
  if (cleanLabel) {
    const upperText = escapeXml(cleanLabel.toLocaleUpperCase("tr-TR"));
    const textCenterX = totalWidthModules / 2;
    const textCenterY = offsetY + N + 2.05;

    if (variant === "kayipqr_gold") {
      // DESIGN 5: Solid Filled Capsule Pill Bar (`• BENİ TARA •`)
      const pillW = Math.min(
        totalWidthModules - 4.4,
        Math.max(12.5, cleanLabel.length * 0.95 + 4.8)
      );
      const pillH = 2.35;
      const pillX = textCenterX - pillW / 2;
      const pillY = textCenterY - pillH / 2;
      bottomTextElement = `
        <rect x="${pillX.toFixed(2)}" y="${pillY.toFixed(2)}" width="${pillW.toFixed(
        2
      )}" height="${pillH}" rx="${(pillH / 2).toFixed(2)}" fill="${fgColor}" />
        <circle cx="${(pillX + 1.25).toFixed(2)}" cy="${textCenterY.toFixed(
        2
      )}" r="0.32" fill="${accentColor}" />
        <circle cx="${(pillX + pillW - 1.25).toFixed(2)}" cy="${textCenterY.toFixed(
        2
      )}" r="0.32" fill="${accentColor}" />
        <text x="${textCenterX}" y="${(textCenterY + 0.08).toFixed(
        2
      )}" text-anchor="middle" dominant-baseline="middle" fill="${bgColor}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="1.22" font-weight="900" letter-spacing="0.14">${upperText}</text>
      `;
    } else if (variant === "polka_rivet") {
      // DESIGN 7: Outlined Capsule Pill Badge
      const pillW = Math.min(
        totalWidthModules - 5.2,
        Math.max(11.5, cleanLabel.length * 0.95 + 4.2)
      );
      const pillH = 2.25;
      const pillX = textCenterX - pillW / 2;
      const pillY = textCenterY - pillH / 2;
      bottomTextElement = `
        <rect x="${pillX.toFixed(2)}" y="${pillY.toFixed(2)}" width="${pillW.toFixed(
        2
      )}" height="${pillH}" rx="${(pillH / 2).toFixed(
        2
      )}" fill="none" stroke="${fgColor}" stroke-width="0.28" opacity="0.85" />
        <text x="${textCenterX}" y="${(textCenterY + 0.08).toFixed(
        2
      )}" text-anchor="middle" dominant-baseline="middle" fill="${fgColor}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="1.22" font-weight="900" letter-spacing="0.14">${upperText}</text>
      `;
    } else if (variant === "horizontal_wave") {
      // DESIGN 6: Flanked Precision Tech Hairlines (`─── BENİ TARA ───`)
      const textHalfSpan = Math.min(
        (totalWidthModules - 5) / 2,
        Math.max(4.5, cleanLabel.length * 0.48 + 1.2)
      );
      const lineStartLeft = offsetX + 0.5;
      const lineEndLeft = Math.max(lineStartLeft + 1, textCenterX - textHalfSpan);
      const lineStartRight = Math.min(
        totalWidthModules - offsetX - 0.5,
        textCenterX + textHalfSpan
      );
      const lineEndRight = totalWidthModules - offsetX - 0.5;

      bottomTextElement = `
        <line x1="${lineStartLeft.toFixed(2)}" y1="${textCenterY.toFixed(
        2
      )}" x2="${lineEndLeft.toFixed(2)}" y2="${textCenterY.toFixed(
        2
      )}" stroke="${fgColor}" stroke-width="0.28" stroke-linecap="round" opacity="0.65" />
        <line x1="${lineStartRight.toFixed(2)}" y1="${textCenterY.toFixed(
        2
      )}" x2="${lineEndRight.toFixed(2)}" y2="${textCenterY.toFixed(
        2
      )}" stroke="${fgColor}" stroke-width="0.28" stroke-linecap="round" opacity="0.65" />
        <text x="${textCenterX}" y="${(textCenterY + 0.08).toFixed(
        2
      )}" text-anchor="middle" dominant-baseline="middle" fill="${fgColor}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="1.26" font-weight="900" letter-spacing="0.15">${upperText}</text>
      `;
    } else if (variant === "vertical_stamp") {
      // DESIGN 8: Boutique Stamp Divider Line + Diamond Flanked Text (`◆ BENİ TARA ◆`)
      const ruleY = offsetY + N + 0.72;
      const dSpan = Math.min(
        (totalWidthModules - 4.5) / 2,
        Math.max(4.8, cleanLabel.length * 0.5 + 1.35)
      );
      const leftDiamond = roundedDiamondPath(textCenterX - dSpan, textCenterY, 0.36, 0.15);
      const rightDiamond = roundedDiamondPath(textCenterX + dSpan, textCenterY, 0.36, 0.15);
      bottomTextElement = `
        <line x1="${offsetX.toFixed(2)}" y1="${ruleY.toFixed(2)}" x2="${(
        totalWidthModules - offsetX
      ).toFixed(
        2
      )}" y2="${ruleY.toFixed(
        2
      )}" stroke="${fgColor}" stroke-width="0.22" stroke-dasharray="0.5 0.45" opacity="0.45" />
        <path d="${leftDiamond} ${rightDiamond}" fill="${fgColor}" />
        <text x="${textCenterX}" y="${(textCenterY + 0.1).toFixed(
        2
      )}" text-anchor="middle" dominant-baseline="middle" fill="${fgColor}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="1.26" font-weight="900" letter-spacing="0.15">${upperText}</text>
      `;
    } else {
      // DESIGNS 1, 2, 4: Pure Minimalist Floating Typography
      bottomTextElement = `
        <text x="${textCenterX}" y="${(textCenterY + 0.08).toFixed(
        2
      )}" text-anchor="middle" dominant-baseline="middle" fill="${fgColor}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="1.34" font-weight="900" letter-spacing="0.15">${upperText}</text>
      `;
    }
  }

  const cardRadius = (2.2 * scale).toFixed(0);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${size}" height="${Math.round(
      (size * svgH) / svgW
    )}">`,
    `<rect width="${svgW}" height="${svgH}" rx="${cardRadius}" fill="${bgColor}" />`,
    `<g transform="scale(${scale})" shape-rendering="geometricPrecision">`,
    frameDecorElements.join(""),
    paths.length > 0 || fillets.length > 0
      ? `<path d="${paths.join(" ")} ${fillets.join(" ")}" fill="${fgColor}" />`
      : "",
    finderElements.join(""),
    bottomTextElement,
    `</g>`,
    `</svg>`,
  ].join("");
}

export const DynamicQrRenderer: React.FC<QrRendererProps> = ({
  data,
  size = 220,
  designId,
  variant,
  dotColor,
  bgColor,
  accentColor,
  labelText,
  dotType,
  className = "",
  onInstanceReady,
}) => {
  const svgMarkup = useMemo(() => {
    return generateCustomQrSvgString({
      data,
      size,
      designId,
      variant,
      dotType,
      dotColor,
      bgColor,
      accentColor,
      labelText,
    });
  }, [data, size, designId, variant, dotType, dotColor, bgColor, accentColor, labelText]);

  useEffect(() => {
    if (!onInstanceReady) return;
    onInstanceReady({
      getSvgString: () => svgMarkup,
      download: ({ name = "kayipqr", extension = "svg" }: { name?: string; extension?: string }) => {
        if (typeof window === "undefined") return;
        const colors = resolveQrDesign({ designId, variant, dotType, dotColor, bgColor });
        const error = qrColorError(colors.fgColor, colors.bgColor);
        if (error) throw new Error(error);
        const hiResSvg = generateCustomQrSvgString({
          data,
          size: 2000,
          designId,
          variant,
          dotType,
          dotColor,
          bgColor,
          accentColor,
          labelText,
        });
        if (extension === "svg") {
          const blob = new Blob([hiResSvg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${name}.svg`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const img = new Image();
          const svgBlob = new Blob([hiResSvg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const scalePx = 2000;
            const aspect = (img.height || 2000) / (img.width || 2000);
            canvas.width = scalePx;
            canvas.height = Math.round(scalePx * aspect);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const pngUrl = canvas.toDataURL("image/png");
              const a = document.createElement("a");
              a.href = pngUrl;
              a.download = `${name}.png`;
              a.click();
            }
            URL.revokeObjectURL(url);
          };
          img.src = url;
        }
      },
    });
  }, [svgMarkup, onInstanceReady, data, designId, variant, dotType, dotColor, bgColor, accentColor, labelText]);

  return (
    <div
      className={`inline-flex items-center justify-center transition-all select-none ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};
