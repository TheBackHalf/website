import { getStripe } from "@/lib/checkout/stripe";

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(getStripeWebhookSecret());
}

export function constructStripeEvent(
  payload: string | Buffer,
  signature: string,
) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET_MISSING");
  }

  return getStripe().webhooks.constructEvent(payload, signature, secret);
}
