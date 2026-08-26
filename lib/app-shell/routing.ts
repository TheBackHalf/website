import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import {
  architectAppBasePath,
  type ArchitectAppRouteKey,
  architectRoutePaths,
} from "@/lib/app-shell/config";

export type ArchitectPath =
  | "/architect"
  | `/architect/${ArchitectAppRouteKey}`;

export function getArchitectLocaleFromPathname(pathname: string): Locale {
  return pathname === "/es/architect" || pathname.startsWith("/es/architect/")
    ? "es"
    : "en";
}

export function stripArchitectLocalePrefix(pathname: string): string {
  return pathname.replace(/^\/es(?=\/architect)/, "") || pathname;
}

export function getLocalizedArchitectPath(
  route: ArchitectAppRouteKey | "root",
  locale: Locale,
): string {
  const base =
    route === "root"
      ? architectAppBasePath
      : architectRoutePaths[route];

  if (locale === defaultLocale) {
    return base;
  }

  return `/es${base}`;
}

export function isArchitectPath(pathname: string): boolean {
  const normalized = stripArchitectLocalePrefix(pathname);
  return (
    normalized === architectAppBasePath ||
    normalized.startsWith(`${architectAppBasePath}/`)
  );
}

export function getArchitectNavHref(href: string, locale: Locale): string {
  if (href.startsWith("/support") || href.startsWith("/contact")) {
    return locale === defaultLocale ? href : `/es${href}`;
  }

  if (locale === defaultLocale) {
    return href;
  }

  return `/es${href}`;
}
