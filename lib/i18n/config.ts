export const locales = ["en", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<
  Locale,
  { name: string; switchLabel: string; htmlLang: string; ogLocale: string }
> = {
  en: {
    name: "English",
    switchLabel: "English",
    htmlLang: "en",
    ogLocale: "en_US",
  },
  es: {
    name: "Español",
    switchLabel: "Español",
    htmlLang: "es",
    ogLocale: "es_ES",
  },
};

export const LOCALE_COOKIE = "bh-locale";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
