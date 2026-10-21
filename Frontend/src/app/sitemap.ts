import type { MetadataRoute } from "next";
import { guides } from "@/content/guides";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["/", "/rehber", "/privacy", "/terms", "/kvkk", "/cookies"].map(path => ({ url: `${SITE_URL}${path}` })),
    ...guides.map(guide => ({ url: `${SITE_URL}/rehber/${guide.slug}`, lastModified: `${guide.updated}T12:00:00+03:00` })),
  ];
}
