import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";

/** Internal path without locale prefix (e.g. /journey, /legal/privacy-policy). */
export type LocalizedPath =
  | "/"
  | "/journey"
  | "/lumina"
  | "/contact"
  | "/support"
  | "/register"
  | "/register/confirmation"
  | "/verify-email"
  | "/login"
  | "/forgot-password"
  | "/reset-password"
  | "/checkout"
  | `/checkout/${string}`
  | "/eligibility"
  | "/not-eligible"
  | "/architect/dashboard"
  | "/architect/onboarding"
  | `/architect/onboarding/${string}`
  | `/legal/${string}`;

export function stripLocalePrefix(pathname: string): LocalizedPath {
  const stripped = pathname.replace(/^\/es(?=\/|$)/, "") || "/";
  return stripped as LocalizedPath;
}

export function getLocalizedPath(path: LocalizedPath, locale: Locale): string {
  if (locale === defaultLocale) {
    return path;
  }

  return path === "/" ? "/es" : `/es${path}`;
}

export function getAlternateLocalizedPaths(path: LocalizedPath) {
  return {
    en: getLocalizedPath(path, "en"),
    es: getLocalizedPath(path, "es"),
  } as const;
}

export function getLocaleFromPathname(pathname: string): Locale {
  return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

export const publicLocalizedPaths: readonly LocalizedPath[] = [
  "/",
  "/journey",
  "/lumina",
  "/contact",
  "/support",
  "/register",
  "/register/confirmation",
  "/verify-email",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/checkout",
  "/legal/privacy-policy",
  "/legal/terms-of-use",
  "/legal/participant-agreement",
  "/legal/membership-agreement",
  "/legal/ai-disclosure",
];