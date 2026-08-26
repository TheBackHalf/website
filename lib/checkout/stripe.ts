import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Server-only Stripe secret. Never expose to the client. */
export function getStripeSecretKey(): string | undefined {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || undefined;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    getStripeSecretKey() &&
      process.env.STRIPE_PRICE_BLUEPRINT?.trim() &&
      process.env.STRIPE_PRICE_BUNDLE?.trim() &&
      process.env.STRIPE_PRICE_COMMUNITY?.trim(),
  );
}

/** Row 68 launch validation uses Stripe Sandbox (test mode) keys only. */
export function isStripeSandboxKey(secretKey: string): boolean {
  return secretKey.startsWith("sk_test_");
}

export function getStripe(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }

  return stripeClient;
}
