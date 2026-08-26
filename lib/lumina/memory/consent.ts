import type { ConsentRecord } from "@/lib/consent/types";

/** Preference record — not a legal manuscript rewrite. */
export const LUMINA_MEMORY_DOCUMENT_ID = "lumina-memory";
export const LUMINA_MEMORY_DOCUMENT_VERSION = "1";

export function buildLuminaMemoryConsentRecord(
  userId: string,
  consentedAt = new Date().toISOString(),
): ConsentRecord {
  return {
    consentType: "lumina_memory",
    documentId: LUMINA_MEMORY_DOCUMENT_ID,
    documentVersion: LUMINA_MEMORY_DOCUMENT_VERSION,
    consentedAt,
    userId,
  };
}
