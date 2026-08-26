import { enDictionary } from "@/content/i18n/dictionaries/en";
import { esDictionary } from "@/content/i18n/dictionaries/es";
import type { Dictionary } from "@/content/i18n/types";
import { isTranslationPending } from "@/content/i18n/types";
import type { Locale } from "@/lib/i18n/config";

const dictionaries: Record<Locale, Dictionary> = {
  en: enDictionary,
  es: esDictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function translate(
  locale: Locale,
  value: Dictionary["metadata"]["home"]["title"],
): string {
  const dictionary = getDictionary(locale);

  if (typeof value === "string") {
    return value;
  }

  if (locale === "en") {
    return value.fallback ?? dictionary.common.translationPending;
  }

  if (isTranslationPending(value)) {
    return value.fallback ?? dictionary.common.translationPending;
  }

  return dictionary.common.translationPending;
}

export function resolveNavLabel(
  locale: Locale,
  key: keyof Dictionary["nav"],
): string {
  const label = getDictionary(locale).nav[key];
  if (typeof label === "string") {
    return label;
  }

  return label.fallback ?? getDictionary(locale).common.translationPending;
}

export function resolveFormLabel(
  locale: Locale,
  key: keyof Dictionary["forms"],
): string {
  const label = getDictionary(locale).forms[key];
  if (typeof label === "string") {
    return label;
  }

  return label.fallback ?? getDictionary(locale).common.translationPending;
}

export function resolveAppShellNavLabel(
  locale: Locale,
  key: keyof Dictionary["appShell"]["nav"],
): string {
  const label = getDictionary(locale).appShell.nav[key];
  if (typeof label === "string") {
    return label;
  }

  return label.fallback ?? getDictionary(locale).common.translationPending;
}

export function resolveRegistrationLabel(
  locale: Locale,
  key: keyof Dictionary["registration"],
): string {
  const label = getDictionary(locale).registration[key];
  if (typeof label === "string") {
    return label;
  }

  return label.fallback ?? getDictionary(locale).common.translationPending;
}

export function resolveAppShellLabel(
  locale: Locale,
  value: Dictionary["metadata"]["home"]["title"],
): string {
  return translate(locale, value);
}
