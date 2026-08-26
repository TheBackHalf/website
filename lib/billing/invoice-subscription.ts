import type Stripe from "stripe";

export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string | undefined {
  const parent = invoice.parent as
    | {
        subscription_details?: {
          subscription?: string | Stripe.Subscription;
        } | null;
      }
    | null
    | undefined;

  const fromParent = parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") {
    return fromParent;
  }
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return fromParent.id;
  }

  const legacy = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  if (typeof legacy.subscription === "string") {
    return legacy.subscription;
  }
  if (legacy.subscription && typeof legacy.subscription === "object") {
    return legacy.subscription.id;
  }

  return undefined;
}
