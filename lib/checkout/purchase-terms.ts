import type { CheckoutOfferId } from "@/lib/checkout/offers";

/**
 * Material purchase terms displayed on checkout BEFORE the billing
 * acknowledgment checkbox. Do not hide these solely inside the checkbox.
 */
export const CHECKOUT_PURCHASE_TERMS: Record<
  CheckoutOfferId,
  readonly string[]
> = {
  blueprint: ["Blueprint — $500 one-time payment", "NO REFUNDS"],
  bundle: [
    "Founding Architect — $750 one-time payment",
    "Founding Architect includes Blueprint + first six months of Architect Community",
    "Architect Community launches October 25, 2026",
    "Founding Architect Community period runs October 25, 2026 through April 25, 2027",
    "NO REFUNDS",
  ],
  community: [
    "standalone Architect Community — $50/month",
    "Architect Community launches October 25, 2026",
    "NO REFUNDS",
  ],
};

export function getCheckoutPurchaseTerms(
  offerId: CheckoutOfferId,
): readonly string[] {
  return CHECKOUT_PURCHASE_TERMS[offerId];
}
