import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KayıpQR — Güvenli ve Anonim Kayıp Eşya İletişim Ağı",
    short_name: "KayıpQR",
    description:
      "Kişisel telefon ve e-posta bilgilerinizi paylaşmadan, kaybolan eşyalarınızı bulan kişilerin size güvenle ulaşmasını sağlayan QR tabanlı iletişim platformu.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF6EE",
    theme_color: "#F2B63C",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
