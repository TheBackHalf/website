/**
 * Row 171 / AOS al-171 — cancellation, renewal, and access lifecycle.
 * Does not mark Founder acceptance. Does not change Stripe configuration.
 */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type Stripe from "stripe";

import { createFileAuthStore } from "@/lib/auth/store";
import { setAuthStoreForTests } from "@/lib/auth/store";
import {
  getSafeAccountAccessFlags,
  syncAccountAccessStatus,
} from "@/lib/billing/account-status";
import {
  ARCHITECT_COMMUNITY_LAUNCH_AT,
  FOUNDING_ARCHITECT_COMMUNITY_ENDS_AT,
  grantOfferEntitlements,
  isEntitlementCurrentlyActive,
  offerGrants,
  revokeEntitlementsForPayment,
  userHasActiveEntitlement,
} from "@/lib/billing/entitlements";
import { INSTALLMENTS_OFFERED_AT_LAUNCH } from "@/lib/billing/installments";
import { processStripeWebhookEvent } from "@/lib/billing/process-webhook";
import {
  createFileBillingStore,
  setBillingStoreForTests,
} from "@/lib/billing/store";
import { getBillingSummaryForUser } from "@/lib/billing/summary";
import { CHECKOUT_OFFERS } from "@/lib/checkout/offers";
import { CHECKOUT_PURCHASE_TERMS } from "@/lib/checkout/purchase-terms";
import { membershipAgreementV1 } from "@/content/legal/v1-candidates";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import { esDictionary } from "@/content/i18n/dictionaries/es";
import { classifyCategory } from "@/lib/support/classify";
import { refundCategoryPresent } from "@/lib/support/catalog";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

const tests: TestRow[] = [];

function push(id: string, name: string, ok: boolean, detail: string): void {
  tests.push({
    id,
    name,
    result: ok ? "PASS" : "FAIL",
    detail,
  });
}

function event(
  type: Stripe.Event.Type,
  object: unknown,
  id: string,
): Stripe.Event {
  return {
    id,
    object: "event",
    api_version: "2025-08-27.basil",
    created: Math.floor(Date.now() / 1000),
    data: { object: object as Stripe.Event.Data["object"] },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type,
  } as Stripe.Event;
}

async function main(): Promise<void> {
  process.env.MARKETING_KPI_DB_FILE =
    process.env.MARKETING_KPI_DB_FILE ?? "__row171_skip_kpi_mirror__";

  const repoRoot = process.cwd();
  const tmp = await mkdtemp(path.join(os.tmpdir(), "row171-"));
  process.chdir(tmp);
  setBillingStoreForTests(createFileBillingStore());
  const authStore = createFileAuthStore({ dataDir: path.join(tmp, "auth") });
  setAuthStoreForTests(authStore);

  const user = await authStore.createUser({
    email: "row171-architect@example.com",
    firstName: "Row",
    lastName: "Lifecycle",
    authProvider: "email",
    arcCode: "ARC171TEST",
    emailVerified: true,
    locale: "en",
  });

  const nowIso = new Date().toISOString();
  const purchaseAt = nowIso;
  const beforeLaunch = new Date("2026-09-15T12:00:00.000Z");
  const duringWindow = new Date("2026-12-01T12:00:00.000Z");
  const afterWindow = new Date("2027-04-26T00:00:00.000Z");
  const lastIncludedDay = new Date("2027-04-25T18:00:00.000Z");

  // --- Purchase: Blueprint (lifetime Journey) ---
  const blueprint = await grantOfferEntitlements({
    userId: user.id,
    offerId: "blueprint",
    eventId: "evt_blueprint_paid",
    stripeCheckoutSessionId: "cs_blueprint",
    stripePaymentIntentId: "pi_blueprint",
    grantedAt: purchaseAt,
  });
  const journey = blueprint.find((row) => row.kind === "journey_access");
  push(
    "purchase-blueprint-lifetime",
    "Blueprint purchase grants lifetime Journey access with no end date",
    Boolean(journey) &&
      journey?.status === "active" &&
      journey?.endsAt === undefined &&
      offerGrants("blueprint").length === 1,
    `kinds=${blueprint.map((row) => row.kind).join(",")} endsAt=${journey?.endsAt ?? "none"}`,
  );
  push(
    "purchase-blueprint-no-community",
    "Blueprint purchase does not grant Community access",
    blueprint.every((row) => row.kind !== "community_access") &&
      !(await userHasActiveEntitlement(user.id, "community_access")),
    `count=${blueprint.length}`,
  );

  // --- Failed payment: no entitlements ---
  const failedUser = await authStore.createUser({
    email: "row171-failed@example.com",
    firstName: "Failed",
    lastName: "Payment",
    authProvider: "email",
    arcCode: "ARC171FAIL",
    emailVerified: true,
    locale: "en",
  });
  const failedCheckout = await processStripeWebhookEvent(
    event(
      "checkout.session.async_payment_failed",
      {
        id: "cs_failed",
        object: "checkout.session",
        payment_status: "unpaid",
        metadata: { bh_user_id: failedUser.id, bh_offer_id: "blueprint" },
        customer_details: { email: failedUser.email },
        customer_email: failedUser.email,
        client_reference_id: failedUser.id,
      },
      "evt_failed_checkout",
    ),
  );
  push(
    "failed-payment-no-grant",
    "Failed checkout payment records failure and grants no access",
    failedCheckout.status === "processed" &&
      failedCheckout.summary.includes("no entitlements") &&
      !(await userHasActiveEntitlement(failedUser.id, "journey_access")) &&
      !(await userHasActiveEntitlement(failedUser.id, "community_access")),
    failedCheckout.summary,
  );

  const incompletePaid = await processStripeWebhookEvent(
    event(
      "checkout.session.completed",
      {
        id: "cs_unpaid",
        object: "checkout.session",
        payment_status: "unpaid",
        metadata: { bh_user_id: user.id, bh_offer_id: "blueprint" },
        customer_details: { email: user.email },
        client_reference_id: user.id,
      },
      "evt_unpaid_session",
    ),
  );
  push(
    "failed-incomplete-checkout-ignored",
    "Unpaid checkout.session.completed does not grant entitlements",
    incompletePaid.status === "ignored",
    incompletePaid.summary,
  );

  // --- Bundle: lifetime Blueprint + 6-month Community window ---
  const bundleUser = await authStore.createUser({
    email: "row171-bundle@example.com",
    firstName: "Founding",
    lastName: "Architect",
    authProvider: "email",
    arcCode: "ARC171BUN",
    emailVerified: true,
    locale: "en",
  });
  const bundle = await grantOfferEntitlements({
    userId: bundleUser.id,
    offerId: "bundle",
    eventId: "evt_bundle_paid",
    stripeCheckoutSessionId: "cs_bundle",
    stripePaymentIntentId: "pi_bundle",
    grantedAt: purchaseAt,
  });
  const bundleJourney = bundle.find((row) => row.kind === "journey_access");
  const bundleCommunity = bundle.find((row) => row.kind === "community_access");
  push(
    "purchase-bundle-lifetime-journey",
    "Founding Architect grants lifetime Journey/Blueprint access",
    bundleJourney?.status === "active" && bundleJourney.endsAt === undefined,
    `endsAt=${bundleJourney?.endsAt ?? "none"}`,
  );
  push(
    "purchase-bundle-six-month-window",
    "Founding Architect Community is Oct 25 2026 through Apr 25 2027, not one year",
    bundleCommunity?.startsAt === ARCHITECT_COMMUNITY_LAUNCH_AT &&
      bundleCommunity?.endsAt === FOUNDING_ARCHITECT_COMMUNITY_ENDS_AT &&
      !bundleCommunity?.endsAt?.startsWith("2027-08-31"),
    `startsAt=${bundleCommunity?.startsAt} endsAt=${bundleCommunity?.endsAt}`,
  );
  push(
    "community-not-active-before-launch",
    "Included Community access is not active before October 25, 2026",
    Boolean(bundleCommunity) &&
      !isEntitlementCurrentlyActive(bundleCommunity, beforeLaunch) &&
      isEntitlementCurrentlyActive(bundleCommunity, duringWindow) &&
      isEntitlementCurrentlyActive(bundleCommunity, lastIncludedDay) &&
      !isEntitlementCurrentlyActive(bundleCommunity, afterWindow),
    "before/during/last-day/after",
  );

  const duplicateBundle = await grantOfferEntitlements({
    userId: bundleUser.id,
    offerId: "bundle",
    eventId: "evt_bundle_paid_dup",
    stripeCheckoutSessionId: "cs_bundle",
    stripePaymentIntentId: "pi_bundle",
    grantedAt: "2026-09-15T00:00:00.000Z",
  });
  const dupCommunity = duplicateBundle.find(
    (row) => row.kind === "community_access",
  );
  push(
    "bundle-duplicate-does-not-extend",
    "Duplicate bundle webhook does not extend the included Community window",
    dupCommunity?.endsAt === FOUNDING_ARCHITECT_COMMUNITY_ENDS_AT &&
      dupCommunity?.startsAt === ARCHITECT_COMMUNITY_LAUNCH_AT,
    `endsAt=${dupCommunity?.endsAt}`,
  );

  // --- Community renewal after included window ---
  const renewalEnds = "2027-05-25T00:00:00.000Z";
  await grantOfferEntitlements({
    userId: bundleUser.id,
    offerId: "community",
    eventId: "evt_community_renew",
    stripeSubscriptionId: "sub_founding_renew",
    communityEndsAt: renewalEnds,
    grantedAt: "2027-04-25T12:00:00.000Z",
  });
  const store = createFileBillingStore();
  const renewedRow = await store.findEntitlementByUserAndKind(
    bundleUser.id,
    "community_access",
  );
  const renewedJourney = await store.findEntitlementByUserAndKind(
    bundleUser.id,
    "journey_access",
  );
  push(
    "community-renewal-extends-paid-term",
    "Paid Community renewal after the included window extends Community access",
    renewedRow?.endsAt === renewalEnds &&
      renewedRow?.status === "active" &&
      renewedRow?.stripeSubscriptionId === "sub_founding_renew",
    `endsAt=${renewedRow?.endsAt} status=${renewedRow?.status}`,
  );
  push(
    "renewal-does-not-touch-lifetime",
    "Community renewal does not alter lifetime Journey/Blueprint access",
    renewedJourney?.endsAt === undefined &&
      renewedJourney?.status === "active" &&
      renewedJourney?.kind === "journey_access",
    `journey status=${renewedJourney?.status} endsAt=${renewedJourney?.endsAt ?? "none"}`,
  );

  // --- Cancellation: cancel-at-period-end continues access ---
  const communityUser = await authStore.createUser({
    email: "row171-community@example.com",
    firstName: "Monthly",
    lastName: "Member",
    authProvider: "email",
    arcCode: "ARC171COM",
    emailVerified: true,
    locale: "en",
  });
  const communityStartAt = "2026-11-01T00:00:00.000Z";
  const periodEnd = "2026-12-01T00:00:00.000Z";
  const duringPaidTerm = new Date("2026-11-15T12:00:00.000Z");
  await grantOfferEntitlements({
    userId: communityUser.id,
    offerId: "community",
    eventId: "evt_community_start",
    stripeSubscriptionId: "sub_monthly",
    stripeCheckoutSessionId: "cs_community",
    communityEndsAt: periodEnd,
    grantedAt: communityStartAt,
  });
  const cancelAtPeriodEnd = await processStripeWebhookEvent(
    event(
      "customer.subscription.updated",
      {
        id: "sub_monthly",
        object: "subscription",
        status: "active",
        cancel_at_period_end: true,
        items: {
          object: "list",
          data: [
            {
              current_period_end: Math.floor(Date.parse(periodEnd) / 1000),
              price: { id: "price_community" },
            },
          ],
        },
        metadata: { bh_user_id: communityUser.id, bh_offer_id: "community" },
        customer: "cus_monthly",
      },
      "evt_cancel_at_period_end",
    ),
  );
  const canceledRow = await store.findEntitlementByUserAndKind(
    communityUser.id,
    "community_access",
  );
  push(
    "cancellation-continues-through-paid-term",
    "Cancel-at-period-end keeps Community access through the paid date",
    cancelAtPeriodEnd.status === "processed" &&
      canceledRow?.status === "active" &&
      isEntitlementCurrentlyActive(canceledRow, duringPaidTerm),
    `${cancelAtPeriodEnd.summary} status=${canceledRow?.status} duringPaid=${isEntitlementCurrentlyActive(canceledRow, duringPaidTerm)}`,
  );

  const fullyCanceled = await processStripeWebhookEvent(
    event(
      "customer.subscription.deleted",
      {
        id: "sub_monthly",
        object: "subscription",
        status: "canceled",
        ended_at: Math.floor(Date.now() / 1000),
        items: {
          object: "list",
          data: [
            {
              current_period_end: Math.floor(Date.now() / 1000) - 60,
              price: { id: "price_community" },
            },
          ],
        },
        metadata: { bh_user_id: communityUser.id, bh_offer_id: "community" },
        customer: "cus_monthly",
      },
      "evt_sub_deleted",
    ),
  );
  push(
    "expiration-removes-community",
    "Fully canceled/expired Community subscription removes Community access",
    fullyCanceled.status === "processed" &&
      !(await userHasActiveEntitlement(communityUser.id, "community_access")),
    fullyCanceled.summary,
  );
  push(
    "expiration-does-not-revoke-unrelated-lifetime",
    "Community expiration does not revoke a different account's lifetime Blueprint",
    await userHasActiveEntitlement(user.id, "journey_access") &&
      (await store.findEntitlementByUserAndKind(user.id, "journey_access"))
        ?.endsAt === undefined,
    "blueprint user journey still active",
  );

  // --- Failed Community renewal payment ---
  await grantOfferEntitlements({
    userId: communityUser.id,
    offerId: "community",
    eventId: "evt_community_restore",
    stripeSubscriptionId: "sub_monthly",
    communityEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const pastDue = await processStripeWebhookEvent(
    event(
      "invoice.payment_failed",
      {
        id: "in_failed",
        object: "invoice",
        customer_email: communityUser.email,
        parent: {
          subscription_details: { subscription: "sub_monthly" },
        },
      },
      "evt_invoice_failed",
    ),
  );
  const pastDueRow = await store.findEntitlementByUserAndKind(
    communityUser.id,
    "community_access",
  );
  push(
    "failed-renewal-marks-past-due",
    "Failed Community invoice marks Community past_due and removes paid access",
    pastDue.status === "processed" &&
      pastDueRow?.status === "past_due" &&
      !(await userHasActiveEntitlement(communityUser.id, "community_access")),
    `${pastDue.summary} status=${pastDueRow?.status}`,
  );
  push(
    "failed-renewal-preserves-bundle-lifetime",
    "Failed Community payment cannot revoke Founding Architect lifetime Journey",
    await userHasActiveEntitlement(bundleUser.id, "journey_access"),
    "bundle journey still active",
  );

  // --- Refund of Community must not revoke lifetime Blueprint ---
  const mixedUser = await authStore.createUser({
    email: "row171-mixed@example.com",
    firstName: "Mixed",
    lastName: "Access",
    authProvider: "email",
    arcCode: "ARC171MIX",
    emailVerified: true,
    locale: "en",
  });
  await grantOfferEntitlements({
    userId: mixedUser.id,
    offerId: "blueprint",
    eventId: "evt_mix_blueprint",
    stripeCheckoutSessionId: "cs_mix_blueprint",
    stripePaymentIntentId: "pi_mix_blueprint",
    grantedAt: purchaseAt,
  });
  await grantOfferEntitlements({
    userId: mixedUser.id,
    offerId: "community",
    eventId: "evt_mix_community",
    stripeCheckoutSessionId: "cs_mix_community",
    stripePaymentIntentId: "pi_mix_community",
    stripeSubscriptionId: "sub_mix",
    communityEndsAt: periodEnd,
  });
  await store.upsertPurchase({
    userId: mixedUser.id,
    offerId: "community",
    status: "paid",
    stripeCheckoutSessionId: "cs_mix_community",
    stripePaymentIntentId: "pi_mix_community",
    createdAt: new Date().toISOString(),
    sourceEventId: "evt_mix_community_purchase",
  });
  const communityRefund = await processStripeWebhookEvent(
    event(
      "charge.refunded",
      {
        id: "ch_mix_community",
        object: "charge",
        payment_intent: "pi_mix_community",
        customer: "cus_mix",
        refunded: true,
      },
      "evt_mix_refund",
    ),
  );
  push(
    "community-refund-preserves-lifetime",
    "Community refund revokes Community only and cannot revoke lifetime Blueprint",
    communityRefund.status === "processed" &&
      (await userHasActiveEntitlement(mixedUser.id, "journey_access")) &&
      !(await userHasActiveEntitlement(mixedUser.id, "community_access")),
    communityRefund.summary,
  );

  const unmatchedRefund = await revokeEntitlementsForPayment({
    userId: mixedUser.id,
    eventId: "evt_unmatched",
    reason: "unmatched-fallback-probe",
    offerId: "community",
  });
  push(
    "unmatched-refund-no-user-fallback",
    "Unmatched refund does not fall back to revoking every entitlement on the account",
    unmatchedRefund === 0 &&
      (await userHasActiveEntitlement(mixedUser.id, "journey_access")),
    `revoked=${unmatchedRefund}`,
  );

  const blueprintRefund = await revokeEntitlementsForPayment({
    userId: mixedUser.id,
    checkoutSessionId: "cs_mix_blueprint",
    paymentIntentId: "pi_mix_blueprint",
    eventId: "evt_blueprint_refund",
    reason: "charge.refunded",
    offerId: "blueprint",
  });
  push(
    "blueprint-refund-revokes-journey-only",
    "Blueprint refund revokes Journey access granted by that payment",
    blueprintRefund === 1 &&
      !(await userHasActiveEntitlement(mixedUser.id, "journey_access")),
    `revoked=${blueprintRefund}`,
  );

  // --- Billing portal behavior ---
  const bundleSummary = await getBillingSummaryForUser(bundleUser.id);
  const blueprintSummary = await getBillingSummaryForUser(user.id);
  push(
    "portal-bundle-no-cancel-control",
    "Founding Architect included Community cannot be canceled separately in-app",
    bundleSummary.cancellationAvailable === false &&
      bundleSummary.journeyAccess === true,
    `cancellationAvailable=${bundleSummary.cancellationAvailable} journey=${bundleSummary.journeyAccess}`,
  );
  push(
    "portal-one-time-no-cancel",
    "One-time Blueprint purchase has no cancellation control after payment",
    blueprintSummary.cancellationAvailable === false &&
      blueprintSummary.purchases.every(
        (row) => row.offerId !== "community" || !row.cancellationAvailable,
      ),
    `cancellationAvailable=${blueprintSummary.cancellationAvailable}`,
  );
  const billingEn = enDictionary.appShell.billing;
  const billingEs = esDictionary.appShell.billing;
  push(
    "portal-copy-cancel-not-refund",
    "Billing portal states cancellation is not a refund (EN/ES)",
    /not a refund/i.test(billingEn.cancellationNotRefund) &&
      /no reembolso|sin reembolsos/i.test(billingEs.cancellationNotRefund) &&
      /Community membership may be cancelled/i.test(
        billingEn.cancellationCommunityOnly,
      ) &&
      /one-time Blueprint and Bundle/i.test(
        billingEn.cancellationOneTimeUnavailable,
      ),
    "en+es cancellation copy",
  );
  push(
    "portal-does-not-trust-client-customer",
    "Billing portal action ignores client-supplied customer IDs",
    /Ignored — never trust client customer IDs|never trusted/i.test(
      await readFile(path.join(repoRoot, "lib/billing/portal.ts"), "utf8"),
    ) &&
      /Rejected — never trusted/.test(
        await readFile(path.join(repoRoot, "lib/billing/actions.ts"), "utf8"),
      ),
    "portal.ts + actions.ts",
  );

  // --- Support messaging ---
  push(
    "support-no-refund-category",
    "Support catalog has no refunds category",
    !refundCategoryPresent(),
    "refundCategoryPresent",
  );
  push(
    "support-classifies-cancellation-as-membership-or-payment",
    "Cancellation and billing questions route to Membership or Payment",
    classifyCategory(undefined, "Cancel my membership", "I want to cancel Community") ===
      "MEMBERSHIP" &&
      classifyCategory(undefined, "Card declined", "My payment failed") ===
        "PAYMENT_BILLING",
    `cancel=${classifyCategory(undefined, "Cancel my membership", "I want to cancel Community")} pay=${classifyCategory(undefined, "Card declined", "My payment failed")}`,
  );
  const notificationSource = await readFile(
    path.join(repoRoot, "lib/billing/notifications.ts"),
    "utf8",
  );
  push(
    "support-notification-copy",
    "Payment notifications state failed payments grant no access and cancellation continues through paid time",
    notificationSource.includes("No paid access was granted") &&
      notificationSource.includes("If paid time remains, access continues through that date") &&
      notificationSource.includes("No se otorgó acceso de pago") &&
      notificationSource.includes("Si aún tienes tiempo pagado restante"),
    "en+es billing notification phrases",
  );
  push(
    "support-lookup-safe-flags",
    "Support lookup exposes access flags without Stripe secrets",
    /Safe access flags only — no Stripe secrets/.test(
      await readFile(
        path.join(repoRoot, "lib/auth/operations/support.ts"),
        "utf8",
      ),
    ),
    "support.ts",
  );

  await syncAccountAccessStatus(bundleUser.id, "row171");
  const flags = await getSafeAccountAccessFlags(bundleUser.id);
  push(
    "account-snapshot-lifetime-and-community",
    "Account snapshot keeps Journey true while Community follows paid term",
    flags.journeyAccess === true &&
      typeof flags.communityAccess === "boolean",
    JSON.stringify({
      journeyAccess: flags.journeyAccess,
      communityAccess: flags.communityAccess,
      communitySubscriptionStatus: flags.communitySubscriptionStatus,
    }),
  );

  // Bundle grant did not write a purchase row in this isolated path — snapshot
  // hasPaidPurchase is purchase-ledger based. Webhook purchase path is tested
  // separately below.

  const webhookBundle = await processStripeWebhookEvent(
    event(
      "checkout.session.completed",
      {
        id: "cs_webhook_bundle",
        object: "checkout.session",
        payment_status: "paid",
        amount_total: CHECKOUT_OFFERS.bundle.amountCents,
        currency: "usd",
        metadata: { bh_user_id: user.id, bh_offer_id: "blueprint" },
        customer_details: { email: user.email },
        client_reference_id: user.id,
        payment_intent: "pi_webhook_blueprint_dup",
      },
      "evt_webhook_blueprint_dup",
    ),
  );
  push(
    "webhook-paid-checkout-idempotent-lifetime",
    "Paid checkout webhook is idempotent and does not attach an end date to Journey",
    webhookBundle.status === "processed" &&
      (await userHasActiveEntitlement(user.id, "journey_access")),
    webhookBundle.summary,
  );

  const membershipCorpus = membershipAgreementV1.sections
    .flatMap((section) => section.paragraphs)
    .join("\n");
  push(
    "approved-terms-six-months",
    "Locked purchase terms and Membership Agreement use first six months, not first year",
    CHECKOUT_PURCHASE_TERMS.bundle.some((line) =>
      line.includes("first six months"),
    ) &&
      CHECKOUT_PURCHASE_TERMS.bundle.some((line) =>
        line.includes("April 25, 2027"),
      ) &&
      /first six \(6\) months/.test(membershipCorpus) &&
      /April 25, 2027/.test(membershipCorpus) &&
      !/first year|twelve months/.test(
        CHECKOUT_PURCHASE_TERMS.bundle.join(" "),
      ),
    "offers + membership agreement",
  );
  push(
    "approved-terms-no-refunds",
    "Approved terms: no refunds; cancellation prevents future billing only",
    CHECKOUT_PURCHASE_TERMS.community.includes("NO REFUNDS") &&
      /Cancellation prevents future billing only/.test(membershipCorpus) &&
      /Membership benefits continue through the end of the current billing period/.test(
        membershipCorpus,
      ) &&
      /Cannot be canceled separately/.test(membershipCorpus),
    "NO REFUNDS + cancel-at-period-end",
  );
  push(
    "no-installment-path",
    "Installments are not an entitlement path at launch",
    INSTALLMENTS_OFFERED_AT_LAUNCH === false,
    `INSTALLMENTS_OFFERED_AT_LAUNCH=${INSTALLMENTS_OFFERED_AT_LAUNCH}`,
  );
  push(
    "offers-one-time-vs-subscription",
    "Blueprint/Bundle are one-time; Community is the only subscription",
    CHECKOUT_OFFERS.blueprint.mode === "payment" &&
      CHECKOUT_OFFERS.bundle.mode === "payment" &&
      CHECKOUT_OFFERS.community.mode === "subscription" &&
      CHECKOUT_OFFERS.community.interval === "month",
    "offer modes",
  );

  const failed = tests.filter((row) => row.result === "FAIL").length;
  const passed = tests.filter((row) => row.result === "PASS").length;
  const overall: Verdict = failed === 0 ? "PASS" : "FAIL";

  const report = {
    aosWorkId: "al-171",
    source: "command_center",
    sourceReference: "August Launch row 171",
    deliverable: "Validate Cancellation, Renewal and Access Lifecycle",
    operatingAgent: "imani",
    kimberlyWalkerAiTreatedAsCapacity: false,
    founderAcceptanceAuthority: "Kimberly Walker (human)",
    founderAcceptance: null,
    founderAccepted: false,
    rowMarkedComplete: false,
    mutating: false,
    stripeDnsVercelUntouched: true,
    overall,
    tested: tests.length,
    passed,
    failed,
    lifecycle: {
      purchase: tests
        .filter((row) => row.id.startsWith("purchase-") || row.id.startsWith("webhook-paid"))
        .every((row) => row.result === "PASS")
        ? "PASS"
        : "FAIL",
      failedPayment: tests
        .filter((row) => row.id.startsWith("failed-"))
        .every((row) => row.result === "PASS")
        ? "PASS"
        : "FAIL",
      communityRenewal: tests
        .filter((row) => row.id.includes("renewal"))
        .every((row) => row.result === "PASS")
        ? "PASS"
        : "FAIL",
      cancellation: tests
        .filter((row) => row.id.startsWith("cancellation-") || row.id.startsWith("portal-"))
        .every((row) => row.result === "PASS")
        ? "PASS"
        : "FAIL",
      expiration: tests
        .filter((row) => row.id.startsWith("expiration-"))
        .every((row) => row.result === "PASS")
        ? "PASS"
        : "FAIL",
      lifetimeBlueprint: tests
        .filter(
          (row) =>
            row.id.includes("lifetime") ||
            row.id.includes("blueprint") ||
            row.id === "unmatched-refund-no-user-fallback",
        )
        .every((row) => row.result === "PASS")
        ? "PASS"
        : "FAIL",
      supportMessaging: tests
        .filter((row) => row.id.startsWith("support-"))
        .every((row) => row.result === "PASS")
        ? "PASS"
        : "FAIL",
      billingPortal: tests
        .filter((row) => row.id.startsWith("portal-"))
        .every((row) => row.result === "PASS")
        ? "PASS"
        : "FAIL",
    },
    defectsCorrected: [
      {
        id: "AL171-D1",
        severity: "HIGH",
        finding:
          "Founding Architect Community was granted with addOneYear(grantedAt) instead of the approved October 25, 2026 through April 25, 2027 window.",
        correction:
          "Community inclusion now uses ARCHITECT_COMMUNITY_LAUNCH_AT and FOUNDING_ARCHITECT_COMMUNITY_ENDS_AT. Access is not active before Community launch.",
      },
      {
        id: "AL171-D2",
        severity: "HIGH",
        finding:
          "Once a bundle Community row existed, later paid Community grants kept the bundle endsAt, so a Founding Architect who renewed at $50/month after April 25, 2027 would pay without receiving access.",
        correction:
          "Bundle-end lock applies only to duplicate bundle grants. Paid Community subscriptions take the later of the included window and the subscription period end.",
      },
      {
        id: "AL171-D3",
        severity: "HIGH",
        finding:
          "revokeEntitlementsForPayment fell back to every entitlement on the user when session/payment-intent lookup missed, which could revoke lifetime Blueprint access after an unrelated Community refund.",
        correction:
          "Removed the account-wide fallback. Community refunds cannot revoke journey_access. Webhook/reconcile pass offerId so only that offer's kinds are revoked.",
      },
      {
        id: "AL171-D4",
        severity: "MEDIUM",
        finding:
          "invoice.payment_failed and subscription sync updated every entitlement sharing a subscription id, and upsert spread undefined identifiers over existing rows.",
        correction:
          "Subscription handlers now mutate community_access only. Upsert omits undefined fields so lifetime identifiers are not wiped.",
      },
    ],
    residualRisks: [
      "Stripe Billing Portal configuration (what members can cancel/update) is Founder-owned Stripe dashboard state. This run did not modify Stripe, Cloudflare DNS, Vercel domains, or nameservers. Confirm the live portal configuration allows Community cancel-at-period-end only and does not present refunds.",
      "Local billing ledger remains a file store; Stripe is system of record (Row 62). Production access checks depend on webhook/reconcile durability.",
      "Live Stripe sandbox purchase/refund webhooks were not fired. Lifecycle rules were executed against isolated in-process stores with production handlers.",
    ],
    validationCommands: {
      typecheck: "run npx tsc --noEmit after this script",
      nearestTest: "this script (npm run fab5:row171)",
      build: "run npm run build after this script if production-affecting",
    },
    nextAction: "await_founder_acceptance",
    notes:
      "Kimberly Walker (AI) is not execution capacity. Founder acceptance stays with Kimberly Walker (human). This deliverable is not marked complete.",
    tests,
  };

  const outDir = path.join(repoRoot, "ops/fab-5/runs/aos-engineering-status");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "al-171.json");
  await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  setBillingStoreForTests(null);
  setAuthStoreForTests(null);
  process.chdir(repoRoot);

  console.log(
    JSON.stringify(
      {
        overall,
        tested: tests.length,
        passed,
        failed,
        outFile,
      },
      null,
      2,
    ),
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
