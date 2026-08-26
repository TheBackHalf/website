"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getArchitectLocaleFromPathname,
  getArchitectNavHref,
  isArchitectPath,
  stripArchitectLocalePrefix,
} from "@/lib/app-shell/routing";
import {
  getLocalizedPath,
  getLocaleFromPathname,
  stripLocalePrefix,
  type LocalizedPath,
} from "@/lib/i18n/routing";
import { localeLabels, locales, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  className?: string;
  variant?: "dark" | "light";
};

function persistLocale(locale: Locale) {
  document.documentElement.lang = localeLabels[locale].htmlLang;
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax${secure}`;
}

function getSwitchHref(pathname: string, locale: Locale): string {
  if (isArchitectPath(pathname)) {
    const internal = stripArchitectLocalePrefix(pathname);
    return getArchitectNavHref(internal, locale);
  }

  const internalPath = stripLocalePrefix(pathname);
  return getLocalizedPath(internalPath as LocalizedPath, locale);
}

export function LanguageSwitcher({
  className,
  variant = "dark",
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const activeLocale = isArchitectPath(pathname)
    ? getArchitectLocaleFromPathname(pathname)
    : getLocaleFromPathname(pathname);
  const dictionary = getDictionary(activeLocale);
  const isDark = variant === "dark";

  return (
    <nav
      aria-label={dictionary.languageSwitcher.label}
      className={cn("bh-language-switcher", className)}
    >
      <ul className="bh-language-switcher-list">
        {locales.map((locale) => {
          const href = getSwitchHref(pathname, locale);
          const isActive = locale === activeLocale;

          return (
            <li key={locale}>
              <Link
                href={href}
                hrefLang={localeLabels[locale].htmlLang}
                lang={localeLabels[locale].htmlLang}
                aria-current={isActive ? "page" : undefined}
                onClick={() => persistLocale(locale)}
                className={cn(
                  "bh-language-switcher-link",
                  isActive && "bh-language-switcher-link-active",
                  !isDark && "bh-language-switcher-link-light",
                )}
              >
                {localeLabels[locale].switchLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
