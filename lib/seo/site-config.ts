/**
 * Canonical public origin for sitemap, robots, Open Graph, and JSON-LD.
 *
 * Always emit https://www.thebackhalf.org (or a non-ephemeral NEXT_PUBLIC_SITE_URL).
 * Never emit *.vercel.app or localhost in customer-facing SEO URLs.
 * Runtime OAuth/Stripe redirects use lib/auth/config getSiteUrl() so they can
 * still reach the current deploy host while Row 75 canonical DNS is pending.
 */

const CANONICAL_PUBLIC_ORIGIN = "https://www.thebackhalf.org";

function isEphemeralDeployHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".vercel.app") || host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

export function getCanonicalPublicOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured && !isEphemeralDeployHost(configured)) {
    return configured;
  }
  return CANONICAL_PUBLIC_ORIGIN;
}

export function getSiteUrl(): string {
  return getCanonicalPublicOrigin();
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
