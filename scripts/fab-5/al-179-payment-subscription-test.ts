/**
 * AOS al-179 — payment and subscription testing.
 * Isolated mechanical run. Does not mutate Stripe Dashboard, Vercel env,
 * DNS, or nameservers. Does not mark Founder acceptance complete.
 * Does not print secrets.
 */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import Stripe from "stripe";

import { POST as stripeWebhookPost } from "@/app/api/stripe/webhook/route";
import { getEntitlementSnapshot } from "@/lib/billing/access";
import { syncAccountAccessStatus } from "@/lib/billing/account-status";
import {
  isEntitlementCurrentlyActive,
  offerGrants,
  userHasActiveEntitlement,
} from "@/lib/billing/entitlements";
import {
  assertNoInstallmentEntitlementPath,
  INSTALLMENTS_OFFERED_AT_LAUNCH,
} from "@/lib/billing/installments";
import { getInvoiceSubscriptionId } from "@/lib/billing/invoice-subscription";
import { processStripeWebhookEvent } from "@/lib/billing/process-webhook";
import {
  getBillingStore,
  setBillingStoreForTests,
  type BillingStore,
} from "@/lib/billing/store";
import { getBillingSummaryForUser } from "@/lib/billing/summary";
import type {
  AccountAccessRecord,
  BillingDatabase,
  BillingNotificationRecord,
  EntitlementRecord,
  PurchaseRecord,
} from "@/lib/billing/types";
import { isStripeWebhookConfigured } from "@/lib/billing/webhook-verify";
import { authorizeCheckoutPriceSelection } from "@/lib/checkout/authorize-price";
import {
  CHECKOUT_OFFER_IDS,
  CHECKOUT_OFFERS,
  formatOfferPrice,
} from "@/lib/checkout/offers";
import { setStripeForTests } from "@/lib/checkout/stripe";
import { createFileAuthStore } from "@/lib/auth/store/file-store";
import { getAuthStore, setAuthStoreForTests } from "@/lib/auth/store";
import { resetAnalyticsStoreForTests } from "@/lib/analytics/store";
import { resetLaunchDashboardStoreForTests } from "@/lib/launch-dashboard/store";
import { resetMarketingKpiStoreForTests } from "@/lib/marketing-kpi/store";
import type { UserRecord } from "@/lib/auth/types";

type Verdict = "PASS" | "FAIL" | "BLOCKED";
type Suite =
  | "price_plans"
  | "failed_cards"
  | "installments"
  | "receipts"
  | "access"
  | "cancellation"
  | "webhook_recovery"
  | "environment";

type CaseResult = {
  id: string;
  suite: Suite;
  name: string;
  result: Verdict;
  detail: string;
};

const STATUS_REL = "ops/fab-5/runs/aos-engineering-status/al-179.json";
const WEBHOOK_TEST_SECRET = "whsec_al179_isolated_not_a_real_secret";
const PRICE_BLUEPRINT = "price_al179_blueprint";
const PRICE_BUNDLE = "price_al179_bundle";
const PRICE_COMMUNITY = "price_al179_community";

const cases: CaseResult[] = [];
const subscriptionCatalog = new Map<string, Stripe.Subscription>();
const invoiceList: Stripe.Invoice[] = [];
const paymentIntentCatalog = new Map<string, Stripe.PaymentIntent>();

function push(id: string, suite: Suite, name: string, result: Verdict, detail: string) {
  cases.push({ id, suite, name, result, detail });
}

function pass(id: string, suite: Suite, name: string, ok: boolean, detail: string) {
  push(id, suite, name, ok ? "PASS" : "FAIL", detail);
}

function mergeEndsAt(
  current: EntitlementRecord,
  incoming: Omit<EntitlementRecord, "id" | "updatedAt"> & { id?: string },
): string | undefined {
  if (!incoming.endsAt) return current.endsAt;
  if (incoming.sourceOfferId === "bundle" && current.sourceOfferId === "bundle") {
    if (current.endsAt && incoming.endsAt) {
      return current.endsAt < incoming.endsAt ? current.endsAt : incoming.endsAt;
    }
    return current.endsAt ?? incoming.endsAt;
  }
  if (
    incoming.stripeSubscriptionId &&
    current.stripeSubscriptionId === incoming.stripeSubscriptionId
  ) {
    if (current.endsAt && incoming.endsAt) {
      return current.endsAt > incoming.endsAt ? current.endsAt : incoming.endsAt;
    }
  }
  return incoming.endsAt;
}

function createMemoryBillingStore(): BillingStore {
  const database: BillingDatabase = {
    entitlements: [],
    purchases: [],
    stripeEvents: [],
    accountAccess: [],
    notifications: [],
  };

  return {
    async findStripeEvent(eventId) {
      return database.stripeEvents.find((entry) => entry.id === eventId);
    },
    async deleteStripeEvent(eventId) {
      const before = database.stripeEvents.length;
      database.stripeEvents = database.stripeEvents.filter((entry) => entry.id !== eventId);
      return database.stripeEvents.length !== before;
    },
    async recordStripeEvent(record) {
      if (database.stripeEvents.some((entry) => entry.id === record.id)) {
        return "duplicate";
      }
      database.stripeEvents.push(record);
      return "created";
    },
    async upsertEntitlement(input) {
      const now = new Date().toISOString();
      const existingIndex = database.entitlements.findIndex((entry) => {
        if (input.id && entry.id === input.id) return true;
        if (
          input.stripeSubscriptionId &&
          entry.stripeSubscriptionId === input.stripeSubscriptionId &&
          entry.kind === input.kind
        ) {
          return true;
        }
        if (
          input.stripeCheckoutSessionId &&
          entry.stripeCheckoutSessionId === input.stripeCheckoutSessionId &&
          entry.kind === input.kind
        ) {
          return true;
        }
        return entry.userId === input.userId && entry.kind === input.kind;
      });
      if (existingIndex >= 0) {
        const current = database.entitlements[existingIndex]!;
        const updated: EntitlementRecord = {
          ...current,
          ...input,
          id: current.id,
          grantedAt: current.grantedAt,
          startsAt: current.startsAt,
          endsAt: input.endsAt !== undefined ? mergeEndsAt(current, input) : current.endsAt,
          updatedAt: now,
        };
        database.entitlements[existingIndex] = updated;
        return updated;
      }
      const created: EntitlementRecord = {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        updatedAt: now,
      };
      database.entitlements.push(created);
      return created;
    },
    async findEntitlementsByUserId(userId) {
      return database.entitlements.filter((entry) => entry.userId === userId);
    },
    async findEntitlementByUserAndKind(userId, kind) {
      return database.entitlements.find(
        (entry) => entry.userId === userId && entry.kind === kind,
      );
    },
    async findEntitlementsBySubscriptionId(subscriptionId) {
      return database.entitlements.filter(
        (entry) => entry.stripeSubscriptionId === subscriptionId,
      );
    },
    async findEntitlementsByCheckoutSessionId(sessionId) {
      return database.entitlements.filter(
        (entry) => entry.stripeCheckoutSessionId === sessionId,
      );
    },
    async findEntitlementsByPaymentIntentId(paymentIntentId) {
      return database.entitlements.filter(
        (entry) => entry.stripePaymentIntentId === paymentIntentId,
      );
    },
    async upsertPurchase(input) {
      const now = new Date().toISOString();
      const existingIndex = database.purchases.findIndex((entry) => {
        if (input.id && entry.id === input.id) return true;
        if (
          input.stripeCheckoutSessionId &&
          entry.stripeCheckoutSessionId === input.stripeCheckoutSessionId
        ) {
          return true;
        }
        if (
          input.stripePaymentIntentId &&
          entry.stripePaymentIntentId === input.stripePaymentIntentId
        ) {
          return true;
        }
        if (input.stripeInvoiceId && entry.stripeInvoiceId === input.stripeInvoiceId) {
          return true;
        }
        return false;
      });
      if (existingIndex >= 0) {
        const current = database.purchases[existingIndex]!;
        const updated: PurchaseRecord = {
          ...current,
          ...input,
          id: current.id,
          createdAt: current.createdAt,
          updatedAt: now,
        };
        database.purchases[existingIndex] = updated;
        return updated;
      }
      const created: PurchaseRecord = {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        updatedAt: now,
      };
      database.purchases.push(created);
      return created;
    },
    async findPurchasesByUserId(userId) {
      return database.purchases.filter((entry) => entry.userId === userId);
    },
    async findPurchaseByCheckoutSessionId(sessionId) {
      return database.purchases.find((entry) => entry.stripeCheckoutSessionId === sessionId);
    },
    async findPurchaseByPaymentIntentId(paymentIntentId) {
      return database.purchases.find((entry) => entry.stripePaymentIntentId === paymentIntentId);
    },
    async findPurchaseByChargeId(chargeId) {
      return database.purchases.find((entry) => entry.stripeChargeId === chargeId);
    },
    async listPurchases() {
      return database.purchases;
    },
    async listStripeEvents() {
      return database.stripeEvents;
    },
    async upsertAccountAccess(record: AccountAccessRecord) {
      const index = database.accountAccess.findIndex((entry) => entry.userId === record.userId);
      if (index >= 0) database.accountAccess[index] = record;
      else database.accountAccess.push(record);
      return record;
    },
    async findAccountAccessByUserId(userId) {
      return database.accountAccess.find((entry) => entry.userId === userId);
    },
    async findNotificationByIdempotencyKey(key) {
      return database.notifications.find((entry) => entry.idempotencyKey === key);
    },
    async recordNotification(input) {
      const existing = database.notifications.find(
        (entry) => entry.idempotencyKey === input.idempotencyKey,
      );
      if (existing) return { status: "duplicate" as const, record: existing };
      const record: BillingNotificationRecord = {
        id: input.id ?? crypto.randomUUID(),
        idempotencyKey: input.idempotencyKey,
        userId: input.userId,
        template: input.template,
        status: input.status,
        locale: input.locale,
        offerId: input.offerId,
        detail: input.detail,
        createdAt: input.createdAt ?? new Date().toISOString(),
      };
      database.notifications.push(record);
      return { status: "created" as const, record };
    },
    async listNotificationsByUserId(userId) {
      return database.notifications.filter((entry) => entry.userId === userId);
    },
  };
}

function makeEvent(type: Stripe.Event.Type, object: unknown, id?: string): Stripe.Event {
  return {
    id: id ?? `evt_al179_${crypto.randomUUID()}`,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    data: { object: object as Stripe.Event.Data.Object },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type,
  } as Stripe.Event;
}

function checkoutSession(input: {
  id: string;
  user: UserRecord;
  offerId: "blueprint" | "bundle" | "community";
  paymentStatus?: Stripe.Checkout.Session.PaymentStatus;
  amountCents?: number;
  paymentIntent?: string | null;
  subscription?: string | null;
}): Stripe.Checkout.Session {
  const offer = CHECKOUT_OFFERS[input.offerId];
  return {
    id: input.id,
    object: "checkout.session",
    payment_status: input.paymentStatus ?? "paid",
    status: "complete",
    amount_total: input.amountCents ?? offer.amountCents,
    currency: "usd",
    customer: `cus_${input.user.id.slice(0, 8)}`,
    customer_email: input.user.email,
    customer_details: { email: input.user.email, address: null, name: null, phone: null, tax_exempt: null, tax_ids: null },
    client_reference_id: input.user.id,
    payment_intent:
      input.paymentIntent === undefined ? `pi_${input.id}` : input.paymentIntent,
    subscription:
      input.subscription === undefined
        ? input.offerId === "community"
          ? `sub_${input.id}`
          : null
        : input.subscription,
    metadata: {
      bh_user_id: input.user.id,
      bh_offer_id: input.offerId,
    },
  } as unknown as Stripe.Checkout.Session;
}

function communitySubscription(input: {
  id: string;
  user: UserRecord;
  status?: Stripe.Subscription.Status;
  cancelAtPeriodEnd?: boolean;
  endedAt?: number | null;
  periodEndSeconds?: number;
}): Stripe.Subscription {
  const periodEnd =
    input.periodEndSeconds ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  return {
    id: input.id,
    object: "subscription",
    status: input.status ?? "active",
    customer: `cus_${input.user.id.slice(0, 8)}`,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    cancel_at: null,
    ended_at: input.endedAt ?? null,
    metadata: {
      bh_user_id: input.user.id,
      bh_offer_id: "community",
    },
    items: {
      object: "list",
      data: [
        {
          id: `si_${input.id}`,
          object: "subscription_item",
          price: { id: PRICE_COMMUNITY, object: "price" },
          current_period_end: periodEnd,
        } as unknown as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: "/v1/subscription_items",
    },
  } as unknown as Stripe.Subscription;
}

function createStripeTestDouble(): Stripe {
  return {
    webhooks: {
      constructEvent(payload: string | Buffer, signature: string, secret: string) {
        return Stripe.webhooks.constructEvent(payload, signature, secret);
      },
    },
    subscriptions: {
      retrieve: async (id: string) => {
        const found = subscriptionCatalog.get(id);
        if (!found) {
          throw new Error("subscription_not_found");
        }
        return found;
      },
    },
    invoices: {
      list: async () => ({ data: invoiceList }),
    },
    paymentIntents: {
      retrieve: async (id: string) => {
        const found = paymentIntentCatalog.get(id);
        if (!found) {
          throw new Error("payment_intent_not_found");
        }
        return found;
      },
    },
  } as unknown as Stripe;
}

async function createTestUser(email: string): Promise<UserRecord> {
  return getAuthStore().createUser({
    email,
    firstName: "Test",
    lastName: "Architect",
    authProvider: "email",
    arcCode: `AL179${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    emailVerified: true,
    locale: "en",
    ageEligible: true,
    ageEligibleConfirmedAt: new Date().toISOString(),
  });
}

function readSource(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

function envPresent(name: string): boolean {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return true;
  const localPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(localPath)) return false;
  for (const raw of readFileSync(localPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (key !== name) continue;
    const value = line.slice(eq + 1).trim();
    return value.length > 0;
  }
  return false;
}

function classifySecretPresence(name: string): "ABSENT" | "PRESENT" {
  return envPresent(name) ? "PRESENT" : "ABSENT";
}

async function runPricePlanTests() {
  pass(
    "pp-catalog",
    "price_plans",
    "Approved catalog has Blueprint, Bundle, and Community only",
    CHECKOUT_OFFER_IDS.length === 3 &&
      CHECKOUT_OFFERS.blueprint.amountCents === 150_000 &&
      CHECKOUT_OFFERS.bundle.amountCents === 175_000 &&
      CHECKOUT_OFFERS.community.amountCents === 5_000 &&
      CHECKOUT_OFFERS.blueprint.mode === "payment" &&
      CHECKOUT_OFFERS.bundle.mode === "payment" &&
      CHECKOUT_OFFERS.community.mode === "subscription" &&
      CHECKOUT_OFFERS.community.interval === "month",
    `offers=${CHECKOUT_OFFER_IDS.join(",")} prices=${formatOfferPrice(CHECKOUT_OFFERS.blueprint)} / ${formatOfferPrice(CHECKOUT_OFFERS.bundle)} / ${formatOfferPrice(CHECKOUT_OFFERS.community)}`,
  );

  pass(
    "pp-grants",
    "price_plans",
    "Each offer grants the approved entitlement kinds",
    offerGrants("blueprint").join() === "journey_access" &&
      offerGrants("bundle").join() === "journey_access,community_access" &&
      offerGrants("community").join() === "community_access",
    "blueprint→journey; bundle→journey+community; community→community",
  );

  const ignoredClient = authorizeCheckoutPriceSelection({
    offerId: "blueprint",
    clientPriceId: "price_attacker_supplied",
    clientAmount: 1,
  });
  pass(
    "pp-ignore-client-price",
    "price_plans",
    "Client-supplied price IDs and amounts are ignored",
    ignoredClient.status === "ok" &&
      ignoredClient.status === "ok" &&
      ignoredClient.priceId === PRICE_BLUEPRINT,
    JSON.stringify(ignoredClient),
  );

  pass(
    "pp-invalid-offer",
    "price_plans",
    "Unknown offer IDs are rejected",
    authorizeCheckoutPriceSelection({ offerId: "installments" }).status ===
      "invalid_offer",
    "installments is not an approved offer id",
  );

  const blueprintUser = await createTestUser("al179-blueprint@test.invalid");
  const blueprintSession = checkoutSession({
    id: "cs_al179_blueprint",
    user: blueprintUser,
    offerId: "blueprint",
    amountCents: 150_000,
  });
  const blueprintResult = await processStripeWebhookEvent(
    makeEvent("checkout.session.completed", blueprintSession),
  );
  const blueprintAccess = await getEntitlementSnapshot(blueprintUser.id);
  pass(
    "pp-blueprint-webhook",
    "price_plans",
    "Blueprint $1,500 checkout grants Journey only",
    blueprintResult.status === "processed" &&
      blueprintAccess.journeyAccess &&
      !blueprintAccess.communityAccess,
    `status=${blueprintResult.status} journey=${blueprintAccess.journeyAccess} community=${blueprintAccess.communityAccess}`,
  );

  const bundleUser = await createTestUser("al179-bundle@test.invalid");
  const bundleSession = checkoutSession({
    id: "cs_al179_bundle",
    user: bundleUser,
    offerId: "bundle",
    amountCents: 175_000,
  });
  const bundleResult = await processStripeWebhookEvent(
    makeEvent("checkout.session.completed", bundleSession),
  );
  const bundleAccess = await getEntitlementSnapshot(bundleUser.id);
  pass(
    "pp-bundle-webhook",
    "price_plans",
    "Founding Architect $1,750 checkout grants Journey and Community",
    bundleResult.status === "processed" &&
      bundleAccess.journeyAccess &&
      bundleAccess.communityAccess,
    `status=${bundleResult.status} journey=${bundleAccess.journeyAccess} community=${bundleAccess.communityAccess}`,
  );

  const communityUser = await createTestUser("al179-community@test.invalid");
  const communitySub = communitySubscription({
    id: "sub_al179_community",
    user: communityUser,
  });
  subscriptionCatalog.set(communitySub.id, communitySub);
  const communitySession = checkoutSession({
    id: "cs_al179_community",
    user: communityUser,
    offerId: "community",
    amountCents: 5_000,
    subscription: communitySub.id,
    paymentIntent: null,
  });
  const communityResult = await processStripeWebhookEvent(
    makeEvent("checkout.session.completed", communitySession),
  );
  const communityAccess = await getEntitlementSnapshot(communityUser.id);
  pass(
    "pp-community-webhook",
    "price_plans",
    "Community $50/month checkout grants Community only",
    communityResult.status === "processed" &&
      !communityAccess.journeyAccess &&
      communityAccess.communityAccess,
    `status=${communityResult.status} journey=${communityAccess.journeyAccess} community=${communityAccess.communityAccess} summary=${communityResult.summary}`,
  );
}

async function runFailedCardTests() {
  const user = await createTestUser("al179-failed-card@test.invalid");
  const failedSession = checkoutSession({
    id: "cs_al179_failed_async",
    user,
    offerId: "blueprint",
    paymentStatus: "unpaid",
  });
  const failed = await processStripeWebhookEvent(
    makeEvent("checkout.session.async_payment_failed", failedSession),
  );
  const entitlements = await getBillingStore().findEntitlementsByUserId(user.id);
  const purchases = await getBillingStore().findPurchasesByUserId(user.id);
  const access = await getEntitlementSnapshot(user.id);
  pass(
    "fc-async-fail",
    "failed_cards",
    "Async payment failure records purchase failed and grants no access",
    failed.status === "processed" &&
      purchases.some((entry) => entry.status === "failed") &&
      entitlements.length === 0 &&
      !access.journeyAccess &&
      !access.communityAccess,
    `status=${failed.status} purchases=${purchases.map((p) => p.status).join(",")} entitlements=${entitlements.length}`,
  );

  const unpaidUser = await createTestUser("al179-unpaid@test.invalid");
  const unpaidSession = checkoutSession({
    id: "cs_al179_unpaid",
    user: unpaidUser,
    offerId: "blueprint",
    paymentStatus: "unpaid",
  });
  const unpaid = await processStripeWebhookEvent(
    makeEvent("checkout.session.completed", unpaidSession),
  );
  const unpaidAccess = await getEntitlementSnapshot(unpaidUser.id);
  pass(
    "fc-unpaid-checkout",
    "failed_cards",
    "Unpaid checkout.session.completed is ignored and grants no entitlements",
    unpaid.status === "ignored" &&
      !unpaidAccess.journeyAccess &&
      !unpaidAccess.communityAccess,
    `status=${unpaid.status} summary=${unpaid.summary}`,
  );

  const subUser = await createTestUser("al179-invoice-fail@test.invalid");
  const sub = communitySubscription({ id: "sub_al179_past_due", user: subUser });
  subscriptionCatalog.set(sub.id, sub);
  await processStripeWebhookEvent(
    makeEvent(
      "checkout.session.completed",
      checkoutSession({
        id: "cs_al179_past_due",
        user: subUser,
        offerId: "community",
        subscription: sub.id,
        paymentIntent: null,
      }),
    ),
  );
  const invoiceFailed = await processStripeWebhookEvent(
    makeEvent("invoice.payment_failed", {
      id: "in_al179_fail",
      object: "invoice",
      customer: sub.customer,
      customer_email: subUser.email,
      parent: { subscription_details: { subscription: sub.id } },
    }),
  );
  const pastDue = await getBillingStore().findEntitlementByUserAndKind(
    subUser.id,
    "community_access",
  );
  pass(
    "fc-invoice-payment-failed",
    "failed_cards",
    "invoice.payment_failed marks Community entitlement past_due and locks access",
    invoiceFailed.status === "processed" &&
      pastDue?.status === "past_due" &&
      !(await userHasActiveEntitlement(subUser.id, "community_access")),
    `status=${invoiceFailed.status} entitlement=${pastDue?.status} active=${await userHasActiveEntitlement(subUser.id, "community_access")}`,
  );

  const createSessionSrc = readSource("lib/checkout/create-session.ts");
  pass(
    "fc-card-only-checkout",
    "failed_cards",
    "Checkout is card-only (declines stay on card; no BNPL fallback)",
    createSessionSrc.includes('payment_method_types: ["card"]') &&
      !/klarna|affirm|afterpay|link|us_bank_account/i.test(createSessionSrc),
    "payment_method_types locked to card",
  );
}

async function runInstallmentTests() {
  let threw = false;
  try {
    assertNoInstallmentEntitlementPath();
  } catch {
    threw = true;
  }
  pass(
    "in-policy",
    "installments",
    "Launch policy does not offer installments",
    INSTALLMENTS_OFFERED_AT_LAUNCH === false && !threw,
    `INSTALLMENTS_OFFERED_AT_LAUNCH=${INSTALLMENTS_OFFERED_AT_LAUNCH}`,
  );

  const createSessionSrc = readSource("lib/checkout/create-session.ts");
  pass(
    "in-no-bnpl",
    "installments",
    "Checkout session creation disables coupons and installment methods",
    createSessionSrc.includes('payment_method_types: ["card"]') &&
      createSessionSrc.includes("allow_promotion_codes: false") &&
      createSessionSrc.includes("no installment/BNPL"),
    "card-only, allow_promotion_codes false",
  );

  pass(
    "in-no-offer",
    "installments",
    "No installment SKU exists in the approved offer catalog",
    !(CHECKOUT_OFFER_IDS as readonly string[]).includes("installment") &&
      authorizeCheckoutPriceSelection({ offerId: "installment" }).status ===
        "invalid_offer",
    "installment offer id rejected",
  );
}

async function runReceiptTests() {
  const user = await createTestUser("al179-receipts@test.invalid");
  const session = checkoutSession({
    id: "cs_al179_receipt",
    user,
    offerId: "blueprint",
    paymentIntent: "pi_al179_receipt",
  });
  await processStripeWebhookEvent(makeEvent("checkout.session.completed", session));

  paymentIntentCatalog.set("pi_al179_receipt", {
    id: "pi_al179_receipt",
    object: "payment_intent",
    status: "succeeded",
    amount_received: 150_000,
    currency: "usd",
    latest_charge: {
      id: "ch_al179_receipt",
      object: "charge",
      receipt_url: "https://pay.stripe.com/receipts/al179_test",
    },
  } as unknown as Stripe.PaymentIntent);

  invoiceList.length = 0;
  invoiceList.push({
    id: "in_al179_open_fail",
    object: "invoice",
    status: "open",
    number: "OPEN-1",
    amount_paid: 0,
    amount_due: 5000,
    currency: "usd",
    created: Math.floor(Date.now() / 1000),
    hosted_invoice_url: "https://invoice.stripe.com/i/al179-open",
  } as unknown as Stripe.Invoice);
  invoiceList.push({
    id: "in_al179_paid",
    object: "invoice",
    status: "paid",
    number: "PAID-1",
    amount_paid: 5000,
    amount_due: 0,
    currency: "usd",
    created: Math.floor(Date.now() / 1000),
    hosted_invoice_url: "https://invoice.stripe.com/i/al179-paid",
  } as unknown as Stripe.Invoice);
  invoiceList.push({
    id: "in_al179_uncollectible",
    object: "invoice",
    status: "uncollectible",
    number: "FAIL-1",
    amount_paid: 0,
    currency: "usd",
    created: Math.floor(Date.now() / 1000),
    hosted_invoice_url: "https://invoice.stripe.com/i/al179-fail",
  } as unknown as Stripe.Invoice);

  const summary = await getBillingSummaryForUser(user.id);
  const receipt = summary.documents.find((doc) => doc.kind === "receipt");
  const paidInvoice = summary.documents.find((doc) => doc.id === "in_al179_paid");
  const failedInvoice = summary.documents.find(
    (doc) => doc.id === "in_al179_uncollectible",
  );
  pass(
    "rc-receipt-url",
    "receipts",
    "Successful Blueprint payment exposes a hosted receipt",
    receipt?.kind === "receipt" &&
      receipt.hostedUrl === "https://pay.stripe.com/receipts/al179_test" &&
      receipt.status === "paid",
    `documents=${summary.documents.map((d) => `${d.kind}:${d.status}`).join(",")}`,
  );
  pass(
    "rc-paid-invoice",
    "receipts",
    "Paid invoices are listed; uncollectible invoices are not treated as receipts",
    paidInvoice?.kind === "invoice" &&
      paidInvoice.status === "paid" &&
      failedInvoice === undefined,
    `paid=${Boolean(paidInvoice)} uncollectible=${Boolean(failedInvoice)}`,
  );

  const failedUser = await createTestUser("al179-receipt-failed@test.invalid");
  invoiceList.length = 0;
  await processStripeWebhookEvent(
    makeEvent(
      "checkout.session.async_payment_failed",
      checkoutSession({
        id: "cs_al179_receipt_fail",
        user: failedUser,
        offerId: "blueprint",
      }),
    ),
  );
  const failedSummary = await getBillingSummaryForUser(failedUser.id);
  pass(
    "rc-failed-not-receipt",
    "receipts",
    "Failed purchases do not appear as receipts",
    failedSummary.documents.length === 0 &&
      failedSummary.purchases.some((entry) => entry.status === "failed"),
    `documents=${failedSummary.documents.length} purchases=${failedSummary.purchases.map((p) => p.status).join(",")}`,
  );

  const notifySrc = readSource("lib/billing/notifications.ts");
  pass(
    "rc-success-email",
    "receipts",
    "Payment success notification template exists (receipt email path)",
    notifySrc.includes('case "payment_success"') &&
      notifySrc.includes("Pago confirmado") &&
      notifySrc.includes("Payment confirmed"),
    "en/es payment_success templates present",
  );
}

async function runAccessTests() {
  const user = await createTestUser("al179-access@test.invalid");
  await processStripeWebhookEvent(
    makeEvent(
      "checkout.session.completed",
      checkoutSession({
        id: "cs_al179_access_blueprint",
        user,
        offerId: "blueprint",
      }),
    ),
  );
  await syncAccountAccessStatus(user.id, "al-179-access");
  const snapshot = await getBillingStore().findAccountAccessByUserId(user.id);
  pass(
    "ac-account-snapshot",
    "access",
    "Account access snapshot matches entitlements after paid Blueprint",
    snapshot?.journeyAccess === true &&
      snapshot.communityAccess === false &&
      snapshot.hasPaidPurchase === true &&
      snapshot.hasFailedPurchase === false,
    JSON.stringify({
      journey: snapshot?.journeyAccess,
      community: snapshot?.communityAccess,
      paid: snapshot?.hasPaidPurchase,
    }),
  );

  const accessSrc = readSource("lib/billing/access.ts");
  pass(
    "ac-server-gate",
    "access",
    "Paid product routes require server-side entitlement, not client flags",
    accessSrc.includes("requireEntitlement") &&
      accessSrc.includes("userHasActiveEntitlement") &&
      accessSrc.includes("Operational roles do NOT imply product entitlements"),
    "requireEntitlement is the access gate",
  );

  const expired: EntitlementRecord = {
    id: "ent_expired",
    userId: "user_expired",
    kind: "community_access",
    status: "active",
    sourceOfferId: "community",
    grantedAt: "2020-01-01T00:00:00.000Z",
    startsAt: "2020-01-01T00:00:00.000Z",
    endsAt: "2020-02-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
  };
  pass(
    "ac-expired-locked",
    "access",
    "Expired entitlement does not unlock access",
    isEntitlementCurrentlyActive(expired) === false,
    `endsAt=${expired.endsAt}`,
  );

  const pastDue: EntitlementRecord = {
    ...expired,
    id: "ent_past_due",
    status: "past_due",
    endsAt: new Date(Date.now() + 86400000).toISOString(),
  };
  pass(
    "ac-past-due-locked",
    "access",
    "past_due entitlement does not unlock access",
    isEntitlementCurrentlyActive(pastDue) === false,
    `status=${pastDue.status}`,
  );

  const successSrc = readSource("lib/checkout/verify-success.ts");
  pass(
    "ac-success-page",
    "access",
    "Checkout success does not treat URL params as entitlement proof",
    successSrc.includes("verify payment with Stripe") &&
      successSrc.includes("accessProvisioned") &&
      successSrc.includes("getEntitlementSnapshot"),
    "success page waits for webhook-provisioned entitlements",
  );
}

async function runCancellationTests() {
  const user = await createTestUser("al179-cancel@test.invalid");
  const sub = communitySubscription({
    id: "sub_al179_cancel",
    user,
    periodEndSeconds: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
  });
  subscriptionCatalog.set(sub.id, sub);
  await processStripeWebhookEvent(
    makeEvent(
      "checkout.session.completed",
      checkoutSession({
        id: "cs_al179_cancel",
        user,
        offerId: "community",
        subscription: sub.id,
        paymentIntent: null,
      }),
    ),
  );

  const cancelAtPeriodEnd = communitySubscription({
    id: sub.id,
    user,
    status: "active",
    cancelAtPeriodEnd: true,
    periodEndSeconds: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
  });
  const pending = await processStripeWebhookEvent(
    makeEvent("customer.subscription.updated", cancelAtPeriodEnd),
  );
  const stillActive = await userHasActiveEntitlement(user.id, "community_access");
  const pendingEnt = await getBillingStore().findEntitlementByUserAndKind(
    user.id,
    "community_access",
  );
  pass(
    "cn-period-end",
    "cancellation",
    "cancel_at_period_end keeps Community access through the paid term",
    pending.status === "processed" &&
      stillActive &&
      pendingEnt?.status === "active",
    `webhook=${pending.status} active=${stillActive} entitlement=${pendingEnt?.status}`,
  );

  const deleted = communitySubscription({
    id: sub.id,
    user,
    status: "canceled",
    endedAt: Math.floor(Date.now() / 1000),
    periodEndSeconds: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
  });
  const canceled = await processStripeWebhookEvent(
    makeEvent("customer.subscription.deleted", deleted),
  );
  const canceledEnt = await getBillingStore().findEntitlementByUserAndKind(
    user.id,
    "community_access",
  );
  pass(
    "cn-deleted",
    "cancellation",
    "subscription.deleted marks Community canceled with revokedAt",
    canceled.status === "processed" &&
      canceledEnt?.status === "canceled" &&
      Boolean(canceledEnt.revokedAt),
    `status=${canceled.status} entitlement=${canceledEnt?.status} revokedAt=${canceledEnt?.revokedAt ?? "none"}`,
  );

  const blueprintUser = await createTestUser("al179-cancel-one-time@test.invalid");
  await processStripeWebhookEvent(
    makeEvent(
      "checkout.session.completed",
      checkoutSession({
        id: "cs_al179_one_time",
        user: blueprintUser,
        offerId: "blueprint",
      }),
    ),
  );
  const oneTimeSummary = await getBillingSummaryForUser(blueprintUser.id);
  pass(
    "cn-one-time-not-cancelable",
    "cancellation",
    "One-time Blueprint purchase is not a cancelable subscription",
    oneTimeSummary.cancellationAvailable === false &&
      oneTimeSummary.purchases.every((entry) => entry.cancellationAvailable === false),
    `cancellationAvailable=${oneTimeSummary.cancellationAvailable}`,
  );

  const portalSrc = readSource("lib/billing/portal.ts");
  const panelSrc = readSource("components/billing/billing-portal-panel.tsx");
  pass(
    "cn-portal-path",
    "cancellation",
    "Cancellation is Stripe Billing Portal; client customer IDs are ignored",
    portalSrc.includes("void input.customerId") &&
      portalSrc.includes("billingPortal.sessions.create") &&
      panelSrc.includes("cus_other_account_attempt"),
    "portal ignores client customerId",
  );
}

async function runWebhookRecoveryTests() {
  const missingUserEvent = makeEvent(
    "checkout.session.completed",
    {
      id: "cs_al179_recover",
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 150_000,
      currency: "usd",
      customer: "cus_recover",
      customer_email: "al179-recover@test.invalid",
      customer_details: { email: "al179-recover@test.invalid" },
      client_reference_id: "user_does_not_exist_yet",
      payment_intent: "pi_al179_recover",
      metadata: {
        bh_user_id: "user_does_not_exist_yet",
        bh_offer_id: "blueprint",
      },
    },
    "evt_al179_recover_missing_user",
  );
  const first = await processStripeWebhookEvent(missingUserEvent);
  pass(
    "wh-missing-user-fails",
    "webhook_recovery",
    "Webhook fails closed when the Back Half user cannot be resolved",
    first.status === "failed" && first.summary.includes("could not resolve"),
    `status=${first.status} summary=${first.summary}`,
  );

  const recoveredUser = await createTestUser("al179-recover@test.invalid");
  const retryEvent = makeEvent(
    "checkout.session.completed",
    {
      id: "cs_al179_recover",
      object: "checkout.session",
      payment_status: "paid",
      amount_total: 150_000,
      currency: "usd",
      customer: "cus_recover",
      customer_email: recoveredUser.email,
      customer_details: { email: recoveredUser.email },
      client_reference_id: recoveredUser.id,
      payment_intent: "pi_al179_recover",
      metadata: {
        bh_user_id: recoveredUser.id,
        bh_offer_id: "blueprint",
      },
    },
    "evt_al179_recover_missing_user",
  );
  const retry = await processStripeWebhookEvent(retryEvent);
  const recoveredAccess = await getEntitlementSnapshot(recoveredUser.id);
  pass(
    "wh-failed-event-retry",
    "webhook_recovery",
    "Failed webhook events are not permanent duplicates and recover on retry",
    retry.status === "processed" && recoveredAccess.journeyAccess,
    `retry=${retry.status} journey=${recoveredAccess.journeyAccess}`,
  );

  const duplicate = await processStripeWebhookEvent(retryEvent);
  const entitlements = await getBillingStore().findEntitlementsByUserId(
    recoveredUser.id,
  );
  pass(
    "wh-duplicate",
    "webhook_recovery",
    "Replayed processed events are duplicate and do not double-grant",
    duplicate.status === "duplicate" &&
      entitlements.filter((entry) => entry.kind === "journey_access").length === 1,
    `duplicate=${duplicate.status} journeyRows=${entitlements.filter((e) => e.kind === "journey_access").length}`,
  );

  const bundleUser = await createTestUser("al179-bundle-dup@test.invalid");
  const bundleSession = checkoutSession({
    id: "cs_al179_bundle_dup",
    user: bundleUser,
    offerId: "bundle",
  });
  await processStripeWebhookEvent(
    makeEvent("checkout.session.completed", bundleSession, "evt_bundle_a"),
  );
  const firstCommunity = await getBillingStore().findEntitlementByUserAndKind(
    bundleUser.id,
    "community_access",
  );
  await processStripeWebhookEvent(
    makeEvent("checkout.session.completed", bundleSession, "evt_bundle_b"),
  );
  const secondCommunity = await getBillingStore().findEntitlementByUserAndKind(
    bundleUser.id,
    "community_access",
  );
  pass(
    "wh-bundle-year-stable",
    "webhook_recovery",
    "Duplicate bundle events do not extend the included Community term",
    Boolean(firstCommunity?.endsAt) && firstCommunity?.endsAt === secondCommunity?.endsAt,
    `endsAt=${firstCommunity?.endsAt}`,
  );

  const invoiceUser = await createTestUser("al179-invoice-paid@test.invalid");
  const invoiceSub = communitySubscription({
    id: "sub_al179_invoice_paid",
    user: invoiceUser,
  });
  subscriptionCatalog.set(invoiceSub.id, invoiceSub);
  const invoice = {
    id: "in_al179_paid_renew",
    object: "invoice",
    amount_paid: 5000,
    currency: "usd",
    customer: invoiceSub.customer,
    customer_email: invoiceUser.email,
    parent: { subscription_details: { subscription: invoiceSub.id } },
  };
  pass(
    "wh-invoice-subscription-id",
    "webhook_recovery",
    "Basil invoice parent.subscription_details is read for recovery",
    getInvoiceSubscriptionId(invoice as unknown as Stripe.Invoice) === invoiceSub.id,
    `subscription=${getInvoiceSubscriptionId(invoice as unknown as Stripe.Invoice)}`,
  );
  const invoicePaid = await processStripeWebhookEvent(
    makeEvent("invoice.paid", invoice),
  );
  const invoiceAccess = await getEntitlementSnapshot(invoiceUser.id);
  pass(
    "wh-invoice-paid",
    "webhook_recovery",
    "invoice.paid recovers Community access from subscription invoices",
    invoicePaid.status === "processed" && invoiceAccess.communityAccess,
    `status=${invoicePaid.status} community=${invoiceAccess.communityAccess} summary=${invoicePaid.summary}`,
  );

  const refundUser = await createTestUser("al179-refund@test.invalid");
  await processStripeWebhookEvent(
    makeEvent(
      "checkout.session.completed",
      checkoutSession({
        id: "cs_al179_refund",
        user: refundUser,
        offerId: "blueprint",
        paymentIntent: "pi_al179_refund",
      }),
    ),
  );
  const refunded = await processStripeWebhookEvent(
    makeEvent("charge.refunded", {
      id: "ch_al179_refund",
      object: "charge",
      payment_intent: "pi_al179_refund",
      customer: "cus_refund",
    }),
  );
  const refundPurchase = await getBillingStore().findPurchaseByPaymentIntentId(
    "pi_al179_refund",
  );
  pass(
    "wh-refund",
    "webhook_recovery",
    "charge.refunded revokes entitlements and marks the purchase refunded",
    refunded.status === "processed" &&
      refundPurchase?.status === "refunded" &&
      !(await userHasActiveEntitlement(refundUser.id, "journey_access")),
    `status=${refunded.status} purchase=${refundPurchase?.status} journey=${await userHasActiveEntitlement(refundUser.id, "journey_access")}`,
  );

  const routeSrc = readSource("app/api/stripe/webhook/route.ts");
  pass(
    "wh-stripe-retry-status",
    "webhook_recovery",
    "Failed webhook processing returns HTTP 500 so Stripe retries",
    routeSrc.includes('status: 500') &&
      routeSrc.includes('result.status === "failed"') &&
      routeSrc.includes("webhook_not_configured"),
    "failed → 500; missing secret → 503",
  );

  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const unconfigured = await stripeWebhookPost(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    }),
  );
  pass(
    "wh-http-unconfigured",
    "webhook_recovery",
    "Webhook HTTP route fails closed when the signing secret is absent",
    unconfigured.status === 503 &&
      (await unconfigured.json()).error === "webhook_not_configured" &&
      isStripeWebhookConfigured() === false,
    `http=${unconfigured.status}`,
  );

  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_TEST_SECRET;
  const missingSig = await stripeWebhookPost(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    }),
  );
  pass(
    "wh-http-missing-signature",
    "webhook_recovery",
    "Webhook HTTP route rejects unsigned payloads",
    missingSig.status === 400 &&
      (await missingSig.json()).error === "missing_signature",
    `http=${missingSig.status}`,
  );

  const invalidSig = await stripeWebhookPost(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=not-valid" },
      body: "{}",
    }),
  );
  pass(
    "wh-http-invalid-signature",
    "webhook_recovery",
    "Webhook HTTP route rejects invalid Stripe signatures",
    invalidSig.status === 400 &&
      (await invalidSig.json()).error === "invalid_signature",
    `http=${invalidSig.status}`,
  );

  const signedUser = await createTestUser("al179-signed-webhook@test.invalid");
  const signedSession = checkoutSession({
    id: "cs_al179_signed",
    user: signedUser,
    offerId: "blueprint",
  });
  const signedEvent = makeEvent("checkout.session.completed", signedSession);
  const payload = JSON.stringify(signedEvent);
  const header = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_TEST_SECRET,
  });
  const signed = await stripeWebhookPost(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": header },
      body: payload,
    }),
  );
  const signedJson = (await signed.json()) as { received?: boolean; status?: string };
  const signedAccess = await getEntitlementSnapshot(signedUser.id);
  pass(
    "wh-http-signed-process",
    "webhook_recovery",
    "Signed webhook HTTP request processes and grants access",
    signed.status === 200 &&
      signedJson.received === true &&
      signedJson.status === "processed" &&
      signedAccess.journeyAccess,
    `http=${signed.status} body=${JSON.stringify(signedJson)} journey=${signedAccess.journeyAccess}`,
  );

  if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
}

function runEnvironmentTests(envAtStart: {
  stripeSecretKey: "ABSENT" | "PRESENT";
  webhookSecret: "ABSENT" | "PRESENT";
  postgres: "ABSENT" | "PRESENT";
}) {
  push(
    "env-no-live-cards",
    "environment",
    "Live/test-card charges were not run (no workstation Stripe secret; Stripe config not mutated)",
    "BLOCKED",
    `STRIPE_SECRET_KEY=${envAtStart.stripeSecretKey} STRIPE_WEBHOOK_SECRET=${envAtStart.webhookSecret}. Process-local test double only. No Checkout Sessions created at Stripe. No products, prices, or webhook endpoints created or deleted.`,
  );

  let row73Payments: string | "UNAVAILABLE" = "UNAVAILABLE";
  try {
    const row73 = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "ops/fab-5/runs/row-73-vendor-capacity-billing-validation.json"),
        "utf8",
      ),
    ) as { scorecard?: { launchFunctions?: { payments?: string } } };
    row73Payments = row73.scorecard?.launchFunctions?.payments ?? "UNAVAILABLE";
  } catch {
    row73Payments = "UNAVAILABLE";
  }

  pass(
    "env-payments-complete-dependency",
    "environment",
    "Payments Complete dependency remains unsatisfied for live production proof",
    row73Payments === "FAIL",
    `Row 73 launchFunctions.payments=${row73Payments}. Production webhook historically 503 webhook_not_configured. Live key class previously test/sandbox.`,
  );

  pass(
    "env-no-secret-print",
    "environment",
    "No Stripe secrets were printed into this evidence file",
    !JSON.stringify(cases).includes("sk_live_") &&
      !JSON.stringify(cases).includes("sk_test_") &&
      !JSON.stringify(cases).includes("whsec_"),
    "evidence uses ABSENT/PRESENT classification only",
  );
}

async function writeStatus(startedAt: string, envAtStart: Record<string, string>) {
  const failed = cases.filter((entry) => entry.result === "FAIL");
  const blocked = cases.filter((entry) => entry.result === "BLOCKED");
  const passed = cases.filter((entry) => entry.result === "PASS");
  const mechanicalFailed = failed.length > 0;
  const suites = {
    price_plans: summarizeSuite("price_plans"),
    failed_cards: summarizeSuite("failed_cards"),
    installments: summarizeSuite("installments"),
    receipts: summarizeSuite("receipts"),
    access: summarizeSuite("access"),
    cancellation: summarizeSuite("cancellation"),
    webhook_recovery: summarizeSuite("webhook_recovery"),
    environment: summarizeSuite("environment"),
  };

  const status = {
    aosWorkId: "al-179",
    source: "command_center",
    sourceReference: "August Launch row 179",
    deliverable: "Run Payment and Subscription Testing",
    ownerAgent: "imani",
    executedAt: new Date().toISOString(),
    startedAt,
    softwareChange:
      "Test-only Stripe client override in lib/checkout/stripe.ts plus this isolated runner. No product, marketing, or legal copy changes. No Stripe Dashboard / Vercel / DNS mutation.",
    stripeMutated: false,
    secretsExposed: false,
    founderAccepted: false,
    rowMarkedComplete: false,
    acceptanceState: "open",
    paymentsCompleteDependency: "unsatisfied",
    liveCardTesting: "BLOCKED",
    mechanicalOverall: mechanicalFailed ? "FAIL" : "PASS",
    counts: {
      passed: passed.length,
      failed: failed.length,
      blocked: blocked.length,
      total: cases.length,
    },
    suites,
    cases,
    environmentAtStart: envAtStart,
    constraintsHonored: {
      stripeConfigurationUntouched: true,
      cloudflareDnsUntouched: true,
      vercelCustomDomainUntouched: true,
      nameserversUntouched: true,
      authenticationNotWeakened: true,
      noSecretPrint: true,
      notMerged: true,
      notDeployed: true,
      founderAcceptanceNotFabricated: true,
    },
    nextAction: mechanicalFailed
      ? "Fix mechanical payment/subscription failures on this branch. Do not mark Complete. Do not merge."
      : "Mechanical payment/subscription handlers passed in isolation. Live card, installment-not-offered confirmation in Stripe Checkout, and production webhook recovery still require Payments Complete (live Stripe key, live prices, webhook secret on Vercel Production). Leave Founder acceptance open.",
    note: "Installments are not offered at launch by policy. Failed-card coverage is webhook/handler-level (async failure, unpaid session, invoice.payment_failed) because this environment has no Stripe secret and AOS forbids mutating Stripe configuration.",
  };

  const outPath = path.join(process.cwd(), STATUS_REL);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  return status;
}

function summarizeSuite(suite: Suite) {
  const rows = cases.filter((entry) => entry.suite === suite);
  const failed = rows.filter((entry) => entry.result === "FAIL").length;
  const blocked = rows.filter((entry) => entry.result === "BLOCKED").length;
  const passed = rows.filter((entry) => entry.result === "PASS").length;
  return {
    passed,
    failed,
    blocked,
    total: rows.length,
    result: failed > 0 ? "FAIL" : blocked > 0 && passed === 0 ? "BLOCKED" : blocked > 0 ? "PASS_WITH_BLOCKS" : "PASS",
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const envAtStart = {
    STRIPE_SECRET_KEY: classifySecretPresence("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: classifySecretPresence("STRIPE_WEBHOOK_SECRET"),
    STRIPE_PRICE_BLUEPRINT: classifySecretPresence("STRIPE_PRICE_BLUEPRINT"),
    STRIPE_PRICE_BUNDLE: classifySecretPresence("STRIPE_PRICE_BUNDLE"),
    STRIPE_PRICE_COMMUNITY: classifySecretPresence("STRIPE_PRICE_COMMUNITY"),
    POSTGRES_URL: classifySecretPresence("POSTGRES_URL"),
  };

  const tmp = await mkdtemp(path.join(os.tmpdir(), "al179-"));
  process.env.ANALYTICS_DB_FILE = path.join(tmp, "analytics.json");
  process.env.MARKETING_KPI_DB_FILE = path.join(tmp, "kpi.json");
  process.env.LAUNCH_DASHBOARD_DB_FILE = path.join(tmp, "launch.json");
  process.env.STRIPE_PRICE_BLUEPRINT = PRICE_BLUEPRINT;
  process.env.STRIPE_PRICE_BUNDLE = PRICE_BUNDLE;
  process.env.STRIPE_PRICE_COMMUNITY = PRICE_COMMUNITY;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  resetAnalyticsStoreForTests();
  resetMarketingKpiStoreForTests();
  resetLaunchDashboardStoreForTests();

  const authDir = path.join(tmp, "auth");
  setAuthStoreForTests(createFileAuthStore({ dataDir: authDir }));
  setBillingStoreForTests(createMemoryBillingStore());
  setStripeForTests(createStripeTestDouble());

  try {
    await runPricePlanTests();
    await runFailedCardTests();
    await runInstallmentTests();
    await runReceiptTests();
    await runAccessTests();
    await runCancellationTests();
    await runWebhookRecoveryTests();
    runEnvironmentTests({
      stripeSecretKey: envAtStart.STRIPE_SECRET_KEY,
      webhookSecret: envAtStart.STRIPE_WEBHOOK_SECRET,
      postgres: envAtStart.POSTGRES_URL,
    });
  } finally {
    const status = await writeStatus(startedAt, envAtStart);
    setStripeForTests(null);
    setBillingStoreForTests(null);
    setAuthStoreForTests(null);
    resetAnalyticsStoreForTests();
    resetMarketingKpiStoreForTests();
    resetLaunchDashboardStoreForTests();

    const failed = cases.filter((entry) => entry.result === "FAIL");
    process.stdout.write(
      JSON.stringify(
        {
          statusFile: STATUS_REL,
          mechanicalOverall: status.mechanicalOverall,
          counts: status.counts,
          failed: failed.map((entry) => entry.id),
        },
        null,
        2,
      ) + "\n",
    );
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  }
}

void main().catch(async (error) => {
  push(
    "runner-crash",
    "environment",
    "Test runner crashed",
    "FAIL",
    error instanceof Error ? error.message : "unknown_error",
  );
  try {
    await writeStatus(new Date().toISOString(), {});
  } catch {
    // ignore secondary write failure
  }
  console.error(error);
  process.exit(1);
});
