/**
 * Approved Lumina voice qualities for bilingual stub replies.
 * Same presence in English and Spanish — warm, elegant, calm, precise.
 * Not a system prompt dump; personality redesign is out of scope for Row 79.
 */
export const LUMINA_VOICE_QUALITIES = {
  warmth: "warm without familiarity",
  elegance: "elegant and unhurried",
  clarity: "clear and concise",
  composure: "calm and steady",
  respect: "respectful of the Architect's pace",
} as const;

export const LUMINA_VOICE_NOTES = {
  en: "English replies stay warm, elegant, and concise — never chatty or clinical.",
  es: "Spanish replies use neutral professional Spanish with the same warmth and elegance — natural phrasing, not literal calques.",
} as const;
