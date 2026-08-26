import type { Locale } from "@/lib/i18n/config";

export function getAccessDeniedPath(locale: Locale): string {
  return locale === "es" ? "/es/access-denied" : "/access-denied";
}

export function getAdminOpsPath(locale: Locale): string {
  return locale === "es" ? "/es/ops/admin" : "/ops/admin";
}

export function getSupportOpsPath(locale: Locale): string {
  return locale === "es" ? "/es/ops/support" : "/ops/support";
}
