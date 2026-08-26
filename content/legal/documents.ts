/**
 * Published legal-document catalog — English Version 1.0 metadata.
 * Operative bodies live in content/legal/published-bodies.ts so client
 * surfaces do not load the manuscripts.
 */

export type LegalDocumentSection = {
  id: string;
  heading?: string;
  /** Verbatim approved legal paragraphs — do not edit in code. */
  paragraphs: readonly string[];
};

export type LegalReviewStatus =
  | "DRAFT"
  | "APPROVED"
  | "HUMAN-REVIEWED"
  | "FOUNDER-ACCEPTED"
  | "SUPERSEDED";

export type LegalDocument = {
  id: string;
  slug: string;
  title: string;
  effectiveDate?: string;
  version?: string;
  contentPending: boolean;
  reviewStatus: LegalReviewStatus;
  supersedes?: string;
  humanReviewedAt?: string;
  founderAcceptedAt?: string;
  sections?: readonly LegalDocumentSection[];
};

const PUBLISHED_V1 = {
  version: "1.0",
  effectiveDate: "August 31, 2026",
  contentPending: false,
  reviewStatus: "FOUNDER-ACCEPTED",
  founderAcceptedAt: "2026-08-21",
} as const;

export const legalDocuments = {
  privacyPolicy: {
    id: "privacy-policy",
    slug: "privacy-policy",
    title: "Privacy Policy",
    ...PUBLISHED_V1,
  },
  termsOfUse: {
    id: "terms-of-use",
    slug: "terms-of-use",
    title: "Terms of Use",
    ...PUBLISHED_V1,
  },
  participantAgreement: {
    id: "participant-agreement",
    slug: "participant-agreement",
    title: "Participant Agreement",
    ...PUBLISHED_V1,
  },
  membershipAgreement: {
    id: "membership-agreement",
    slug: "membership-agreement",
    title: "Membership Agreement",
    ...PUBLISHED_V1,
  },
  aiDisclosure: {
    id: "ai-disclosure",
    slug: "ai-disclosure",
    title: "AI Disclosure",
    ...PUBLISHED_V1,
  },
} as const satisfies Record<string, LegalDocument>;

export const legalDocumentList: readonly LegalDocument[] = [
  legalDocuments.privacyPolicy,
  legalDocuments.termsOfUse,
  legalDocuments.participantAgreement,
  legalDocuments.membershipAgreement,
  legalDocuments.aiDisclosure,
];

export function getLegalDocumentBySlug(slug: string): LegalDocument | undefined {
  return legalDocumentList.find((document) => document.slug === slug);
}

export function getLegalDocumentHref(slug: string): string {
  return `/legal/${slug}`;
}

/** Recorded acceptance version. Does not invent a legal version number. */
export function getRecordedLegalVersion(document: LegalDocument): string {
  const version = document.version?.trim();
  if (version) return version;
  return `unpublished:${document.reviewStatus.toLowerCase()}`;
}

export function isLegalDocumentPublished(document: LegalDocument): boolean {
  return (
    isLegalDocumentImplementationEligible(document) &&
    document.version === "1.0" &&
    Boolean(document.effectiveDate?.trim())
  );
}

/** Footer legal navigation — document titles only (no invented legal language). */
export const legalFooterLinks = legalDocumentList.map((document) => ({
  href: getLegalDocumentHref(document.slug),
  label: document.title,
}));

/** Consent applicability — based on documents defined above. */
export const accountCreationConsents = [
  legalDocuments.termsOfUse,
  legalDocuments.privacyPolicy,
  legalDocuments.participantAgreement,
  legalDocuments.aiDisclosure,
] as const;

export const checkoutConsents = [
  legalDocuments.termsOfUse,
  legalDocuments.participantAgreement,
  legalDocuments.membershipAgreement,
] as const;

/** Founder-approved consent labels are activated. */
export const consentLabelsPending = false;

export const consentValidationMessage =
  "Required acknowledgment has not been provided.";

export const consentRecordingPendingMessage =
  "Acknowledgment is stored with the Architect account when registration or checkout completes.";

export const SPANISH_LEGAL_MANUSCRIPTS_STATUS =
  "PENDING APPROVED TRANSLATION" as const;

export const communityGuidelinesPublication = {
  requirement: "PRE-COMMUNITY-LAUNCH",
  deadline: "BEFORE OCTOBER 25, 2026",
  august31LaunchBlocker: false,
  published: false,
} as const;

/** Agents may implement only non-DRAFT, non-SUPERSEDED bodies that are not content-pending. */
export function isLegalDocumentImplementationEligible(document: LegalDocument): boolean {
  if (document.contentPending) return false;
  if (document.reviewStatus === "DRAFT" || document.reviewStatus === "SUPERSEDED") return false;
  return (
    document.reviewStatus === "APPROVED" ||
    document.reviewStatus === "HUMAN-REVIEWED" ||
    document.reviewStatus === "FOUNDER-ACCEPTED"
  );
}

export {
  BILLING_PURCHASE_ACKNOWLEDGMENT,
  CONSENT_LABELS_BY_DOCUMENT_ID,
  getConsentLabelParts,
} from "@/content/legal/consent-copy";
