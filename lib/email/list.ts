import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getEmailComplianceStore } from "@/lib/email/store";
import type {
  ConsentSource,
  EmailConsentRecord,
  RejectedConsentSource,
  SuppressionReason,
} from "@/lib/email/types";

const ALLOWED_CONSENT_SOURCES = new Set<ConsentSource>([
  "explicit_opt_in",
  "founder_documented",
  "written_consent",
]);

const REJECTED_CONSENT_SOURCES = new Set<string>([
  "account_registration",
  "purchase",
  "inferred",
  "scraped",
  "purchased_list",
  "kit_sync",
  "automation_inferred",
]);

export type AddMarketingRecipientInput = {
  email: string;
  source: ConsentSource | RejectedConsentSource | string;
  sourceDetail: string;
  method?: EmailConsentRecord["method"];
  capturedAt?: string;
  automation?: boolean;
  test?: boolean;
};

export type AddMarketingRecipientResult =
  | { status: "added"; consent: EmailConsentRecord }
  | { status: "already_subscribed"; consent: EmailConsentRecord }
  | {
      status: "suppressed" | "rejected_source" | "invalid_email";
      error: string;
    };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function isMarketingSuppressed(email: string): Promise<boolean> {
  const record = await getEmailComplianceStore().getSuppression(email);
  return Boolean(record);
}

export async function addMarketingRecipient(
  input: AddMarketingRecipientInput,
): Promise<AddMarketingRecipientResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { status: "invalid_email", error: "invalid_email" };
  }

  if (REJECTED_CONSENT_SOURCES.has(input.source) || !ALLOWED_CONSENT_SOURCES.has(input.source as ConsentSource)) {
    return {
      status: "rejected_source",
      error: `consent_source_not_allowed:${input.source}. Account registration, purchase, inferred, scraped, purchased-list, and Kit-sync sources cannot enroll a marketing recipient.`,
    };
  }

  if (await isMarketingSuppressed(email)) {
    return {
      status: "suppressed",
      error: input.automation
        ? "suppressed_cannot_readd_by_automation"
        : "suppressed_cannot_readd",
    };
  }

  const store = getEmailComplianceStore();
  const existing = await store.getActiveConsent(email);
  if (existing) {
    return { status: "already_subscribed", consent: existing };
  }

  const consent = await store.recordConsent({
    email,
    source: input.source as ConsentSource,
    sourceDetail: input.sourceDetail.trim(),
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    method: input.method ?? "web_form",
    test: input.test,
  });
  return { status: "added", consent };
}

export async function recordUnsubscribe(input: {
  email: string;
  source?: string;
  detail?: string;
  test?: boolean;
}): Promise<{ status: "unsubscribed"; email: string; alreadySuppressed: boolean }> {
  const email = normalizeEmail(input.email);
  const store = getEmailComplianceStore();
  const existing = await store.getSuppression(email);
  const suppressedAt = existing?.suppressedAt ?? new Date().toISOString();
  await store.suppress({
    email,
    reason: "unsubscribe",
    source: input.source ?? "unsubscribe_link",
    suppressedAt,
    detail: input.detail,
    test: input.test,
  });
  await store.revokeConsent(email, new Date().toISOString());
  return {
    status: "unsubscribed",
    email,
    alreadySuppressed: Boolean(existing),
  };
}

export async function recordSuppression(input: {
  email: string;
  reason: SuppressionReason;
  source: string;
  detail?: string;
  test?: boolean;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  const store = getEmailComplianceStore();
  await store.suppress({
    email,
    reason: input.reason,
    source: input.source,
    suppressedAt: new Date().toISOString(),
    detail: input.detail,
    test: input.test,
  });
  await store.revokeConsent(email);
}

/** Automations and list-load jobs must call this before adding a recipient. */
export async function assertAutomationMayAddRecipient(
  email: string,
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  if (await isMarketingSuppressed(email)) {
    return { allowed: false, error: "suppressed_cannot_readd_by_automation" };
  }
  return { allowed: true };
}
