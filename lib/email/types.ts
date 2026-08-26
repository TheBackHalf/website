export const TRANSACTIONAL_EMAIL_CATEGORIES = [
  "auth",
  "billing",
  "support",
  "operations",
  "lifecycle",
] as const;
export type TransactionalEmailCategory =
  (typeof TRANSACTIONAL_EMAIL_CATEGORIES)[number];

export const EMAIL_SUPPRESSION_REASONS = [
  "hard_bounce",
  "complaint",
  "unsubscribe",
] as const;
export type EmailSuppressionReason = (typeof EMAIL_SUPPRESSION_REASONS)[number];

export const EMAIL_EVENT_TYPES = [
  "send_attempt",
  "sent",
  "failed",
  "skipped_not_configured",
  "skipped_suppressed",
  "skipped_invalid_sender",
  "bounce",
  "complaint",
  "unsubscribe",
] as const;
export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

export type EmailSuppressionRecord = {
  email: string;
  reason: EmailSuppressionReason;
  source: string;
  detail?: string;
  createdAt: string;
  updatedAt: string;
  test?: boolean;
};

export type EmailDeliveryEvent = {
  id: string;
  createdAt: string;
  type: EmailEventType;
  status: EmailEventType;
  category: TransactionalEmailCategory;
  email: string;
  provider: "google_workspace_smtp";
  messageId?: string;
  error?: string;
  test?: boolean;
};

export type EmailDatabase = {
  suppressions: EmailSuppressionRecord[];
  events: EmailDeliveryEvent[];
  lastUpdatedAt: string;
};

export type BounceClass = "hard" | "soft" | "complaint" | "none";

export type TransactionalSendInput = {
  to: string;
  subject: string;
  text: string;
  category: TransactionalEmailCategory;
  fromName?: string;
  fromAddress?: string;
  replyTo?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  locale?: "en" | "es";
  test?: boolean;
};

export type TransactionalSendResult =
  | { status: "sent"; response: string; eventId: string }
  | { status: "not_configured"; error: string; eventId: string }
  | { status: "failed"; error: string; eventId: string }
  | { status: "skipped_suppressed"; error: string; eventId: string }
  | { status: "skipped_invalid_sender"; error: string; eventId: string };

export type EmailDeliverabilitySnapshot = {
  generatedAt: string;
  provider: "google_workspace_smtp";
  senderDomain: "thebackhalf.org";
  smtpReady: boolean;
  fromAddressAllowed: boolean;
  totals: {
    sent: number;
    failed: number;
    suppressed: number;
    hardBounces: number;
    complaints: number;
    unsubscribes: number;
  };
  rates: {
    bounceRate: number | null;
    complaintRate: number | null;
  };
  alert: {
    bounceHigh: boolean;
    complaintHigh: boolean;
  };
  dns: {
    spf: "pass" | "missing" | "unknown";
    dkim: "pass" | "missing" | "unknown";
    dmarc: "pass" | "missing" | "unknown";
  };
};
