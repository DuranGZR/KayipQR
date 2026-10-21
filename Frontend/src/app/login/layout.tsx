import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Giriş Yap");

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
