import type Stripe from "stripe";
import { getAuthStore } from "@/lib/auth/store";
import {
  grantOfferEntitlements,
  offerGrants,
  resolveOfferIdFromPriceId,
  revokeEntitlementsForPayment,
} from "@/lib/billing/entitlements";
import { getBillingStore } from "@/lib/billing/store";
import {
  runWebhookSyncEffects,
  type WebhookSyncEffects,
} from "@/lib/billing/sync-effects";
import { getStripe } from "@/lib/checkout/stripe";
import {
  getConfiguredStripePriceId,
  isCheckoutOfferId,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";
import { getInvoiceSubscriptionId } from "@/lib/billing/invoice-subscription";
import { subscriptionPeriodEndIso } from "@/lib/billing/subscription-period";

export type WebhookProcessResult = {
  status: "processed" | "duplicate" | "ignored" | "failed";
  summary: string;
  effects?: WebhookSyncEffects;
};

function customerIdFrom(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if ("deleted" in value && value.deleted) return undefined;
  return value.id;
}

async function resolveUserId(input: {
  metadataUserId?: string | null;
  clientReferenceId?: string | null;
  customerEmail?: string | null;
}): Promise<string | undefined> {
  if (input.metadataUserId) {
    const user = await getAuthStore().findUserById(input.metadataUserId);
    if (user) return user.id;
  }

  if (input.clientReferenceId) {
    const user = await getAuthStore().findUserById(input.clientReferenceId);
    if (user) return user.id;
  }

  if (input.customerEmail) {
    const user = await getAuthStore().findUserByEmail(input.customerEmail);
    if (user) return user.id;
  }

  return undefined;
}

function offerFromSession(
  session: Stripe.Checkout.Session,
): CheckoutOfferId | undefined {
  const fromMeta = session.metadata?.bh_offer_id;
  return isCheckoutOfferId(fromMeta) ? fromMeta : undefined;
}

async function handleCheckoutCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<WebhookProcessResult> {
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return {
      status: "ignored",
      summary: `checkout incomplete payment_status=${session.payment_status}`,
    };
  }

  const offerId = offerFromSession(session);
  if (!offerId) {
    return {
      status: "ignored",
      summary: "checkout missing approved offer metadata",
    };
  }

  const userId = await resolveUserId({
    metadataUserId: session.metadata?.bh_user_id,
    clientReferenceId: session.client_reference_id,
    customerEmail: session.customer_details?.email ?? session.customer_email,
  });

  if (!userId) {
    return {
      status: "failed",
      summary: "checkout could not resolve Back Half user",
    };
  }

  const priceId = getConfiguredStripePriceId(offerId);
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
      const subscription =
        await getStripe().subscriptions.retrieve(subscriptionId);
      communityEndsAt = subscriptionPeriodEndIso(subscription);
    } catch {
      // Session may arrive before subscription is readable; grant a month window.
      communityEndsAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }
  }

  await getBillingStore().upsertPurchase({
    userId,
    offerId,
    status: "paid",
    amountCents: session.amount_total ?? undefined,
    currency: session.currency ?? undefined,
    stripeCustomerId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeSubscriptionId: subscriptionId,
    createdAt: new Date().toISOString(),
    sourceEventId: event.id,
  });

  await grantOfferEntitlements({
    userId,
    offerId,
    eventId: event.id,
    stripeCustomerId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    communityEndsAt,
  });

  return {
    status: "processed",
    summary: `granted ${offerId} entitlements for user`,
    effects: {
      userId,
      offerId,
      stripeCustomerId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      stripeSubscriptionId: subscriptionId,
      paymentSucceeded: true,
      subscriptionActivated: offerId === "community",
      entitlementKindsGranted: offerGrants(offerId),
      marketingAttribution: session.metadata ?? undefined,
      amountCents: session.amount_total ?? undefined,
      currency: session.currency ?? undefined,
    },
  };
}

async function handleCheckoutAsyncFailed(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<WebhookProcessResult> {
  const offerId = offerFromSession(session);
  const userId = await resolveUserId({
    metadataUserId: session.metadata?.bh_user_id,
    clientReferenceId: session.client_reference_id,
    customerEmail: session.customer_details?.email ?? session.customer_email,
  });

  if (userId && offerId) {
    await getBillingStore().upsertPurchase({
      userId,
      offerId,
      status: "failed",
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: customerIdFrom(session.customer),
      createdAt: new Date().toISOString(),
      sourceEventId: event.id,
    });
  }

  return {
    status: "processed",
    summary: "async payment failed; no entitlements granted",
    effects: {
      userId,
      offerId,
      stripeCheckoutSessionId: session.id,
      stripeCustomerId: customerIdFrom(session.customer),
      paymentFailed: true,
    },
  };
}

async function handleInvoicePaid(
  event: Stripe.Event,
  invoice: Stripe.Invoice,
): Promise<WebhookProcessResult> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return { status: "ignored", summary: "invoice.paid without subscription" };
  }

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const offerId =
    (isCheckoutOfferId(subscription.metadata?.bh_offer_id)
      ? subscription.metadata.bh_offer_id
      : undefined) ?? resolveOfferIdFromPriceId(priceId);

  if (offerId !== "community") {
    return {
      status: "ignored",
      summary: "invoice.paid for non-community subscription",
    };
  }

  const userId = await resolveUserId({
    metadataUserId: subscription.metadata?.bh_user_id,
    customerEmail: invoice.customer_email,
  });

  if (!userId) {
    return { status: "failed", summary: "invoice.paid missing user mapping" };
  }

  const endsAt = subscriptionPeriodEndIso(subscription);
  if (!endsAt) {
    return { status: "failed", summary: "invoice.paid missing period end" };
  }

  const stripeCustomerId = customerIdFrom(invoice.customer);

  await getBillingStore().upsertPurchase({
    userId,
    offerId: "community",
    status: "paid",
    amountCents: invoice.amount_paid ?? undefined,
    currency: invoice.currency ?? undefined,
    stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: invoice.id,
    createdAt: new Date().toISOString(),
    sourceEventId: event.id,
  });

  await grantOfferEntitlements({
    userId,
    offerId: "community",
    eventId: event.id,
    stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    communityEndsAt: endsAt,
  });

  return {
    status: "processed",
    summary: `community renewed through ${endsAt}`,
    effects: {
      userId,
      offerId: "community",
      stripeCustomerId,
      stripeSubscriptionId: subscriptionId,
      stripeInvoiceId: invoice.id,
      paymentSucceeded: true,
      entitlementKindsGranted: ["community_access"],
      amountCents: invoice.amount_paid ?? undefined,
      currency: invoice.currency ?? undefined,
    },
  };
}

async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  invoice: Stripe.Invoice,
): Promise<WebhookProcessResult> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    return {
      status: "ignored",
      summary: "invoice.payment_failed without subscription",
    };
  }

  const entitlements =
    await getBillingStore().findEntitlementsBySubscriptionId(subscriptionId);

  for (const entitlement of entitlements) {
    await getBillingStore().upsertEntitlement({
      ...entitlement,
      status: "past_due",
      sourceEventId: event.id,
      reason: "invoice.payment_failed",
    });
  }

  const userId =
    entitlements[0]?.userId ??
    (await resolveUserId({ customerEmail: invoice.customer_email }));

  return {
    status: "processed",
    summary: `marked ${entitlements.length} entitlement(s) past_due`,
    effects: {
      userId,
      offerId: "community",
      stripeSubscriptionId: subscriptionId,
      stripeInvoiceId: invoice.id,
      stripeCustomerId: customerIdFrom(invoice.customer),
      paymentFailed: true,
      entitlementPastDue: entitlements.length > 0,
    },
  };
}

async function syncSubscription(
  event: Stripe.Event,
  subscription: Stripe.Subscription,
): Promise<WebhookProcessResult> {
  const priceId = subscription.items.data[0]?.price.id;
  const offerId =
    (isCheckoutOfferId(subscription.metadata?.bh_offer_id)
      ? subscription.metadata.bh_offer_id
      : undefined) ?? resolveOfferIdFromPriceId(priceId);

  if (offerId !== "community") {
    return { status: "ignored", summary: "subscription event for non-community" };
  }

  const userId = await resolveUserId({
    metadataUserId: subscription.metadata?.bh_user_id,
  });

  const entitlements =
    await getBillingStore().findEntitlementsBySubscriptionId(subscription.id);

  const endsAt = subscriptionPeriodEndIso(subscription);
  const fullyCanceled =
    subscription.status === "canceled" || Boolean(subscription.ended_at);

  let status: "active" | "canceled" | "past_due" = "active";
  if (subscription.status === "past_due") {
    status = "past_due";
  } else if (fullyCanceled) {
    status = "canceled";
  } else if (subscription.cancel_at_period_end) {
    status = "active";
  }

  const stripeCustomerId = customerIdFrom(subscription.customer);

  if (entitlements.length === 0 && userId && status === "active") {
    await grantOfferEntitlements({
      userId,
      offerId: "community",
      eventId: event.id,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      communityEndsAt: endsAt,
      status,
    });
    return {
      status: "processed",
      summary: "subscription synced; community granted",
      effects: {
        userId,
        offerId: "community",
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        subscriptionActivated: true,
        entitlementKindsGranted: ["community_access"],
      },
    };
  }

  for (const entitlement of entitlements) {
    await getBillingStore().upsertEntitlement({
      ...entitlement,
      status,
      endsAt,
      revokedAt:
        status === "canceled" ? new Date().toISOString() : entitlement.revokedAt,
      sourceEventId: event.id,
      reason: `subscription.${subscription.status}`,
      stripeSubscriptionId: subscription.id,
    });
  }

  const resolvedUserId = userId ?? entitlements[0]?.userId;

  return {
    status: "processed",
    summary: `subscription ${subscription.status}; entitlements=${entitlements.length}`,
    effects: {
      userId: resolvedUserId,
      offerId: "community",
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      // Activation email/analytics only on first grant path above; updates sync status only.
      subscriptionCanceled: status === "canceled",
      entitlementPastDue: status === "past_due",
    },
  };
}

async function handleChargeRefunded(
  event: Stripe.Event,
  charge: Stripe.Charge,
): Promise<WebhookProcessResult> {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  const purchase = paymentIntentId
    ? await getBillingStore().findPurchaseByPaymentIntentId(paymentIntentId)
    : await getBillingStore().findPurchaseByChargeId(charge.id);

  if (purchase) {
    await getBillingStore().upsertPurchase({
      ...purchase,
      status: "refunded",
      stripeChargeId: charge.id,
      sourceEventId: event.id,
    });
  }

  const revoked = await revokeEntitlementsForPayment({
    userId: purchase?.userId,
    checkoutSessionId: purchase?.stripeCheckoutSessionId,
    paymentIntentId,
    chargeId: charge.id,
    eventId: event.id,
    reason: "charge.refunded",
  });

  const revokedKinds =
    purchase?.offerId != null ? offerGrants(purchase.offerId) : [];

  return {
    status: "processed",
    summary: `refund reconciled; revoked=${revoked}`,
    effects: {
      userId: purchase?.userId,
      offerId: purchase?.offerId,
      stripeCustomerId: purchase?.stripeCustomerId ?? customerIdFrom(charge.customer),
      stripeChargeId: charge.id,
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: purchase?.stripeCheckoutSessionId,
      refunded: true,
      entitlementKindsRevoked: revokedKinds,
    },
  };
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
): Promise<WebhookProcessResult> {
  const store = getBillingStore();
  const existing = await store.findStripeEvent(event.id);

  if (existing?.status === "processed" || existing?.status === "ignored") {
    return { status: "duplicate", summary: "event already processed" };
  }

  // Failed events are not permanent duplicates — allow retry.
  if (existing?.status === "failed") {
    await store.deleteStripeEvent(event.id);
  }

  let result: WebhookProcessResult;

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        result = await handleCheckoutCompleted(
          event,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "checkout.session.async_payment_failed":
        result = await handleCheckoutAsyncFailed(
          event,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "invoice.paid":
        result = await handleInvoicePaid(
          event,
          event.data.object as Stripe.Invoice,
        );
        break;
      case "invoice.payment_failed":
        result = await handleInvoicePaymentFailed(
          event,
          event.data.object as Stripe.Invoice,
        );
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        result = await syncSubscription(
          event,
          event.data.object as Stripe.Subscription,
        );
        break;
      case "charge.refunded":
        result = await handleChargeRefunded(
          event,
          event.data.object as Stripe.Charge,
        );
        break;
      default:
        result = {
          status: "ignored",
          summary: `unhandled event type ${event.type}`,
        };
    }

    if (result.status === "processed" && result.effects) {
      try {
        await runWebhookSyncEffects({ event, effects: result.effects });
      } catch {
        // Sync effects must not undo entitlement processing; retries use idempotency keys.
      }
    }
  } catch (error) {
    result = {
      status: "failed",
      summary: error instanceof Error ? error.message : "webhook handler failed",
    };
  }

  await store.recordStripeEvent({
    id: event.id,
    type: event.type,
    processedAt: new Date().toISOString(),
    status:
      result.status === "failed"
        ? "failed"
        : result.status === "ignored"
          ? "ignored"
          : "processed",
    summary: result.summary,
  });

  return result;
}
