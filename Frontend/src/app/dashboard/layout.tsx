import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Eşyalarım");

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
