import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Mesajlarım");

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
