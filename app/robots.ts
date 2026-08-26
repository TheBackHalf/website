import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-config";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/architect/",
        "/es/architect/",
        "/_internal/",
        "/entrance-review",
        "/ops/",
        "/es/ops/",
        "/blueprint/",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
