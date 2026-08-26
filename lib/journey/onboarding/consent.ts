import {
  accountCreationConsents,
  checkoutConsents,
  type LegalDocument,
} from "@/content/legal/documents";
import { getAuthStore } from "@/lib/auth/store";
import type { ConsentType } from "@/lib/consent/types";
import { documentToConsentType } from "@/lib/consent/validation";

/**
 * Consents applicable to Journey onboarding — reuse existing document types/links.
 * Union of account-creation + checkout consents (no invented legal bodies).
 */
export function getJourneyOnboardingConsentDocuments(): LegalDocument[] {
  const byId = new Map<string, LegalDocument>();
  for (const document of [...accountCreationConsents, ...checkoutConsents]) {
    byId.set(document.id, document);
  }
  return Array.from(byId.values());
}

export type MissingOnboardingConsent = {
  document: LegalDocument;
  consentType: ConsentType;
};

export async function listMissingRequiredOnboardingConsents(
  userId: string,
): Promise<MissingOnboardingConsent[]> {
  const records = await getAuthStore().findConsentRecordsByUserId(userId);
  const acceptedTypes = new Set(records.map((record) => record.consentType));
  const missing: MissingOnboardingConsent[] = [];

  for (const document of getJourneyOnboardingConsentDocuments()) {
    const consentType = documentToConsentType(document.id);
    if (!acceptedTypes.has(consentType)) {
      missing.push({ document, consentType });
    }
  }

  return missing;
}

export async function hasAllRequiredOnboardingConsents(
  userId: string,
): Promise<boolean> {
  const missing = await listMissingRequiredOnboardingConsents(userId);
  return missing.length === 0;
}
