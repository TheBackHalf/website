import type { MetadataRoute } from "next";
import { publicLocalizedPaths } from "@/lib/i18n/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { locales } from "@/lib/i18n/config";
import { getSiteUrl } from "@/lib/seo/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of publicLocalizedPaths) {
      const localizedPath = getLocalizedPath(path, locale);
      entries.push({
        url: `${siteUrl}${localizedPath === "/" ? "" : localizedPath}`,
        lastModified: new Date(),
        changeFrequency: path === "/" ? "weekly" : "monthly",
        priority: path === "/" ? 1 : 0.7,
      });
    }
  }

  return entries;
}
