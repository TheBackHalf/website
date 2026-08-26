/**
 * Spanish titles for legal navigation only.
 * Approved Spanish legal manuscripts do not yet exist. English Version 1.0
 * bodies must not be presented as an approved Spanish legal instrument.
 */

export const legalTitlesEs: Record<string, string> = {
  "privacy-policy": "Política de privacidad",
  "terms-of-use": "Términos de uso",
  "participant-agreement": "Acuerdo de participante",
  "membership-agreement": "Acuerdo de membresía",
  "ai-disclosure": "Divulgación de IA",
};

export function getLegalTitle(slug: string, locale: "en" | "es", englishTitle: string): string {
  if (locale !== "es") {
    return englishTitle;
  }
  return legalTitlesEs[slug] ?? englishTitle;
}
