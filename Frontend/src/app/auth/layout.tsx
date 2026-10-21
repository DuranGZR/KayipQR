import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Güvenli Giriş");

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
