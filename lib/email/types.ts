import type { Locale } from "@/lib/i18n/config";

export type EmailKind = "transactional" | "marketing";

export type EmailTemplateId =
  | "auth.verification"
  | "auth.password_reset"
  | "billing.payment_success"
  | "billing.payment_failed"
  | "billing.subscription_activated"
  | "billing.subscription_canceled"
  | "billing.refund_notice"
  | "support.acknowledgment"
  | "aos.founder_decision"
  | "marketing.campaign"
  | "marketing.launch_announcement"
  | "outreach.audience";

export type SuppressionReason =
  | "unsubscribe"
  | "complaint"
  | "bounce"
  | "manual"
  | "legal";

export type ConsentSource =
  | "explicit_opt_in"
  | "founder_documented"
  | "written_consent";

export type RejectedConsentSource =
  | "account_registration"
  | "purchase"
  | "inferred"
  | "scraped"
  | "purchased_list"
  | "kit_sync"
  | "automation_inferred";

export type EmailSuppressionRecord = {
  email: string;
  reason: SuppressionReason;
  source: string;
  suppressedAt: string;
  detail?: string;
  test?: boolean;
};

export type EmailConsentRecord = {
  id: string;
  email: string;
  source: ConsentSource;
  sourceDetail: string;
  capturedAt: string;
  revokedAt?: string;
  method: "web_form" | "written" | "founder_record";
  test?: boolean;
};

export type EmailComplianceDatabase = {
  suppression: EmailSuppressionRecord[];
  consents: EmailConsentRecord[];
  lastUpdatedAt: string;
};

export type MarketingFooterInput = {
  locale: Locale;
  unsubscribeUrl: string;
  physicalAddress: string;
  consentSourceLabel: string;
};

export type ClassifiedEmailInput = {
  templateId: EmailTemplateId;
  to: string;
  subject: string;
  text: string;
  locale?: Locale;
  fromName?: string;
  fromAddress?: string;
  replyTo?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  dryRun?: boolean;
  test?: boolean;
};

export type ComposedEmail = {
  to: string;
  subject: string;
  text: string;
  fromName: string;
  fromAddress?: string;
  replyTo?: string;
  kind: EmailKind;
  templateId: EmailTemplateId;
  headers: Record<string, string>;
  unsubscribeUrl?: string;
  physicalAddress?: string;
  senderLegalName: string;
  senderBrandName: string;
};

export type ClassifiedSendResult =
  | {
      status: "sent" | "dry_run";
      composed: ComposedEmail;
      smtpResponse?: string;
    }
  | {
      status:
        | "suppressed"
        | "missing_consent"
        | "missing_physical_address"
        | "unsubscribe_secret_missing"
        | "not_configured"
        | "failed"
        | "invalid_recipient";
      error: string;
      composed?: ComposedEmail;
    };
