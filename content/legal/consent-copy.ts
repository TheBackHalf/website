/**
 * Founder-approved Version 1.0 consent and billing acknowledgment copy.
 * Do not auto-translate. Do not invent Spanish legal acknowledgments.
 */

export const LEGAL_PUBLICATION_VERSION = "1.0" as const;
export const LEGAL_PUBLICATION_EFFECTIVE_DATE = "August 31, 2026" as const;

export type ConsentLabelParts = {
  prefix: string;
  title: string;
  suffix: string;
  sentence: string;
};

export const CONSENT_LABELS_BY_DOCUMENT_ID: Record<string, ConsentLabelParts> = {
  "terms-of-use": {
    prefix: "I have read and agree to the ",
    title: "Terms of Use",
    suffix: ".",
    sentence: "I have read and agree to the Terms of Use.",
  },
  "privacy-policy": {
    prefix: "I acknowledge that I have read the ",
    title: "Privacy Policy",
    suffix: ".",
    sentence: "I acknowledge that I have read the Privacy Policy.",
  },
  "participant-agreement": {
    prefix: "I have read and agree to the ",
    title: "Participant Agreement",
    suffix: ".",
    sentence: "I have read and agree to the Participant Agreement.",
  },
  "membership-agreement": {
    prefix: "I have read and agree to the ",
    title: "Membership Agreement",
    suffix: ".",
    sentence: "I have read and agree to the Membership Agreement.",
  },
  "ai-disclosure": {
    prefix: "I acknowledge that I have read the ",
    title: "AI Disclosure",
    suffix: ".",
    sentence: "I acknowledge that I have read the AI Disclosure.",
  },
};

export const BILLING_PURCHASE_ACKNOWLEDGMENT =
  "I understand the purchase terms shown above, including the applicable price, Architect Community access and timing, and The Back Half\u2019s no-refund policy.";

export function getConsentLabelParts(documentId: string): ConsentLabelParts | undefined {
  return CONSENT_LABELS_BY_DOCUMENT_ID[documentId];
}
