import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("QR Tasarım Stüdyosu");

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
