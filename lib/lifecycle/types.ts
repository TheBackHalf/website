/**
 * Row 147 — lifecycle automation types.
 * Connects platform events to the approved automation map.
 */

import type { Locale } from "@/lib/i18n/config";

export const LIFECYCLE_FAMILIES = [
  "account",
  "payment",
  "progress",
  "inactivity",
  "completion",
  "membership",
  "billing",
  "support",
] as const;
export type LifecycleFamily = (typeof LIFECYCLE_FAMILIES)[number];

export const LIFECYCLE_AUTOMATION_IDS = [
  "account.verification",
  "account.password_reset",
  "account.verified",
  "payment.confirmed",
  "payment.failed",
  "payment.refunded",
  "progress.onboarding_completed",
  "progress.chapter_completed",
  "inactivity.journey_nudge",
  "completion.journey_completed",
  "membership.activated",
  "membership.canceled",
  "membership.renewed",
  "billing.past_due",
  "support.acknowledged",
] as const;
export type LifecycleAutomationId = (typeof LIFECYCLE_AUTOMATION_IDS)[number];

export const LIFECYCLE_DISPATCH_STATUSES = [
  "sent",
  "skipped_not_configured",
  "failed",
  "skipped_duplicate",
  "recorded_existing",
] as const;
export type LifecycleDispatchStatus = (typeof LIFECYCLE_DISPATCH_STATUSES)[number];

export const LIFECYCLE_CHANNELS = ["email", "ledger"] as const;
export type LifecycleChannel = (typeof LIFECYCLE_CHANNELS)[number];

export type LifecycleAutomationDefinition = {
  id: LifecycleAutomationId;
  family: LifecycleFamily;
  name: string;
  trigger: string;
  platformEvent: string;
  conditions: string;
  delayMs: number;
  channel: LifecycleChannel;
  language: "en+es";
  data: string[];
  owner: "imani" | "nia" | "michelle";
  fallback: string;
  successMeasure: string;
  /** Existing product sender already delivers this message. */
  existingSender?: string;
  transactional: true;
};

export type LifecycleDispatchRecord = {
  id: string;
  automationId: LifecycleAutomationId;
  family: LifecycleFamily;
  userId?: string;
  idempotencyKey: string;
  status: LifecycleDispatchStatus;
  channel: LifecycleChannel;
  locale: Locale;
  createdAt: string;
  detail?: string;
  payload?: Record<string, unknown>;
  test?: boolean;
};

export type LifecycleDatabase = {
  dispatches: LifecycleDispatchRecord[];
};

export type LifecycleDispatchInput = {
  automationId: LifecycleAutomationId;
  idempotencyKey: string;
  userId?: string;
  email?: string;
  firstName?: string;
  locale?: Locale;
  payload?: Record<string, unknown>;
  test?: boolean;
  /**
   * When the product already sent the email (verification, billing, support),
   * ledger the trigger without sending a second message.
   */
  existingDelivery?: {
    status: Exclude<LifecycleDispatchStatus, "skipped_duplicate">;
    detail?: string;
  };
};

export type LifecycleDispatchResult = {
  status: LifecycleDispatchStatus;
  record?: LifecycleDispatchRecord;
};
