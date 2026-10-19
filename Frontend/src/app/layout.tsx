import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CookieConsent } from "@/components/ui/CookieConsent";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FAF6EE" };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://kayipqr.com"),
  title: {
    default: "KayıpQR — Eşyaların için QR etiket",
    template: "%s | KayıpQR",
  },
  description:
    "Eşyana QR etiketi ekle. Bulan kişi telefon numaranı görmeden sana mesaj göndersin. Etiketini ücretsiz oluştur, indir ve bastır.",
  keywords: [
    "kayıp eşya",
    "QR kod",
    "kayıp QR",
    "kayıp anahtar",
    "kayıp cüzdan",
    "kayıp valiz etiketi",
    "anonim iletişim",
    "evcil hayvan tasması QR",
  ],
  authors: [{ name: "KayıpQR" }],
  creator: "KayıpQR",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://kayipqr.com",
    siteName: "KayıpQR",
    title: "KayıpQR — Eşyaların için QR etiket",
    description:
      "Eşyana QR etiketi ekle. Bulan kişi telefon numaranı görmeden sana mesaj göndersin. Etiketini ücretsiz oluştur, indir ve bastır.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KayıpQR — Eşyaların için QR etiket",
    description:
      "Eşyana QR etiketi ekle. Bulan kişi telefon numaranı görmeden sana mesaj göndersin. Etiketini ücretsiz oluştur, indir ve bastır.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${jakarta.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#FAF6EE] text-[#33302B] selection:bg-gold selection:text-ink">
        <ToastProvider>
          {children}
          <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  );
}
