import type { Locale } from "@/lib/i18n/config";
import type { AgeEligibilityStatus } from "@/lib/eligibility/policy";

function stripLocalePrefix(pathname: string): string {
  if (pathname === "/es") {
    return "/";
  }
  if (pathname.startsWith("/es/")) {
    return pathname.slice(3) || "/";
  }
  return pathname;
}

function localeFromPathname(pathname: string): Locale {
  return pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
}

function startsWithPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAgeEligibilityExemptPath(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return (
    path === "/eligibility" ||
    path === "/not-eligible" ||
    path.startsWith("/_internal") ||
    startsWithPath(path, "/ops") ||
    startsWithPath(path, "/api/ops") ||
    startsWithPath(path, "/api/admin") ||
    startsWithPath(path, "/api/analytics") ||
    startsWithPath(path, "/api/eligibility") ||
    startsWithPath(path, "/api/launch-dashboard") ||
    path === "/login" ||
    startsWithPath(path, "/login") ||
    startsWithPath(path, "/forgot-password") ||
    startsWithPath(path, "/reset-password") ||
    startsWithPath(path, "/verify-email") ||
    startsWithPath(path, "/legal")
  );
}

/** Ineligible visitors cannot enter these participant/purchase/account paths. */
export function isIneligibleBlockedPath(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return (
    startsWithPath(path, "/register") ||
    startsWithPath(path, "/checkout") ||
    startsWithPath(path, "/architect") ||
    isAiKimberlyParticipantPath(pathname) ||
    path === "/api/auth/google"
  );
}

/**
 * These paths require a completed eligible confirmation before entry.
 * Registration shows an on-page gate instead of redirecting.
 * Checkout catalog may be viewed while unconfirmed.
 */
export function isEligibilityRequiredPath(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  if (path === "/checkout") {
    return false;
  }
  if (path === "/checkout/success" || path === "/checkout/cancel") {
    return false;
  }
  if (path === "/register" || path === "/register/confirmation") {
    return false;
  }
  return (
    startsWithPath(path, "/architect") ||
    startsWithPath(path, "/checkout") ||
    isAiKimberlyParticipantPath(pathname)
  );
}

export function isAiKimberlyParticipantPath(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return (
    startsWithPath(path, "/ai-kimberly") ||
    startsWithPath(path, "/architect/ai-kimberly") ||
    startsWithPath(path, "/kimberly-ai")
  );
}

export function isGoogleRegistrationStartPath(
  pathname: string,
  search: string,
): boolean {
  const path = stripLocalePrefix(pathname);
  if (path !== "/api/auth/google") {
    return false;
  }
  const intent = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(
    "intent",
  );
  return intent !== "login";
}

export function getEligibilityPath(locale: Locale, next?: string): string {
  const base = locale === "es" ? "/es/eligibility" : "/eligibility";
  if (!next) {
    return base;
  }
  return `${base}?next=${encodeURIComponent(next)}`;
}

export function getNotEligiblePath(locale: Locale): string {
  return locale === "es" ? "/es/not-eligible" : "/not-eligible";
}

export function eligibilityRedirectForRequest(input: {
  pathname: string;
  search: string;
  status: AgeEligibilityStatus;
}): string | null {
  const { pathname, search, status } = input;
  if (isAgeEligibilityExemptPath(pathname)) {
    if (stripLocalePrefix(pathname) === "/eligibility" && status === "ineligible") {
      return getNotEligiblePath(localeFromPathname(pathname));
    }
    return null;
  }

  const locale = localeFromPathname(pathname);

  if (status === "ineligible" && isIneligibleBlockedPath(pathname)) {
    return getNotEligiblePath(locale);
  }

  if (
    pathname === "/api/auth/google" ||
    stripLocalePrefix(pathname) === "/api/auth/google"
  ) {
    if (isGoogleRegistrationStartPath(pathname, search) && status !== "eligible") {
      const register = locale === "es" ? "/es/register" : "/register";
      return `${register}?google=age_required`;
    }
    return null;
  }

  if (status !== "eligible" && isEligibilityRequiredPath(pathname)) {
    const next = `${pathname}${search ?? ""}`;
    return getEligibilityPath(locale, next);
  }

  return null;
}
