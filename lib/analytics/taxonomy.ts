/**
 * Row 150 — canonical product event taxonomy.
 * Billing ledger names from Row 71 are preserved (dotted).
 * Marketing KPI names from Row 84 stay in the marketing store.
 * New product events use snake_case as specified for Row 150.
 */

export const EVENT_VERSION = 1;

export const BILLING_EVENT_NAMES = [
  "checkout.payment_succeeded",
  "checkout.payment_failed",
  "subscription.activated",
  "subscription.canceled",
  "payment.refunded",
  "entitlement.granted",
  "entitlement.revoked",
  "entitlement.past_due",
  "account_access.synced",
  "billing.reconciled",
] as const;

export const PRODUCT_EVENT_NAMES = [
  "page_viewed",
  "cta_clicked",
  "registration_viewed",
  "registration_started",
  "registration_method_selected",
  "registration_submitted",
  "registration_succeeded",
  "registration_failed",
  "email_verification_required",
  "email_verified",
  "auth_failed",
  "checkout_viewed",
  "checkout_started",
  "checkout_completed",
  "checkout_failed",
  "purchase_completed",
  "onboarding_started",
  "onboarding_step_viewed",
  "onboarding_step_completed",
  "onboarding_completed",
  "journey_entered",
  "journey_chapter_started",
  "journey_chapter_completed",
  "journey_progress_saved",
  "journey_resumed",
  "journey_completed",
  "journey_save_failed",
  "lumina_opened",
  "lumina_session_started",
  "lumina_message_sent",
  "lumina_response_received",
  "lumina_error",
  "entrance_viewed",
  "entrance_entered",
  "entrance_skipped",
  "download_started",
  "download_completed",
  "download_failed",
  "completion_experience_viewed",
  "certificate_generated",
  "certificate_downloaded",
  "membership_started",
  "membership_activated",
  "membership_renewed",
  "membership_payment_failed",
  "membership_cancelled",
] as const;

export const CLIENT_EVENT_NAMES = [
  "page_viewed",
  "cta_clicked",
  "registration_viewed",
  "registration_started",
  "registration_method_selected",
  "registration_submitted",
  "checkout_viewed",
  "entrance_viewed",
  "entrance_entered",
  "entrance_skipped",
] as const;

export type BillingEventName = (typeof BILLING_EVENT_NAMES)[number];
export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];
export type ClientEventName = (typeof CLIENT_EVENT_NAMES)[number];
export type AnalyticsEventName = BillingEventName | ProductEventName;

export const ANALYTICS_EVENT_NAMES = [
  ...BILLING_EVENT_NAMES,
  ...PRODUCT_EVENT_NAMES,
] as const;

/** Row 150 committed coverage (website through membership). Excludes cinematic-entrance extras. */
export const REQUIRED_ROW_150_PRODUCT_EVENT_NAMES = PRODUCT_EVENT_NAMES.filter(
  (name) => !name.startsWith("entrance_"),
);

export const CINEMATIC_ENTRANCE_EVENT_NAMES = PRODUCT_EVENT_NAMES.filter((name) =>
  name.startsWith("entrance_"),
);

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}

export function isClientEventName(value: string): value is ClientEventName {
  return (CLIENT_EVENT_NAMES as readonly string[]).includes(value);
}

export type ProductArea =
  | "website"
  | "registration"
  | "checkout"
  | "onboarding"
  | "journey"
  | "lumina"
  | "downloads"
  | "completion"
  | "membership"
  | "auth";

export function productAreaFromPath(path: string): ProductArea {
  const clean = path.split("?")[0] ?? path;
  if (clean.includes("/register")) return "registration";
  if (clean.includes("/checkout")) return "checkout";
  if (clean.includes("/onboarding")) return "onboarding";
  if (clean.includes("/architect/journey") || clean.includes("/architect/assessment")) {
    return "journey";
  }
  if (clean.includes("/lumina")) return "lumina";
  if (clean.includes("/architect")) return "journey";
  return "website";
}
