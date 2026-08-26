import type Stripe from "stripe";
import { emitAnalyticsEvent } from "@/lib/analytics/emit";
import { getAuthStore } from "@/lib/auth/store";
import { syncAccountAccessStatus } from "@/lib/billing/account-status";
import { resolveStripeCustomerIdForUser } from "@/lib/billing/customer";
import {
  grantOfferEntitlements,
  offerGrants,
  resolveOfferIdFromPriceId,
  revokeEntitlementsForPayment,
} from "@/lib/billing/entitlements";
import { getBillingStore } from "@/lib/billing/store";
import { subscriptionPeriodEndIso } from "@/lib/billing/subscription-period";
import {
  getConfiguredStripePriceId,
  isCheckoutOfferId,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";
import { getStripe } from "@/lib/checkout/stripe";

export type ReconcileUserBillingResult = {
  status: "ok" | "no_customer" | "user_not_found" | "stripe_unavailable";
  userId: string;
  stripeCustomerId?: string;
  recoveredPurchases: number;
  recoveredEntitlements: number;
  updatedPurchases: number;
  updatedEntitlements: number;
};

function customerIdFrom(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if ("deleted" in value && value.deleted) return undefined;
  return value.id;
}

async function resolveStripeCustomerIdForReconcile(
  userId: string,
): Promise<string | undefined> {
  const local = await resolveStripeCustomerIdForUser(userId);
  if (local) return local;

  const user = await getAuthStore().findUserById(userId);
  if (!user) return undefined;

  const stripe = getStripe();

  try {
    const searched = await stripe.customers.search({
      query: `metadata['bh_user_id']:'${userId}'`,
      limit: 1,
    });
    if (searched.data[0]?.id) {
      return searched.data[0].id;
    }
  } catch {
    // Search may be unavailable in some sandbox modes; fall through.
  }

  const listed = await stripe.customers.list({ email: user.email, limit: 10 });
  const matched =
    listed.data.find((entry) => entry.metadata?.bh_user_id === userId) ??
    listed.data[0];
  return matched?.id;
}

function offerFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
  priceId?: string | null,
): CheckoutOfferId | undefined {
  if (isCheckoutOfferId(metadata?.bh_offer_id)) {
    return metadata.bh_offer_id;
  }
  return resolveOfferIdFromPriceId(priceId);
}

async function recoverPaidCheckoutSession(input: {
  userId: string;
  session: Stripe.Checkout.Session;
  source: string;
}): Promise<{ purchase: boolean; entitlements: number }> {
  const session = input.session;
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return { purchase: false, entitlements: 0 };
  }

  const offerId = offerFromMetadata(session.metadata);
  if (!offerId) {
    return { purchase: false, entitlements: 0 };
  }

  const store = getBillingStore();
  const existing = await store.findPurchaseByCheckoutSessionId(session.id);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const stripeCustomerId = customerIdFrom(session.customer);

  let communityEndsAt: string | undefined;
  if (offerId === "community" && subscriptionId) {
    try {
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      communityEndsAt = subscriptionPeriodEndIso(subscription);
    } catch {
      communityEndsAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }
  } else if (offerId === "bundle") {
    // grantOfferEntitlements derives bundle community year when endsAt omitted.
    communityEndsAt = undefined;
  }

  const wasMissing = !existing || existing.status !== "paid";
  await store.upsertPurchase({
    userId: input.userId,
    offerId,
    status: "paid",
    amountCents: session.amount_total ?? undefined,
    currency: session.currency ?? undefined,
    stripeCustomerId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeSubscriptionId: subscriptionId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    sourceEventId: input.source,
  });

  const before = await store.findEntitlementsByUserId(input.userId);
  await grantOfferEntitlements({
    userId: input.userId,
    offerId,
    eventId: input.source,
    stripeCustomerId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: getConfiguredStripePriceId(offerId),
    communityEndsAt,
  });
  const after = await store.findEntitlementsByUserId(input.userId);
  const recoveredEntitlements = Math.max(0, after.length - before.length);

  return {
    purchase: wasMissing,
    entitlements: recoveredEntitlements > 0 ? offerGrants(offerId).length : 0,
  };
}

async function recoverPaidPaymentIntent(input: {
  userId: string;
  paymentIntent: Stripe.PaymentIntent;
  source: string;
}): Promise<{ purchase: boolean; entitlements: number }> {
  const pi = input.paymentIntent;
  if (pi.status !== "succeeded") {
    return { purchase: false, entitlements: 0 };
  }

  const offerId = offerFromMetadata(pi.metadata);
  if (!offerId || offerId === "community") {
    return { purchase: false, entitlements: 0 };
  }

  const store = getBillingStore();
  const existing = await store.findPurchaseByPaymentIntentId(pi.id);
  const stripeCustomerId = customerIdFrom(pi.customer);

  const wasMissing = !existing || existing.status !== "paid";
  await store.upsertPurchase({
    userId: input.userId,
    offerId,
    status: "paid",
    amountCents: pi.amount_received || pi.amount,
    currency: pi.currency,
    stripeCustomerId,
    stripePaymentIntentId: pi.id,
    stripeCheckoutSessionId: existing?.stripeCheckoutSessionId,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    sourceEventId: input.source,
  });

  const before = await store.findEntitlementsByUserId(input.userId);
  await grantOfferEntitlements({
    userId: input.userId,
    offerId,
    eventId: input.source,
    stripeCustomerId,
    stripePaymentIntentId: pi.id,
    stripeCheckoutSessionId: existing?.stripeCheckoutSessionId,
    stripePriceId: getConfiguredStripePriceId(offerId),
  });
  const after = await store.findEntitlementsByUserId(input.userId);
  const recoveredEntitlements = Math.max(0, after.length - before.length);

  return {
    purchase: wasMissing,
    entitlements: recoveredEntitlements > 0 ? offerGrants(offerId).length : 0,
  };
}

async function syncCommunitySubscription(input: {
  userId: string;
  subscription: Stripe.Subscription;
  source: string;
}): Promise<{ updated: boolean; recovered: boolean }> {
  const subscription = input.subscription;
  const priceId = subscription.items.data[0]?.price.id;
  const offerId = offerFromMetadata(subscription.metadata, priceId);
  if (offerId !== "community") {
    return { updated: false, recovered: false };
  }

  const store = getBillingStore();
  const existing = await store.findEntitlementsBySubscriptionId(subscription.id);
  const endsAt = subscriptionPeriodEndIso(subscription);
  const fullyCanceled =
    subscription.status === "canceled" || Boolean(subscription.ended_at);

  let status: "active" | "canceled" | "past_due" = "active";
  if (subscription.status === "past_due") {
    status = "past_due";
  } else if (fullyCanceled) {
    status = "canceled";
  } else if (
    subscription.status === "active" ||
    subscription.status === "trialing"
  ) {
    status = "active";
  } else if (subscription.status === "unpaid") {
    status = "past_due";
  } else {
    status = fullyCanceled ? "canceled" : "active";
  }

  const stripeCustomerId = customerIdFrom(subscription.customer);
  const recovered = existing.length === 0 && status === "active";

  if (existing.length === 0 && status === "active") {
    await grantOfferEntitlements({
      userId: input.userId,
      offerId: "community",
      eventId: input.source,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      communityEndsAt: endsAt,
      status,
    });
    await store.upsertPurchase({
      userId: input.userId,
      offerId: "community",
      status: "paid",
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      createdAt: new Date().toISOString(),
      sourceEventId: input.source,
    });
    return { updated: true, recovered: true };
  }

  let updated = false;
  for (const entitlement of existing) {
    if (
      entitlement.status !== status ||
      entitlement.endsAt !== endsAt ||
      entitlement.stripeSubscriptionId !== subscription.id
    ) {
      updated = true;
    }
    await store.upsertEntitlement({
      ...entitlement,
      status,
      endsAt,
      revokedAt:
        status === "canceled" ? new Date().toISOString() : entitlement.revokedAt,
      sourceEventId: input.source,
      reason: `reconcile:subscription.${subscription.status}`,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
    });
  }

  return { updated, recovered };
}

async function syncRefundedCharge(input: {
  userId: string;
  charge: Stripe.Charge;
  source: string;
}): Promise<{ updated: boolean }> {
  if (!input.charge.refunded && (input.charge.amount_refunded ?? 0) <= 0) {
    return { updated: false };
  }

  const paymentIntentId =
    typeof input.charge.payment_intent === "string"
      ? input.charge.payment_intent
      : input.charge.payment_intent?.id;

  const store = getBillingStore();
  const purchase = paymentIntentId
    ? await store.findPurchaseByPaymentIntentId(paymentIntentId)
    : await store.findPurchaseByChargeId(input.charge.id);

  if (!purchase || purchase.userId !== input.userId) {
    return { updated: false };
  }

  const purchaseWasOpen = purchase.status !== "refunded";
  await store.upsertPurchase({
    ...purchase,
    status: "refunded",
    stripeChargeId: input.charge.id,
    sourceEventId: input.source,
  });

  const revoked = await revokeEntitlementsForPayment({
    userId: input.userId,
    checkoutSessionId: purchase.stripeCheckoutSessionId,
    paymentIntentId,
    chargeId: input.charge.id,
    eventId: input.source,
    reason: "reconcile:charge.refunded",
    offerId: purchase.offerId,
  });

  return { updated: purchaseWasOpen || revoked > 0 };
}

/**
 * Server-only Stripe ↔ local billing reconciliation for one Architect.
 * Does not send transactional email (avoids duplicate blasts).
 */
export async function reconcileUserBilling(
  userId: string,
): Promise<ReconcileUserBillingResult> {
  const user = await getAuthStore().findUserById(userId);
  if (!user) {
    return {
      status: "user_not_found",
      userId,
      recoveredPurchases: 0,
      recoveredEntitlements: 0,
      updatedPurchases: 0,
      updatedEntitlements: 0,
    };
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return {
      status: "stripe_unavailable",
      userId,
      recoveredPurchases: 0,
      recoveredEntitlements: 0,
      updatedPurchases: 0,
      updatedEntitlements: 0,
    };
  }

  const stripeCustomerId = await resolveStripeCustomerIdForReconcile(userId);
  if (!stripeCustomerId) {
    await syncAccountAccessStatus(userId, "reconcile:no_customer");
    return {
      status: "no_customer",
      userId,
      recoveredPurchases: 0,
      recoveredEntitlements: 0,
      updatedPurchases: 0,
      updatedEntitlements: 0,
    };
  }

  const source = `reconcile:${new Date().toISOString()}`;
  let recoveredPurchases = 0;
  let recoveredEntitlements = 0;
  let updatedPurchases = 0;
  let updatedEntitlements = 0;

  const sessions = await stripe.checkout.sessions.list({
    customer: stripeCustomerId,
    limit: 100,
  });

  for (const session of sessions.data) {
    const result = await recoverPaidCheckoutSession({
      userId,
      session,
      source,
    });
    if (result.purchase) recoveredPurchases += 1;
    recoveredEntitlements += result.entitlements;
  }

  const paymentIntents = await stripe.paymentIntents.list({
    customer: stripeCustomerId,
    limit: 100,
  });

  for (const paymentIntent of paymentIntents.data) {
    const result = await recoverPaidPaymentIntent({
      userId,
      paymentIntent,
      source,
    });
    if (result.purchase) recoveredPurchases += 1;
    recoveredEntitlements += result.entitlements;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
  });

  for (const subscription of subscriptions.data) {
    const result = await syncCommunitySubscription({
      userId,
      subscription,
      source,
    });
    if (result.recovered) {
      recoveredEntitlements += 1;
      recoveredPurchases += 1;
    } else if (result.updated) {
      updatedEntitlements += 1;
    }
  }

  const charges = await stripe.charges.list({
    customer: stripeCustomerId,
    limit: 100,
  });

  for (const charge of charges.data) {
    const result = await syncRefundedCharge({ userId, charge, source });
    if (result.updated) {
      updatedPurchases += 1;
      updatedEntitlements += 1;
    }
  }

  await syncAccountAccessStatus(userId, "reconcile");

  await emitAnalyticsEvent({
    name: "billing.reconciled",
    userId,
    idempotencyKey: `billing.reconciled:${userId}:${source}`,
    payload: {
      source: "reconcile",
      stripeCustomerId,
      recoveredPurchases,
      recoveredEntitlements,
      updatedPurchases,
      updatedEntitlements,
    },
  });

  return {
    status: "ok",
    userId,
    stripeCustomerId,
    recoveredPurchases,
    recoveredEntitlements,
    updatedPurchases,
    updatedEntitlements,
  };
}
