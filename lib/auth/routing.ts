import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

export function getRegistrationPath(locale: Locale): string {
  return getLocalizedPath("/register", locale);
}

export function getRegistrationConfirmationPath(locale: Locale): string {
  return getLocalizedPath("/register/confirmation", locale);
}

export function getVerifyEmailPath(locale: Locale): string {
  return getLocalizedPath("/verify-email", locale);
}

export function getLoginPath(locale: Locale): string {
  return getLocalizedPath("/login", locale);
}

export function getForgotPasswordPath(locale: Locale): string {
  return getLocalizedPath("/forgot-password", locale);
}

export function getResetPasswordPath(locale: Locale): string {
  return getLocalizedPath("/reset-password", locale);
}

export function getPostRegistrationRedirect(locale: Locale): string {
  return getLocalizedArchitectPath("dashboard", locale);
}

export function getPostLoginRedirect(locale: Locale): string {
  return getLocalizedArchitectPath("dashboard", locale);
}

export function getSafeRedirectPath(
  requested: string | undefined,
  locale: Locale,
  fallback: string,
): string {
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) {
    return fallback;
  }

  if (locale === "es" && !requested.startsWith("/es")) {
    return fallback;
  }

  if (locale === "en" && requested.startsWith("/es")) {
    return fallback;
  }

  return requested;
}
