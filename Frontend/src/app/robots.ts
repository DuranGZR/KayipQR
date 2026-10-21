import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kayipqr.com";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/privacy", "/terms", "/kvkk", "/cookies", "/q/"],
      disallow: ["/dashboard/", "/messages/", "/settings/", "/studio/", "/api/", "/auth/", "/verify-email", "/reset-password"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
