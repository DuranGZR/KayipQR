import { ImageResponse } from "next/og";

export const alt = "KayıpQR — Eşyan sana dönsün, numaran sende kalsın.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#FAF6EE", color: "#33302B", padding: 64, border: "16px solid #F2B63C" }}>
      <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>kayıpqr</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 68, fontWeight: 700, lineHeight: 1.15 }}><span>Eşyan sana dönsün,</span><span style={{ color: "#956211" }}>numaran sende kalsın.</span></div>
      <div style={{ display: "flex", fontSize: 27 }}>QR etiketini oluştur. İndir, bastır ve eşyana ekle.</div>
    </div>, size,
  );
}
