import type Stripe from "stripe";

/**
 * Stripe API basil+ moved billing period timestamps onto subscription items.
 */
export function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription,
): number | undefined {
  const fromItem = subscription.items?.data?.[0] as
    | { current_period_end?: number }
    | undefined;
  if (typeof fromItem?.current_period_end === "number") {
    return fromItem.current_period_end;
  }

  const legacy = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  if (typeof legacy.current_period_end === "number") {
    return legacy.current_period_end;
  }

  if (typeof subscription.cancel_at === "number") {
    return subscription.cancel_at;
  }

  return undefined;
}

export function subscriptionPeriodEndIso(
  subscription: Stripe.Subscription,
): string | undefined {
  const seconds = getSubscriptionPeriodEnd(subscription);
  return typeof seconds === "number"
    ? new Date(seconds * 1000).toISOString()
    : undefined;
}
