/**
 * Production-only Row 73 live Stripe catalog + webhook bootstrap.
 * Uses the runtime STRIPE_SECRET_KEY (Sensitive values cannot be pulled locally).
 * Never logs secret values. Does not create products or change prices.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";

import { CHECKOUT_OFFERS } from "@/lib/checkout/offers";
import {
  getStripe,
  getStripeSecretKey,
  isStripeSandboxKey,
} from "@/lib/checkout/stripe";

export const ROW73_LIVE_WEBHOOK_URL =
  "https://website-two-psi-49.vercel.app/api/stripe/webhook";

export const ROW73_CONSUMED_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "charge.refunded",
] as const;

const SANDBOX_PRICE_IDS = new Set([
  "price_1U28xOHJT6n1KQ2qyOAev08y",
  "price_1U29DFHJT6n1KQ2qYsTrKUsV",
  "price_1U29WyHJT6n1KQ2qD7kBLfsr",
]);

export type Row73LivePriceMap = {
  offerId: "blueprint" | "bundle" | "community";
  productName: string;
  priceId: string;
  unitAmount: number | null;
  currency: string | null;
  type: string | null;
  interval: string | null;
  livemode: boolean | null;
};

export type Row73StripeLiveConnectResult = {
  keyClass: "live" | "test" | "missing" | "unknown";
  chargesEnabled: boolean | null;
  payoutsEnabled: boolean | null;
  detailsSubmitted: boolean | null;
  disabledReason: string | null;
  currentlyDueCount: number;
  currentlyDueIds: string[];
  products: {
    blueprint: "FOUND" | "NOT FOUND";
    bundle: "FOUND" | "NOT FOUND";
    community: "FOUND" | "NOT FOUND";
  };
  prices: Row73LivePriceMap[];
  webhook: {
    url: string;
    id: string | null;
    action: string;
    events: string[];
    secretPresent: boolean;
    secret?: string;
  };
  checkoutSessions: Array<{
    offerId: string;
    mode: string;
    sessionId: string;
    livemode: boolean | null;
    urlHost: string;
    expired: boolean;
  }>;
};

function productNameOf(price: Stripe.Price): string {
  if (price.product && typeof price.product === "object" && "name" in price.product) {
    const name = price.product.name;
    return typeof name === "string" ? name : "";
  }
  return "";
}

function matchPrice(
  prices: Stripe.Price[],
  expected: {
    amount: number;
    type: "one_time" | "recurring";
    interval?: "month";
    nameHints: string[];
  },
): Stripe.Price | null {
  const candidates = prices.filter((price) => {
    if (!price.active) return false;
    if (price.currency !== "usd") return false;
    if (price.unit_amount !== expected.amount) return false;
    if (price.type !== expected.type) return false;
    if (expected.type === "recurring" && price.recurring?.interval !== expected.interval) {
      return false;
    }
    if (!price.id.startsWith("price_")) return false;
    if (SANDBOX_PRICE_IDS.has(price.id)) return false;
    if (price.livemode === false) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  const named = candidates.find((price) => {
    const name = productNameOf(price).toLowerCase();
    return expected.nameHints.some((hint) => name.includes(hint.toLowerCase()));
  });
  return named ?? candidates[0] ?? null;
}

function toMap(
  offerId: Row73LivePriceMap["offerId"],
  price: Stripe.Price | null,
): Row73LivePriceMap {
  return {
    offerId,
    productName: price ? productNameOf(price) : "",
    priceId: price?.id ?? "",
    unitAmount: price?.unit_amount ?? null,
    currency: price?.currency ?? null,
    type: price?.type ?? null,
    interval: price?.recurring?.interval ?? null,
    livemode: typeof price?.livemode === "boolean" ? price.livemode : null,
  };
}

export function authorizeRow73StripeConnect(request: Request): boolean {
  const expected = process.env.ROW73_STRIPE_CONNECT_TOKEN?.trim();
  if (!expected) return false;
  const provided = request.headers.get("x-row73-connect")?.trim() ?? "";
  if (!provided) return false;
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export async function runRow73StripeLiveConnect(options: {
  includeWebhookSecret: boolean;
  createWebhook: boolean;
  createCheckoutSessions: boolean;
}): Promise<Row73StripeLiveConnectResult> {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY_MISSING");
  }

  const keyClass: Row73StripeLiveConnectResult["keyClass"] = isStripeSandboxKey(key)
    ? "test"
    : key.startsWith("sk_live_")
      ? "live"
      : "unknown";

  if (keyClass !== "live" && (options.createWebhook || options.createCheckoutSessions)) {
    throw new Error(keyClass === "test" ? "STRIPE_KEY_IS_TEST" : "STRIPE_KEY_NOT_LIVE");
  }

  const stripe = getStripe();
  const account = await stripe.accounts.retrieve();
  const due = Array.isArray(account.requirements?.currently_due)
    ? account.requirements.currently_due.filter((item): item is string => typeof item === "string")
    : [];

  const priceList = await stripe.prices.list({
    active: true,
    limit: 100,
    expand: ["data.product"],
  });

  const blueprint = matchPrice(priceList.data, {
    amount: CHECKOUT_OFFERS.blueprint.amountCents,
    type: "one_time",
    nameHints: ["blueprint"],
  });
  const bundle = matchPrice(priceList.data, {
    amount: CHECKOUT_OFFERS.bundle.amountCents,
    type: "one_time",
    nameHints: ["bundle", "journey", "founding architect"],
  });
  const community = matchPrice(priceList.data, {
    amount: CHECKOUT_OFFERS.community.amountCents,
    type: "recurring",
    interval: "month",
    nameHints: ["community"],
  });

  const prices = [
    toMap("blueprint", blueprint),
    toMap("bundle", bundle),
    toMap("community", community),
  ];

  const result: Row73StripeLiveConnectResult = {
    keyClass,
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    detailsSubmitted: account.details_submitted === true,
    disabledReason: account.requirements?.disabled_reason ?? null,
    currentlyDueCount: due.length,
    currentlyDueIds: due,
    products: {
      blueprint: blueprint ? "FOUND" : "NOT FOUND",
      bundle: bundle ? "FOUND" : "NOT FOUND",
      community: community ? "FOUND" : "NOT FOUND",
    },
    prices,
    webhook: {
      url: ROW73_LIVE_WEBHOOK_URL,
      id: null,
      action: "not_requested",
      events: [...ROW73_CONSUMED_WEBHOOK_EVENTS],
      secretPresent: false,
    },
    checkoutSessions: [],
  };

  if (!options.createWebhook) {
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    const match = existing.data.find((row) => row.url === ROW73_LIVE_WEBHOOK_URL);
    result.webhook.id = match?.id ?? null;
    result.webhook.action = match ? "exists" : "absent";
    return result;
  }

  if (!blueprint || !bundle || !community) {
    throw new Error("LIVE_PRICES_UNMATCHED");
  }

  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const sameUrl = existing.data.find((row) => row.url === ROW73_LIVE_WEBHOOK_URL);
  let action = "created";
  if (sameUrl?.id) {
    await stripe.webhookEndpoints.del(sameUrl.id);
    action = "recreated";
  }
  const created = await stripe.webhookEndpoints.create({
    url: ROW73_LIVE_WEBHOOK_URL,
    enabled_events: [...ROW73_CONSUMED_WEBHOOK_EVENTS],
    description: "The Back Half Production checkout + billing",
    api_version: "2025-08-27.basil",
  });
  const webhookId = created.id;
  const secret = created.secret;

  if (!secret?.startsWith("whsec_")) {
    throw new Error("WEBHOOK_SECRET_MISSING");
  }

  result.webhook.id = webhookId;
  result.webhook.action = action;
  result.webhook.secretPresent = true;
  if (options.includeWebhookSecret) {
    result.webhook.secret = secret;
  }

  if (options.createCheckoutSessions) {
    const siteUrl = "https://website-two-psi-49.vercel.app";
    const offers = [
      { offerId: "blueprint" as const, price: blueprint.id, mode: "payment" as const },
      { offerId: "bundle" as const, price: bundle.id, mode: "payment" as const },
      { offerId: "community" as const, price: community.id, mode: "subscription" as const },
    ];
    for (const offer of offers) {
      const session = await stripe.checkout.sessions.create({
        mode: offer.mode,
        payment_method_types: ["card"],
        line_items: [{ price: offer.price, quantity: 1 }],
        success_url: `${siteUrl}/checkout/success?offer=${offer.offerId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/checkout/cancel?offer=${offer.offerId}`,
        customer_email: "row73-safe-checkout@thebackhalf.invalid",
        metadata: {
          bh_offer_id: offer.offerId,
          bh_locale: "en",
          bh_source: "row73_safe_validation",
        },
        ...(offer.mode === "subscription"
          ? { subscription_data: { metadata: { bh_offer_id: offer.offerId } } }
          : { payment_intent_data: { metadata: { bh_offer_id: offer.offerId } } }),
      });
      if (!session.id.startsWith("cs_live_")) {
        throw new Error(`CHECKOUT_NOT_LIVE_${offer.offerId}`);
      }
      let expired = false;
      try {
        await stripe.checkout.sessions.expire(session.id);
        expired = true;
      } catch {
        expired = false;
      }
      let urlHost = "";
      try {
        urlHost = session.url ? new URL(session.url).host : "";
      } catch {
        urlHost = "unparsed";
      }
      result.checkoutSessions.push({
        offerId: offer.offerId,
        mode: offer.mode,
        sessionId: session.id,
        livemode: session.livemode ?? null,
        urlHost,
        expired,
      });
    }
  }

  return result;
}
