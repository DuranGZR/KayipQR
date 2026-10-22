import type { Metadata } from "next";

// Deployments may override the public origin (for example, local SEO checks).
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://kayipqr.com").origin;
export const SITE_DESCRIPTION = "Eşyana QR etiketi ekle. Bulan kişi telefon numaranı görmeden sana mesaj göndersin. Etiketini ücretsiz oluştur, indir ve bastır.";

export function publicMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      type: "website", locale: "tr_TR", siteName: "KayıpQR",
      title, description, url: `${SITE_URL}${path}`,
      images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: "KayıpQR — Eşyan sana dönsün, numaran sende kalsın." }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}

export function privateMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}
