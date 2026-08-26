import type { Locale } from "@/lib/i18n/config";

function stripLocalePrefix(pathname: string): string {
  if (pathname === "/es") {
    return "/";
  }
  if (pathname.startsWith("/es/")) {
    return pathname.slice(3) || "/";
  }
  return pathname;
}

/**
 * Preserve only in-app checkout destinations across login/register.
 * Returns an unlocalized path so LocaleLink can prefix correctly.
 * Rejects protocol-relative and off-site URLs.
 */
export function safeCheckoutNextPath(
  requested: string | null | undefined,
  locale: Locale,
): string | null {
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) {
    return null;
  }

  const [rawPath, query] = requested.split("?");
  const path = rawPath ?? requested;
  const unlocalized = stripLocalePrefix(path);
  const allowed =
    unlocalized === "/checkout" || unlocalized.startsWith("/checkout/");

  if (!allowed) {
    return null;
  }

  if (locale === "es" && !path.startsWith("/es")) {
    return null;
  }

  if (locale === "en" && path.startsWith("/es")) {
    return null;
  }

  return query ? `${unlocalized}?${query}` : unlocalized;
}

export function checkoutCatalogPath(): "/checkout" {
  return "/checkout";
}

export function localizedCheckoutPath(
  unlocalized: string,
  locale: Locale,
): string {
  if (locale === "es") {
    return unlocalized === "/" ? "/es" : `/es${unlocalized}`;
  }
  return unlocalized;
}
