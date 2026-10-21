import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Şifre Sıfırla");

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
