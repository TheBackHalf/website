import { getBillingStore } from "@/lib/billing/store";
import { getStripe } from "@/lib/checkout/stripe";

/**
 * Resolve the authenticated Architect's Stripe Customer ID from durable records.
 * Never trust client-supplied customer IDs.
 */
export async function resolveStripeCustomerIdForUser(
  userId: string,
): Promise<string | undefined> {
  const store = getBillingStore();
  const [purchases, entitlements] = await Promise.all([
    store.findPurchasesByUserId(userId),
    store.findEntitlementsByUserId(userId),
  ]);

  const fromPurchase = purchases
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((entry) => entry.stripeCustomerId)?.stripeCustomerId;

  if (fromPurchase) {
    return fromPurchase;
  }

  const fromEntitlement = entitlements
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .find((entry) => entry.stripeCustomerId)?.stripeCustomerId;

  return fromEntitlement;
}

/**
 * Ensure a Stripe Customer exists for portal access when the Architect has
 * prior purchase metadata email but no stored customer id yet.
 */
export async function ensureStripeCustomerForUser(input: {
  userId: string;
  email: string;
}): Promise<string | undefined> {
  const existing = await resolveStripeCustomerIdForUser(input.userId);
  if (existing) {
    return existing;
  }

  // Do not invent customers for users with no purchase history.
  const purchases = await getBillingStore().findPurchasesByUserId(input.userId);
  if (purchases.length === 0) {
    return undefined;
  }

  const stripe = getStripe();
  const created = await stripe.customers.create({
    email: input.email,
    metadata: { bh_user_id: input.userId },
  });

  // Persist onto the newest purchase for future resolution.
  const newest = purchases
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (newest) {
    await getBillingStore().upsertPurchase({
      ...newest,
      stripeCustomerId: created.id,
    });
  }

  return created.id;
}
