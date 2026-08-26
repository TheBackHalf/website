import type { SupportOwner } from "@/lib/support/catalog";
import { PRIVACY_MAILBOX, SUPPORT_MAILBOX } from "@/lib/support/catalog";

export const PRIVACY_REQUEST_TYPES = [
  "ACCESS",
  "CORRECTION",
  "DELETION",
  "EXPORT",
  "CONSENT_WITHDRAWAL",
  "INQUIRY",
] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_STATUSES = [
  "RECEIVED",
  "IDENTITY_PENDING",
  "VERIFIED",
  "IN_PROGRESS",
  "WAITING_ON_REQUESTER",
  "FULFILLED",
  "PARTIALLY_FULFILLED",
  "DENIED",
  "CLOSED",
] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const OPEN_PRIVACY_REQUEST_STATUSES: PrivacyRequestStatus[] = [
  "RECEIVED",
  "IDENTITY_PENDING",
  "VERIFIED",
  "IN_PROGRESS",
  "WAITING_ON_REQUESTER",
];

export const PRIVACY_IDENTITY_METHODS = [
  "session",
  "email_token",
  "not_started",
] as const;
export type PrivacyIdentityMethod = (typeof PRIVACY_IDENTITY_METHODS)[number];

export const PRIVACY_IDENTITY_STATUSES = [
  "pending",
  "verified",
  "failed",
] as const;
export type PrivacyIdentityStatus = (typeof PRIVACY_IDENTITY_STATUSES)[number];

export const PRIVACY_OWNERS = ["michelle", "imani", "nia", "founder"] as const;
export type PrivacyOwner = (typeof PRIVACY_OWNERS)[number];

export const PRIVACY_SOURCES = [
  "privacy_form",
  "architect_settings",
  "support_ticket",
  "email",
] as const;
export type PrivacySource = (typeof PRIVACY_SOURCES)[number];

export const PRIVACY_MAILBOX_ADDRESS = PRIVACY_MAILBOX;
export const PRIVACY_FROM_NAME = "The Back Half Privacy";
export const PRIVACY_REPLY_TO = SUPPORT_MAILBOX;

export const PRIVACY_REQUEST_TYPE_LABELS: Record<PrivacyRequestType, string> = {
  ACCESS: "Access my information",
  CORRECTION: "Correct my information",
  DELETION: "Delete my information",
  EXPORT: "Export a copy of my information",
  CONSENT_WITHDRAWAL: "Withdraw consent where applicable",
  INQUIRY: "Privacy inquiry",
};

export const PRIVACY_REQUEST_TYPE_LABELS_ES: Record<PrivacyRequestType, string> = {
  ACCESS: "Acceder a mi información",
  CORRECTION: "Corregir mi información",
  DELETION: "Eliminar mi información",
  EXPORT: "Exportar una copia de mi información",
  CONSENT_WITHDRAWAL: "Retirar el consentimiento cuando aplique",
  INQUIRY: "Consulta de privacidad",
};

export const PRIVACY_OWNER_TITLES: Record<PrivacyOwner, string> = {
  michelle: "Michelle Northstar — Chief of Staff & Operations Officer",
  imani: "Imani Heartbeat — Chief Technology & Risk Officer",
  nia: "Nia Prism — Chief Experience & Transformation Officer",
  founder: "Founder",
};

/** Acknowledgment operating target. Not a legal statutory deadline. */
export const PRIVACY_ACKNOWLEDGMENT_HOURS = 72;

/** Identity-token lifetime. Not a legal statutory deadline. */
export const PRIVACY_IDENTITY_TOKEN_HOURS = 72;

/**
 * Fulfillment operating target after identity verification.
 * Operational tracking only — not a legal interpretation of any privacy statute.
 */
export const PRIVACY_FULFILLMENT_DAYS = 30;

export const PRIVACY_APPROACHING_DAYS = 7;

export const WITHDRAWABLE_CONSENT_TYPES = ["lumina_memory"] as const;

export const REQUIRED_SERVICE_CONSENT_TYPES = [
  "terms_of_use",
  "privacy_policy",
  "participant_agreement",
  "ai_disclosure",
  "billing_subscription",
  "membership_agreement",
] as const;

export function isPrivacyRequestType(value: string): value is PrivacyRequestType {
  return (PRIVACY_REQUEST_TYPES as readonly string[]).includes(value);
}

export function isPrivacyRequestStatus(
  value: string,
): value is PrivacyRequestStatus {
  return (PRIVACY_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function defaultPrivacyOwner(type: PrivacyRequestType): PrivacyOwner {
  if (type === "INQUIRY") return "michelle";
  return "imani";
}

export function privacyOwnerTitle(owner: PrivacyOwner): string {
  return PRIVACY_OWNER_TITLES[owner];
}

export function privacyOwnerTitles(owners: Array<PrivacyOwner | SupportOwner>): string {
  return owners.map((owner) => PRIVACY_OWNER_TITLES[owner as PrivacyOwner] ?? owner).join("; ");
}

export function fulfillmentDueAt(verifiedAt: Date): string {
  const due = new Date(verifiedAt.getTime() + PRIVACY_FULFILLMENT_DAYS * 24 * 60 * 60 * 1000);
  return due.toISOString();
}

export function acknowledgmentDueAt(createdAt: Date): string {
  const due = new Date(createdAt.getTime() + PRIVACY_ACKNOWLEDGMENT_HOURS * 60 * 60 * 1000);
  return due.toISOString();
}

export function privacySlaStateFor(
  status: PrivacyRequestStatus,
  fulfillmentDueAtIso: string | undefined,
  now = new Date(),
): "within" | "approaching" | "overdue" | "complete" {
  if (
    status === "FULFILLED" ||
    status === "PARTIALLY_FULFILLED" ||
    status === "DENIED" ||
    status === "CLOSED"
  ) {
    return "complete";
  }
  if (!fulfillmentDueAtIso) return "within";
  const due = Date.parse(fulfillmentDueAtIso);
  if (!Number.isFinite(due)) return "within";
  if (now.getTime() > due) return "overdue";
  const remainingDays = (due - now.getTime()) / (1000 * 60 * 60 * 24);
  if (remainingDays <= PRIVACY_APPROACHING_DAYS) return "approaching";
  return "within";
}
