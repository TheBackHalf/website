/**
 * Server-side offer/price authorization helpers for Row 68.
 * Clients may only submit approved offer IDs — never Stripe price IDs or amounts.
 */

import {
  getConfiguredStripePriceId,
  isCheckoutOfferId,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";

export type PriceAuthorizationResult =
  | { status: "ok"; offerId: CheckoutOfferId; priceId: string }
  | { status: "invalid_offer" }
  | { status: "not_configured" };

/**
 * Resolve the Stripe price exclusively from the approved offer catalog.
 * Any client-supplied price ID or amount is ignored (never trusted).
 */
export function authorizeCheckoutPriceSelection(input: {
  offerId: unknown;
  /** Ignored — never used for pricing. */
  clientPriceId?: unknown;
  /** Ignored — never used for pricing. */
  clientAmount?: unknown;
}): PriceAuthorizationResult {
  void input.clientPriceId;
  void input.clientAmount;

  if (!isCheckoutOfferId(input.offerId)) {
    return { status: "invalid_offer" };
  }

  const configuredPriceId = getConfiguredStripePriceId(input.offerId);
  if (!configuredPriceId) {
    return { status: "not_configured" };
  }

  return {
    status: "ok",
    offerId: input.offerId,
    priceId: configuredPriceId,
  };
}
