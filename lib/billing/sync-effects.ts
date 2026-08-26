import type Stripe from "stripe";
import { emitAnalyticsEvent } from "@/lib/analytics/emit";
import type { AnalyticsEventName } from "@/lib/analytics/types";
import { syncAccountAccessStatus } from "@/lib/billing/account-status";
import { sendBillingNotification } from "@/lib/billing/notifications";
import type { BillingNotificationTemplate } from "@/lib/billing/types";
import type { CheckoutOfferId } from "@/lib/checkout/offers";
import type { EntitlementKind } from "@/lib/billing/types";
import { parseAttributionFromStripeMetadata } from "@/lib/marketing-kpi/attribution";
import { recordPurchase } from "@/lib/marketing-kpi/collect";
import { trackProductEvent } from "@/lib/analytics/track";

export type WebhookSyncEffects = {
  userId?: string;
  offerId?: CheckoutOfferId;
  stripeCustomerId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  stripeChargeId?: string;
  stripeInvoiceId?: string;
  amountCents?: number;
  currency?: string;
  paymentSucceeded?: boolean;
  paymentFailed?: boolean;
  subscriptionActivated?: boolean;
  subscriptionCanceled?: boolean;
  refunded?: boolean;
  entitlementKindsGranted?: EntitlementKind[];
  entitlementKindsRevoked?: EntitlementKind[];
  entitlementPastDue?: boolean;
  marketingAttribution?: Record<string, string>;
};

/**
 * Post-webhook orchestration — analytics, transactional email, account sync.
 * Called only when the webhook handler status is `processed`.
 * Does not change entitlement grant rules.
 */
export async function runWebhookSyncEffects(input: {
  event: Stripe.Event;
  effects: WebhookSyncEffects;
}): Promise<void> {
  const { event, effects } = input;
  const userId = effects.userId;
  const eventId = event.id;

  const analyticsJobs: Array<{
    name: AnalyticsEventName;
    suffix: string;
    payload?: Record<string, unknown>;
  }> = [];

  if (effects.paymentSucceeded) {
    analyticsJobs.push({
      name: "checkout.payment_succeeded",
      suffix: "checkout.payment_succeeded",
      payload: {
        offerId: effects.offerId,
        stripeCheckoutSessionId: effects.stripeCheckoutSessionId,
        stripePaymentIntentId: effects.stripePaymentIntentId,
        stripeInvoiceId: effects.stripeInvoiceId,
        stripeCustomerId: effects.stripeCustomerId,
      },
    });
  }

  if (effects.paymentFailed) {
    analyticsJobs.push({
      name: "checkout.payment_failed",
      suffix: "checkout.payment_failed",
      payload: {
        offerId: effects.offerId,
        stripeCheckoutSessionId: effects.stripeCheckoutSessionId,
        stripeInvoiceId: effects.stripeInvoiceId,
        stripeCustomerId: effects.stripeCustomerId,
      },
    });
  }

  if (effects.subscriptionActivated) {
    analyticsJobs.push({
      name: "subscription.activated",
      suffix: "subscription.activated",
      payload: {
        offerId: effects.offerId ?? "community",
        stripeSubscriptionId: effects.stripeSubscriptionId,
        stripeCustomerId: effects.stripeCustomerId,
      },
    });
  }

  if (effects.subscriptionCanceled) {
    analyticsJobs.push({
      name: "subscription.canceled",
      suffix: "subscription.canceled",
      payload: {
        offerId: effects.offerId ?? "community",
        stripeSubscriptionId: effects.stripeSubscriptionId,
        stripeCustomerId: effects.stripeCustomerId,
      },
    });
  }

  if (effects.refunded) {
    analyticsJobs.push({
      name: "payment.refunded",
      suffix: "payment.refunded",
      payload: {
        offerId: effects.offerId,
        stripeChargeId: effects.stripeChargeId,
        stripePaymentIntentId: effects.stripePaymentIntentId,
        stripeCustomerId: effects.stripeCustomerId,
      },
    });
  }

  for (const kind of effects.entitlementKindsGranted ?? []) {
    analyticsJobs.push({
      name: "entitlement.granted",
      suffix: `entitlement.granted:${kind}`,
      payload: {
        kind,
        offerId: effects.offerId,
        stripeCheckoutSessionId: effects.stripeCheckoutSessionId,
        stripeSubscriptionId: effects.stripeSubscriptionId,
      },
    });
  }

  for (const kind of effects.entitlementKindsRevoked ?? []) {
    analyticsJobs.push({
      name: "entitlement.revoked",
      suffix: `entitlement.revoked:${kind}`,
      payload: {
        kind,
        offerId: effects.offerId,
        stripeChargeId: effects.stripeChargeId,
        stripePaymentIntentId: effects.stripePaymentIntentId,
      },
    });
  }

  if (effects.entitlementPastDue) {
    analyticsJobs.push({
      name: "entitlement.past_due",
      suffix: "entitlement.past_due",
      payload: {
        stripeSubscriptionId: effects.stripeSubscriptionId,
        stripeInvoiceId: effects.stripeInvoiceId,
      },
    });
  }

  for (const job of analyticsJobs) {
    await emitAnalyticsEvent({
      name: job.name,
      userId,
      idempotencyKey: `${eventId}:${job.suffix}`,
      payload: job.payload,
    });
  }

  if (effects.paymentSucceeded && effects.stripeCheckoutSessionId) {
    const attribution = parseAttributionFromStripeMetadata(
      effects.marketingAttribution,
    );
    await recordPurchase({
      attribution,
      stripeCheckoutSessionId: effects.stripeCheckoutSessionId,
      stripePaymentIntentId: effects.stripePaymentIntentId,
      stripeEventId: event.id,
      amountCents: effects.amountCents,
      currency: effects.currency,
      test: event.livemode === false,
      createdAt: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    });
    await trackProductEvent({
      name: "checkout_completed",
      userId,
      productArea: "checkout",
      attribution,
      idempotencyKey: `checkout_completed:${effects.stripeCheckoutSessionId}`,
      payload: {
        offerId: effects.offerId,
        stripeCheckoutSessionId: effects.stripeCheckoutSessionId,
      },
    });
    await trackProductEvent({
      name: "purchase_completed",
      userId,
      productArea: "checkout",
      attribution,
      idempotencyKey: `purchase_completed:${effects.stripeCheckoutSessionId}`,
      payload: {
        offerId: effects.offerId,
        stripeCheckoutSessionId: effects.stripeCheckoutSessionId,
      },
    });
  }

  if (effects.paymentFailed) {
    await trackProductEvent({
      name: "checkout_failed",
      userId,
      productArea: "checkout",
      idempotencyKey: `checkout_failed:${effects.stripeCheckoutSessionId ?? event.id}`,
      payload: {
        offerId: effects.offerId,
        errorCategory: "payment_failed",
        stripeCheckoutSessionId: effects.stripeCheckoutSessionId,
      },
    });
  }

  if (effects.subscriptionActivated) {
    await trackProductEvent({
      name: "membership_started",
      userId,
      productArea: "membership",
      idempotencyKey: `membership_started:${effects.stripeSubscriptionId ?? event.id}`,
      payload: { offerId: effects.offerId ?? "community" },
    });
    await trackProductEvent({
      name: "membership_activated",
      userId,
      productArea: "membership",
      idempotencyKey: `membership_activated:${effects.stripeSubscriptionId ?? event.id}`,
      payload: { offerId: effects.offerId ?? "community" },
    });
  }

  if (event.type === "invoice.paid" && effects.offerId === "community") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.billing_reason === "subscription_cycle") {
      await trackProductEvent({
        name: "membership_renewed",
        userId,
        productArea: "membership",
        idempotencyKey: `membership_renewed:${invoice.id}`,
        payload: { offerId: "community", stripeInvoiceId: invoice.id },
      });
    }
  }

  if (effects.subscriptionCanceled) {
    await trackProductEvent({
      name: "membership_cancelled",
      userId,
      productArea: "membership",
      idempotencyKey: `membership_cancelled:${effects.stripeSubscriptionId ?? event.id}`,
      payload: { offerId: effects.offerId ?? "community" },
    });
  }

  if (effects.paymentFailed && effects.offerId === "community") {
    await trackProductEvent({
      name: "membership_payment_failed",
      userId,
      productArea: "membership",
      idempotencyKey: `membership_payment_failed:${effects.stripeInvoiceId ?? event.id}`,
      payload: { offerId: "community", errorCategory: "payment_failed" },
    });
  }

  if (userId) {
    const notifications: Array<{
      template: BillingNotificationTemplate;
      offerId?: CheckoutOfferId;
    }> = [];

    if (effects.paymentSucceeded) {
      notifications.push({
        template: "payment_success",
        offerId: effects.offerId,
      });
    }
    if (effects.paymentFailed) {
      notifications.push({
        template: "payment_failed",
        offerId: effects.offerId,
      });
    }
    if (effects.subscriptionActivated) {
      notifications.push({
        template: "subscription_activated",
        offerId: effects.offerId ?? "community",
      });
    }
    if (effects.subscriptionCanceled) {
      notifications.push({
        template: "subscription_canceled",
        offerId: effects.offerId ?? "community",
      });
    }
    if (effects.refunded) {
      notifications.push({
        template: "refund_notice",
        offerId: effects.offerId,
      });
    }

    for (const notification of notifications) {
      await sendBillingNotification({
        userId,
        template: notification.template,
        idempotencyKey: `${eventId}:${notification.template}`,
        offerId: notification.offerId,
      });
    }

    if (event.type === "invoice.paid" && effects.offerId === "community") {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason === "subscription_cycle") {
        await dispatchLifecycleQuiet({
          automationId: "membership.renewed",
          userId,
          idempotencyKey: `lifecycle:membership.renewed:${invoice.id}`,
          payload: {
            offerId: "community",
            stripeInvoiceId: invoice.id,
            source: "invoice.paid",
          },
        });
      }
    }

    if (effects.entitlementPastDue && !effects.paymentFailed) {
      await dispatchLifecycleQuiet({
        automationId: "billing.past_due",
        userId,
        idempotencyKey: `lifecycle:billing.past_due:${effects.stripeSubscriptionId ?? event.id}`,
        payload: {
          offerId: effects.offerId ?? "community",
          stripeSubscriptionId: effects.stripeSubscriptionId,
          source: event.type,
        },
      });
    }

    await syncAccountAccessStatus(userId, `webhook:${event.type}`);
  }
}

async function dispatchLifecycleQuiet(input: {
  automationId: "membership.renewed" | "billing.past_due";
  userId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const { dispatchLifecycleAutomation } = await import("@/lib/lifecycle/dispatch");
    await dispatchLifecycleAutomation(input);
  } catch {
    // Lifecycle email must not block webhook processing.
  }
}
