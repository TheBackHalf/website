export type ConsentType =
  | "terms_of_use"
  | "privacy_policy"
  | "participant_agreement"
  | "membership_agreement"
  | "ai_disclosure"
  | "billing_subscription"
  | "lumina_memory";

export type ConsentRecord = {
  consentType: ConsentType;
  documentId: string;
  documentVersion?: string;
  documentEffectiveDate?: string;
  publicationStatus?: "published" | "unpublished";
  consentedAt: string;
  userId?: string;
  sessionId?: string;
  locale?: string;
};

export type ConsentRecordResult = { status: "pending" } | { status: "recorded" };

export type ConsentValue = {
  consentType: ConsentType;
  documentId: string;
  accepted: boolean;
};

export type ConsentValidationErrors = Partial<Record<ConsentType, string>>;
