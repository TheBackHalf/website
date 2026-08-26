/**
 * Centralized site URL for canonical URLs, sitemap, robots, and Open Graph.
 *
 * SUBSTITUTION POINT — set `NEXT_PUBLIC_SITE_URL` to the final production domain
 * (e.g. https://www.thebackhalf.com) before launch. No trailing slash.
 *
 * On Vercel preview deployments, `VERCEL_URL` is used when the env var is unset
 * so production builds do not emit localhost URLs.
 */

const PLACEHOLDER_SITE_URL = "https://example.com";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return PLACEHOLDER_SITE_URL;
}

/** SUBSTITUTION POINT — replace with approved production social preview artwork. */
export const SOCIAL_PREVIEW_IMAGE = {
  /** Temporary fallback — existing atmosphere asset, not approved brand OG art. */
  temporary: true,
  path: "/images/hero-atmosphere.jpg",
  width: 1200,
  height: 630,
  alt: "The Back Half",
} as const;

/** SUBSTITUTION POINT — replace with approved favicon when available. */
export const SITE_ICON = {
  temporary: true,
  path: "/seo/favicon-temporary.svg",
} as const;

export const siteIdentity = {
  name: "The Back Half",
  legalName: "The Back Half",
  locale: "en_US",
} as const;

export function getAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function getSocialPreviewImageUrl(): string {
  return getAbsoluteUrl(SOCIAL_PREVIEW_IMAGE.path);
}

export function getSiteIconUrl(): string {
  return getAbsoluteUrl(SITE_ICON.path);
}
