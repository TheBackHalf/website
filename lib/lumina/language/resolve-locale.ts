import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";

export type ResolveLuminaLocaleInput = {
  routeLocale?: unknown;
  profileLocale?: unknown;
  turnOverride?: unknown;
};

/**
 * Server-authoritative Lumina response locale.
 * Priority: turnOverride → routeLocale → profileLocale → defaultLocale.
 * Never infers language from name, ethnicity, geography, or stereotypes.
 */
export function resolveLuminaLocale(input: ResolveLuminaLocaleInput): Locale {
  if (typeof input.turnOverride === "string" && isLocale(input.turnOverride)) {
    return input.turnOverride;
  }
  if (typeof input.routeLocale === "string" && isLocale(input.routeLocale)) {
    return input.routeLocale;
  }
  if (typeof input.profileLocale === "string" && isLocale(input.profileLocale)) {
    return input.profileLocale;
  }
  return defaultLocale;
}
