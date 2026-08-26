/**
 * Row 69 — durable billing / entitlement records.
 * Row 71 — account access snapshots + outbound payment notification log.
 * Entitlements are never granted from client-side success flags.
 */

import type { CheckoutOfferId } from "@/lib/checkout/offers";

export const ENTITLEMENT_KINDS = ["journey_access", "community_access"] as const;
export type EntitlementKind = (typeof ENTITLEMENT_KINDS)[number];

export const ENTITLEMENT_STATUSES = [
  "active",
  "past_due",
  "canceled",
  "revoked",
  "expired",
] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export type EntitlementRecord = {
  id: string;
  userId: string;
  kind: EntitlementKind;
  status: EntitlementStatus;
  sourceOfferId: CheckoutOfferId;
  stripeCustomerId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  grantedAt: string;
  startsAt: string;
  endsAt?: string;
  revokedAt?: string;
  updatedAt: string;
  sourceEventId?: string;
  reason?: string;
};

export type PurchaseRecord = {
  id: string;
  userId: string;
  offerId: CheckoutOfferId;
  status: "paid" | "failed" | "refunded" | "reversed";
  amountCents?: number;
  currency?: string;
  stripeCustomerId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  stripeInvoiceId?: string;
  stripeChargeId?: string;
  createdAt: string;
  updatedAt: string;
  sourceEventId?: string;
};

export type StripeEventLogRecord = {
  id: string;
  type: string;
  processedAt: string;
  status: "processed" | "ignored" | "failed";
  summary?: string;
};

export const COMMUNITY_SUBSCRIPTION_STATUSES = [
  "none",
  "active",
  "past_due",
  "canceled",
] as const;
export type CommunitySubscriptionStatus =
  (typeof COMMUNITY_SUBSCRIPTION_STATUSES)[number];

/** Durable access snapshot keyed by userId (not stored on UserRecord). */
export type AccountAccessRecord = {
  userId: string;
  journeyAccess: boolean;
  communityAccess: boolean;
  hasPaidPurchase: boolean;
  hasFailedPurchase: boolean;
  hasRefundedPurchase: boolean;
  communitySubscriptionStatus: CommunitySubscriptionStatus;
  stripeCustomerId?: string;
  syncedAt: string;
  source: string;
};

export const BILLING_NOTIFICATION_TEMPLATES = [
  "payment_success",
  "payment_failed",
  "subscription_activated",
  "subscription_canceled",
  "refund_notice",
] as const;
export type BillingNotificationTemplate =
  (typeof BILLING_NOTIFICATION_TEMPLATES)[number];

export type BillingNotificationRecord = {
  id: string;
  idempotencyKey: string;
  userId: string;
  template: BillingNotificationTemplate;
  status:
    | "sent"
    | "skipped_not_configured"
    | "failed"
    | "skipped_duplicate"
    | "skipped_suppressed";
  locale: "en" | "es";
  offerId?: CheckoutOfferId;
  createdAt: string;
  detail?: string;
};

export type BillingDatabase = {
  entitlements: EntitlementRecord[];
  purchases: PurchaseRecord[];
  stripeEvents: StripeEventLogRecord[];
  accountAccess: AccountAccessRecord[];
  notifications: BillingNotificationRecord[];
};
