import {
  dateEt,
  isRegistrationLandingPath,
  type MarketingAttribution,
} from "@/lib/marketing-kpi/attribution";
import { classifyRecord, isLikelyTestPayment } from "@/lib/marketing-kpi/period";
import { getMarketingKpiStore } from "@/lib/marketing-kpi/store";
import type {
  MarketingEventRecord,
  MarketingPurchaseRecord,
} from "@/lib/marketing-kpi/types";

function sessionKey(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(":");
}

function withClassification<T extends { createdAt: string; test?: boolean; stripeCheckoutSessionId?: string; stripePaymentIntentId?: string }>(
  input: T,
) {
  const test = isLikelyTestPayment(input);
  const classified = classifyRecord({ ...input, test });
  return { ...classified, test };
}

export async function recordLandingPageSession(input: {
  attribution: MarketingAttribution;
  path: string;
  visitorKey: string;
  test?: boolean;
  createdAt?: string;
}): Promise<{ status: "created" | "duplicate" | "ignored"; record?: MarketingEventRecord }> {
  if (!isRegistrationLandingPath(input.path)) {
    return { status: "ignored" };
  }

  const createdAt = input.createdAt ?? new Date().toISOString();
  const day = dateEt(createdAt);
  const classified = withClassification({
    createdAt,
    test: input.test,
  });
  return getMarketingKpiStore().appendEvent({
    name: "landing_page_session",
    createdAt,
    dateEt: day,
    attribution: input.attribution,
    path: input.path.split("?")[0],
    idempotencyKey: sessionKey([
      "landing",
      day,
      input.visitorKey,
      input.path.split("?")[0],
      input.attribution.content || input.attribution.source,
    ]),
    test: classified.test,
    period: classified.period,
    classification: classified.classification,
  });
}

export async function recordCheckoutStart(input: {
  attribution: MarketingAttribution;
  stripeCheckoutSessionId?: string;
  visitorKey?: string;
  test?: boolean;
  createdAt?: string;
}): Promise<{ status: "created" | "duplicate"; record: MarketingEventRecord }> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const day = dateEt(createdAt);
  const classified = withClassification({
    createdAt,
    test: input.test,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
  });
  const idempotencyKey = input.stripeCheckoutSessionId
    ? `checkout:${input.stripeCheckoutSessionId}`
    : sessionKey(["checkout", day, input.visitorKey ?? crypto.randomUUID()]);

  return getMarketingKpiStore().appendEvent({
    name: "checkout_start",
    createdAt,
    dateEt: day,
    attribution: input.attribution,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    idempotencyKey,
    test: classified.test,
    period: classified.period,
    classification: classified.classification,
  });
}

export async function recordPurchase(input: {
  attribution: MarketingAttribution;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeEventId?: string;
  amountCents?: number;
  currency?: string;
  test?: boolean;
  createdAt?: string;
}): Promise<{
  status: "created" | "duplicate";
  record: MarketingEventRecord;
  purchase: MarketingPurchaseRecord;
}> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const day = dateEt(createdAt);
  const classified = withClassification({
    createdAt,
    test: input.test,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    stripePaymentIntentId: input.stripePaymentIntentId,
  });
  const idempotencyKey = input.stripeCheckoutSessionId
    ? `purchase:${input.stripeCheckoutSessionId}`
    : input.stripePaymentIntentId
      ? `purchase:${input.stripePaymentIntentId}`
      : sessionKey(["purchase", day, crypto.randomUUID()]);

  const event = await getMarketingKpiStore().appendEvent({
    name: "purchase",
    createdAt,
    dateEt: day,
    attribution: input.attribution,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    stripeEventId: input.stripeEventId,
    amountCents: input.amountCents,
    currency: input.currency,
    idempotencyKey,
    test: classified.test,
    period: classified.period,
    classification: classified.classification,
  });

  const purchase = await getMarketingKpiStore().upsertPurchase({
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    stripeEventId: input.stripeEventId,
    amountCents: input.amountCents,
    currency: input.currency,
    paidAt: createdAt,
    dateEt: day,
    attribution: input.attribution,
    test: classified.test === true,
    period: classified.period,
    classification: classified.classification,
    status: "paid",
  });

  return {
    status: event.status,
    record: event.record,
    purchase: purchase.record,
  };
}
