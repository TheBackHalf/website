/**
 * Email-safe brand tokens for participant templates (Row 145).
 * Hex only — oklch/CSS variables are unreliable in mail clients.
 */

import { getSiteUrl } from "@/lib/auth/config";

export const EMAIL_BRAND = {
  productName: "The Back Half",
  fromName: "The Back Half",
  supportFromName: "The Back Half Support",
  night: "#1C1428",
  dusk: "#2A1B38",
  purple: "#6B3A8C",
  champagne: "#E6D4A8",
  cream: "#FAF6EC",
  ink: "#2A1F38",
  muted: "#6E6278",
  white: "#FFFFFF",
  logoPath: "/images/brand/back-half-butterfly-logo.png",
  logoAlt: "The Back Half",
} as const;

export function emailLogoUrl(): string {
  return `${getSiteUrl()}${EMAIL_BRAND.logoPath}`;
}

export function emailAbsoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}
