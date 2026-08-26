"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { localeLabels } from "@/lib/i18n/config";
import { getLocaleFromPathname } from "@/lib/i18n/routing";

/**
 * Root layout does not re-render `<html lang>` on client navigations.
 * Keep the document language aligned with the URL after EN/ES switching.
 */
export function DocumentLocale() {
  const pathname = usePathname() ?? "/";
  const locale = getLocaleFromPathname(pathname);

  useEffect(() => {
    document.documentElement.lang = localeLabels[locale].htmlLang;
  }, [locale]);

  return null;
}
