import type { LegalDocument } from "@/content/legal/documents";
import {
  accountCreationConsents,
  checkoutConsents,
  consentLabelsPending,
  consentValidationMessage,
  getLegalDocumentBySlug,
  getRecordedLegalVersion,
  isLegalDocumentPublished,
  legalDocumentList,
} from "@/content/legal/documents";
import type {
  ConsentType,
  ConsentValidationErrors,
  ConsentValue,
} from "@/lib/consent/types";
import type { Locale } from "@/lib/i18n/config";

const documentVersionMap = new Map<string, string | undefined>([
  ...accountCreationConsents.map((document) => [
    document.id,
    (document as LegalDocument).version,
  ] as const),
  ...checkoutConsents.map((document) => [
    document.id,
    (document as LegalDocument).version,
  ] as const),
  ["lumina-memory", "1"] as const,
]);

export function documentToConsentType(documentId: string): ConsentType {
  const map: Record<string, ConsentType> = {
    "terms-of-use": "terms_of_use",
    "privacy-policy": "privacy_policy",
    "participant-agreement": "participant_agreement",
    "membership-agreement": "membership_agreement",
    "ai-disclosure": "ai_disclosure",
    "lumina-memory": "lumina_memory",
  };

  return map[documentId] ?? "terms_of_use";
}

export function validateRequiredConsents(
  requiredDocuments: readonly LegalDocument[],
  values: ConsentValue[],
  options?: { includeBilling?: boolean },
): ConsentValidationErrors {
  const errors: ConsentValidationErrors = {};
  const valueMap = new Map(values.map((value) => [value.documentId, value.accepted]));

  for (const document of requiredDocuments) {
    const consentType = documentToConsentType(document.id);
    if (!valueMap.get(document.id)) {
      errors[consentType] = consentValidationMessage;
    }
  }

  if (options?.includeBilling && !valueMap.get("billing-subscription")) {
    errors.billing_subscription = consentValidationMessage;
  }

  return errors;
}

function resolveConsentDocument(documentId: string): LegalDocument | undefined {
  return (
    getLegalDocumentBySlug(documentId) ??
    legalDocumentList.find((document) => document.id === documentId)
  );
}

export function buildConsentRecords(
  values: ConsentValue[],
  options?: { userId?: string; sessionId?: string; locale?: Locale },
): import("@/lib/consent/types").ConsentRecord[] {
  const timestamp = new Date().toISOString();

  return values
    .filter((value) => value.accepted)
    .map((value) => {
      const document = resolveConsentDocument(value.documentId);
      const mappedVersion = documentVersionMap.get(value.documentId);
      return {
        consentType: value.consentType,
        documentId: value.documentId,
        documentVersion: document
          ? getRecordedLegalVersion(document)
          : mappedVersion,
        documentEffectiveDate: document?.effectiveDate,
        publicationStatus: document
          ? isLegalDocumentPublished(document)
            ? "published"
            : "unpublished"
          : undefined,
        consentedAt: timestamp,
        userId: options?.userId,
        sessionId: options?.sessionId,
        locale: options?.locale,
      };
    });
}

export { consentLabelsPending };
