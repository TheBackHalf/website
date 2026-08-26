import type { Locale } from "@/lib/i18n/config";

/**
 * Detect an explicit one-turn language request in the current user message.
 * Returns a locale for this reply only — never mutates profile preference.
 */
export function detectLuminaTurnLocaleOverride(content: string): Locale | null {
  const normalized = content.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

  if (
    /\b(?:please\s+)?respond\s+in\s+english\b/.test(normalized) ||
    /\bresponde\s+en\s+ingles\b/.test(normalized)
  ) {
    return "en";
  }

  if (
    /\b(?:please\s+)?respond\s+in\s+spanish\b/.test(normalized) ||
    /\bresponde\s+en\s+espanol\b/.test(normalized)
  ) {
    return "es";
  }

  return null;
}
