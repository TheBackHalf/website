/**
 * Row 147 — approved lifecycle automation map, encoded for execution.
 * Row 143 documented the map; this file is the machine-readable source used
 * to connect platform events. Copy ownership for participant-facing language
 * remains Nia; Imani owns trigger wiring, delays, fallback, and idempotency.
 */

import type { BillingNotificationTemplate } from "@/lib/billing/types";
import {
  LIFECYCLE_AUTOMATION_IDS,
  LIFECYCLE_FAMILIES,
  type LifecycleAutomationDefinition,
  type LifecycleAutomationId,
  type LifecycleFamily,
} from "@/lib/lifecycle/types";

export const INACTIVITY_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export const LIFECYCLE_AUTOMATIONS: readonly LifecycleAutomationDefinition[] = [
  {
    id: "account.verification",
    family: "account",
    name: "Account verification email",
    trigger: "Email registration created an unverified account",
    platformEvent: "email_verification_required",
    conditions: "Email/password registration; verification token issued",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "locale"],
    owner: "imani",
    fallback: "Do not block registration. Record skipped_not_configured or failed.",
    successMeasure: "One ledger row per send; recipient can verify within 24 hours",
    existingSender: "lib/auth/email/send-verification.ts",
    transactional: true,
  },
  {
    id: "account.password_reset",
    family: "account",
    name: "Password reset email",
    trigger: "Password reset requested for an email/password account",
    platformEvent: "password_reset_requested",
    conditions: "Verified email account with a password; cooldown elapsed",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "locale"],
    owner: "imani",
    fallback: "Always return a neutral accepted response. Record delivery status.",
    successMeasure: "Reset link issued only to eligible accounts; duplicates cooldown-gated",
    existingSender: "lib/auth/email/send-password-reset.ts",
    transactional: true,
  },
  {
    id: "account.verified",
    family: "account",
    name: "Email verified",
    trigger: "Email confirmed or Google registration already verified",
    platformEvent: "email_verified",
    conditions: "Verification token accepted, or Google account created",
    delayMs: 0,
    channel: "ledger",
    language: "en+es",
    data: ["userId", "method"],
    owner: "imani",
    fallback: "Session and product access continue even if the ledger write fails",
    successMeasure: "Trigger connected once per user (idempotent)",
    transactional: true,
  },
  {
    id: "payment.confirmed",
    family: "payment",
    name: "Payment confirmed",
    trigger: "Stripe payment succeeded on checkout or invoice",
    platformEvent: "checkout.payment_succeeded",
    conditions: "Webhook processed; userId resolved",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "offerId"],
    owner: "imani",
    fallback: "Entitlements stay granted. Record skipped_not_configured or failed.",
    successMeasure: "Idempotent with Stripe event id; no duplicate email on webhook retry",
    existingSender: "lib/billing/notifications.ts",
    transactional: true,
  },
  {
    id: "payment.failed",
    family: "payment",
    name: "Payment failed",
    trigger: "Stripe payment failed",
    platformEvent: "checkout.payment_failed",
    conditions: "Webhook processed; no paid access granted",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "offerId"],
    owner: "imani",
    fallback: "Do not grant access. Record delivery status.",
    successMeasure: "Failed payment never unlocks entitlements; Architect is notified",
    existingSender: "lib/billing/notifications.ts",
    transactional: true,
  },
  {
    id: "payment.refunded",
    family: "payment",
    name: "Refund notice",
    trigger: "Stripe charge refunded",
    platformEvent: "payment.refunded",
    conditions: "Webhook processed; associated access updated",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "offerId"],
    owner: "imani",
    fallback: "Access updates independently of email delivery",
    successMeasure: "Refund notice is idempotent per Stripe event",
    existingSender: "lib/billing/notifications.ts",
    transactional: true,
  },
  {
    id: "progress.onboarding_completed",
    family: "progress",
    name: "Onboarding completed",
    trigger: "Onboarding record status becomes completed",
    platformEvent: "onboarding_completed",
    conditions: "First transition to completed for the user",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId"],
    owner: "imani",
    fallback: "Onboarding completion is not blocked by SMTP",
    successMeasure: "One email per user; Journey continue link present",
    transactional: true,
  },
  {
    id: "progress.chapter_completed",
    family: "progress",
    name: "Journey chapter completed",
    trigger: "Journey progress status becomes chapter_completed or stage_completed",
    platformEvent: "journey_chapter_completed",
    conditions: "Not journey_completed (that is the completion family)",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "chapterId"],
    owner: "imani",
    fallback: "Progress save succeeds even if email fails",
    successMeasure: "One email per user per chapter",
    transactional: true,
  },
  {
    id: "inactivity.journey_nudge",
    family: "inactivity",
    name: "Journey inactivity nudge",
    trigger: "Journey progress unchanged for 7 days and not completed",
    platformEvent: "journey_progress_saved (delayed scan)",
    conditions: "Has progress; status is not journey_completed; delay elapsed",
    delayMs: INACTIVITY_DELAY_MS,
    channel: "email",
    language: "en+es",
    data: ["userId", "chapterId"],
    owner: "imani",
    fallback: "Scan continues; failed sends are recorded and not retried for the same progress timestamp",
    successMeasure: "At most one nudge per inactivity episode (keyed by last progress timestamp)",
    transactional: true,
  },
  {
    id: "completion.journey_completed",
    family: "completion",
    name: "Journey completed",
    trigger: "Journey progress status becomes journey_completed",
    platformEvent: "journey_completed",
    conditions: "Chapter 7 completion recorded — never inferred from stage 7 alone",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "chapterId"],
    owner: "imani",
    fallback: "Certificate/dashboard access is independent of email",
    successMeasure: "One completion email per user",
    transactional: true,
  },
  {
    id: "membership.activated",
    family: "membership",
    name: "Community membership activated",
    trigger: "Community subscription activated",
    platformEvent: "subscription.activated / membership_activated",
    conditions: "Webhook processed; community entitlement granted",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "offerId", "stripeSubscriptionId"],
    owner: "imani",
    fallback: "Membership access is independent of email",
    successMeasure: "Idempotent per Stripe event; lifetime Blueprint access is not affected",
    existingSender: "lib/billing/notifications.ts",
    transactional: true,
  },
  {
    id: "membership.canceled",
    family: "membership",
    name: "Community membership canceled",
    trigger: "Community subscription canceled",
    platformEvent: "subscription.canceled / membership_cancelled",
    conditions: "Webhook processed; paid-through date retained when present",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "offerId", "stripeSubscriptionId"],
    owner: "imani",
    fallback: "Do not revoke lifetime Blueprint access. Record delivery status.",
    successMeasure: "Cancellation email does not imply immediate access removal",
    existingSender: "lib/billing/notifications.ts",
    transactional: true,
  },
  {
    id: "membership.renewed",
    family: "membership",
    name: "Community membership renewed",
    trigger: "invoice.paid with billing_reason subscription_cycle",
    platformEvent: "membership_renewed",
    conditions: "Community offer; recurring invoice paid",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "offerId", "stripeInvoiceId"],
    owner: "imani",
    fallback: "Renewal entitlements stay applied if email fails",
    successMeasure: "One email per paid renewal invoice",
    transactional: true,
  },
  {
    id: "billing.past_due",
    family: "billing",
    name: "Membership billing past due",
    trigger: "Community entitlement marked past_due without a concurrent payment_failed email",
    platformEvent: "entitlement.past_due",
    conditions: "Subscription past_due and payment.failed was not already sent for the same event",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["userId", "stripeSubscriptionId"],
    owner: "imani",
    fallback: "past_due never unlocks access. Billing portal remains the update path.",
    successMeasure: "Architect is directed to Manage billing; no extra Stripe configuration is changed",
    transactional: true,
  },
  {
    id: "support.acknowledged",
    family: "support",
    name: "Support request acknowledged",
    trigger: "Support ticket created from form or inbound email",
    platformEvent: "support_ticket_created",
    conditions: "acknowledge !== false",
    delayMs: 0,
    channel: "email",
    language: "en+es",
    data: ["ticketId"],
    owner: "michelle",
    fallback: "Ticket is stored even when SMTP is unavailable",
    successMeasure: "One acknowledgment per ticket; no passwords or payment data in the message",
    existingSender: "lib/support/acknowledge.ts",
    transactional: true,
  },
] as const;

export function getLifecycleAutomation(
  id: LifecycleAutomationId,
): LifecycleAutomationDefinition {
  const found = LIFECYCLE_AUTOMATIONS.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Unknown lifecycle automation: ${id}`);
  }
  return found;
}

export function automationsForFamily(
  family: LifecycleFamily,
): readonly LifecycleAutomationDefinition[] {
  return LIFECYCLE_AUTOMATIONS.filter((entry) => entry.family === family);
}

export function billingTemplateToAutomationId(
  template: BillingNotificationTemplate,
): LifecycleAutomationId {
  switch (template) {
    case "payment_success":
      return "payment.confirmed";
    case "payment_failed":
      return "payment.failed";
    case "subscription_activated":
      return "membership.activated";
    case "subscription_canceled":
      return "membership.canceled";
    case "refund_notice":
      return "payment.refunded";
  }
}

export function catalogCoversAllFamilies(): boolean {
  const families = new Set(LIFECYCLE_AUTOMATIONS.map((entry) => entry.family));
  return LIFECYCLE_FAMILIES.every((family) => families.has(family));
}

export function catalogIdsMatchType(): boolean {
  const ids = new Set(LIFECYCLE_AUTOMATIONS.map((entry) => entry.id));
  return (
    LIFECYCLE_AUTOMATION_IDS.every((id) => ids.has(id)) &&
    ids.size === LIFECYCLE_AUTOMATION_IDS.length
  );
}
