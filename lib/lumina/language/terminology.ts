import type { Locale } from "@/lib/i18n/config";

/**
 * Canonical Back Half product terms for Lumina copy.
 * Branded names stay consistent across locales — do not invent unapproved Spanish product names.
 */
export const LUMINA_BRANDED_TERMS = {
  product: "The Back Half",
  architect: "Architect",
  lumina: "Lumina",
  journey: "Journey",
  theJourney: "The Journey",
  blueprint: "Blueprint",
  community: "Community",
} as const;

export type LuminaBrandedTermKey = keyof typeof LUMINA_BRANDED_TERMS;

/** Returns the approved branded spelling for both English and Spanish UI/copy. */
export function brandedTerm(
  key: LuminaBrandedTermKey,
  locale?: Locale,
): string {
  void locale;
  return LUMINA_BRANDED_TERMS[key];
}
