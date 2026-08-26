/**
 * Banned-claim scan for participant email copy.
 * Does not invent legal claims; flags accidental guarantee/medical/ROI language.
 */

const BANNED_CLAIM_PATTERNS: readonly { id: string; pattern: RegExp }[] = [
  { id: "guarantee", pattern: /\bguarantees?\b/i },
  { id: "cure", pattern: /\bcures?\b/i },
  { id: "diagnosis", pattern: /\bdiagnos(?:is|e|es)\b/i },
  { id: "medical_treatment", pattern: /\btreatment plan\b/i },
  { id: "roi", pattern: /\breturn on investment\b/i },
  { id: "risk_free", pattern: /\brisk[-\s]?free\b/i },
  { id: "results_guaranteed", pattern: /\bresults guaranteed\b/i },
];

export function findBannedEmailClaims(text: string): string[] {
  const hits: string[] = [];
  for (const entry of BANNED_CLAIM_PATTERNS) {
    if (entry.pattern.test(text)) {
      hits.push(entry.id);
    }
  }
  return hits;
}
