/**
 * Approved Back Half launch offers (Row 68).
 * Stripe price IDs come from environment configuration only.
 * Never accept client-supplied price IDs or amounts.
 */

export const CHECKOUT_OFFER_IDS = [
  "blueprint",
  "bundle",
  "community",
] as const;

export type CheckoutOfferId = (typeof CHECKOUT_OFFER_IDS)[number];

export type CheckoutMode = "payment" | "subscription";

export type CheckoutOfferDefinition = {
  id: CheckoutOfferId;
  /** Public product name — matches Stripe sandbox product naming. */
  name: string;
  description: string;
  amountCents: number;
  currency: "usd";
  mode: CheckoutMode;
  /** Expected Stripe recurring interval when mode is subscription. */
  interval: "month" | null;
  envPriceKey:
    | "STRIPE_PRICE_BLUEPRINT"
    | "STRIPE_PRICE_BUNDLE"
    | "STRIPE_PRICE_COMMUNITY";
};

export const CHECKOUT_OFFERS: Record<CheckoutOfferId, CheckoutOfferDefinition> =
  {
    blueprint: {
      id: "blueprint",
      name: "The Back Half Blueprint",
      description: "One-time Blueprint purchase.",
      amountCents: 50_000,
      currency: "usd",
      mode: "payment",
      interval: null,
      envPriceKey: "STRIPE_PRICE_BLUEPRINT",
    },
    bundle: {
      id: "bundle",
      name: "Founding Architect",
      description:
        "Blueprint + first six months of Architect Community included. Architect Community launches October 25, 2026. Founding Architect Community period runs October 25, 2026 through April 25, 2027. Enrollment August 31–December 31, 2026.",
      amountCents: 75_000,
      currency: "usd",
      mode: "payment",
      interval: null,
      envPriceKey: "STRIPE_PRICE_BUNDLE",
    },
    community: {
      id: "community",
      name: "The Back Half Community",
      description:
        "Monthly Community membership ($50/month). Architect Community — Coming October 25, 2026. Available after Blueprint completion; Founding Architect renews at $50/month after the first six months.",
      amountCents: 5_000,
      currency: "usd",
      mode: "subscription",
      interval: "month",
      envPriceKey: "STRIPE_PRICE_COMMUNITY",
    },
  };

export function isCheckoutOfferId(value: unknown): value is CheckoutOfferId {
  return (
    typeof value === "string" &&
    (CHECKOUT_OFFER_IDS as readonly string[]).includes(value)
  );
}

export function getCheckoutOffer(
  offerId: CheckoutOfferId,
): CheckoutOfferDefinition {
  return CHECKOUT_OFFERS[offerId];
}

export function formatOfferPrice(offer: CheckoutOfferDefinition): string {
  const dollars = (offer.amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: offer.currency.toUpperCase(),
    minimumFractionDigits: offer.amountCents % 100 === 0 ? 0 : 2,
  });

  if (offer.mode === "subscription" && offer.interval === "month") {
    return `${dollars}/month`;
  }

  return dollars;
}

export function getConfiguredStripePriceId(
  offerId: CheckoutOfferId,
): string | undefined {
  const offer = getCheckoutOffer(offerId);
  const value = process.env[offer.envPriceKey]?.trim();
  return value || undefined;
}

export function listConfiguredCheckoutOffers(): CheckoutOfferDefinition[] {
  return CHECKOUT_OFFER_IDS.map((id) => CHECKOUT_OFFERS[id]);
}
