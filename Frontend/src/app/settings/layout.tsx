import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Hesap Ayarları");

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
