import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Eşya Sahibiyle İletişim");

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
