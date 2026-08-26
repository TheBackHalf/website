/**
 * First-party durable event ledger.
 * Row 71 billing events + Row 150 product events.
 */

export {
  ANALYTICS_EVENT_NAMES,
  BILLING_EVENT_NAMES,
  PRODUCT_EVENT_NAMES,
  type AnalyticsEventName,
  type BillingEventName,
  type ProductEventName,
} from "@/lib/analytics/taxonomy";

import type { AnalyticsEventName } from "@/lib/analytics/taxonomy";

export type AnalyticsEventRecord = {
  id: string;
  name: AnalyticsEventName;
  userId?: string;
  idempotencyKey: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
  createdAt: string;
  test?: boolean;
};

export type AnalyticsDatabase = {
  events: AnalyticsEventRecord[];
};
