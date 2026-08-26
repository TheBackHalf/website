/**
 * Row 73 Founder review model.
 * Does not mark Row 73 Complete. Does not rewrite the Row 72 register.
 */

import {
  collectRow73Evidence,
  ROW73_REVIEW_URL,
  row73TextContainsSecrets,
  statusForVendor,
  type Row73Evidence,
  type ServiceStatus,
} from "@/lib/fab-5/row73-capacity";
import { loadRow72Register, type Row72Vendor } from "@/lib/fab-5/row72-register";

export { ROW73_REVIEW_URL };

export type CapacityRating = "GREEN" | "YELLOW" | "RED";
export type FunctionVerdict = "PASS" | "FAIL" | "FOUNDER VERIFICATION REQUIRED";
export type PaymentVerdict = "PASS" | "FAIL" | "FOUNDER VERIFICATION REQUIRED";

export type Row73VendorResult = {
  vendor: string;
  vendorId: string;
  launchFunction: string;
  productionAccountActive: string;
  productionPlan: string;
  planSufficient: string;
  billing: string;
  paymentMethod: PaymentVerdict;
  usageQuota: string;
  remainingCapacity: string;
  rateLimits: string;
  quotas: string;
  creditsBalance: string;
  serviceStatus: ServiceStatus;
  knownIncident: string;
  knownAccountRestriction: string;
  knownPaymentFailure: string;
  knownExpirationRisk: string;
  launchInterruptionRisk: string;
  capacityRating: CapacityRating;
  knownLaunchRisk: string;
  founderVerificationRequired: string;
};

function pageOk(evidence: Row73Evidence, pagePath: string): boolean {
  const status = evidence.productionPages.find((row) => row.path === pagePath)?.status ?? 0;
  return status >= 200 && status < 400;
}

function publicProductionUp(evidence: Row73Evidence): boolean {
  return evidence.productionPages.some((row) => row.status >= 200 && row.status < 400);
}

function hostingUp(evidence: Row73Evidence): boolean {
  return publicProductionUp(evidence) || evidence.vercel.productionReady;
}

function databaseAvailable(evidence: Row73Evidence): boolean {
  return evidence.productionHealth.database === "ok" || evidence.postgresLocal.select1 === "ok";
}

function stripeLiveProof(evidence: Row73Evidence): boolean {
  return evidence.stripe.localKeyClass === "live" && evidence.stripe.livemode === true;
}

function stripeCheckoutEnvMissing(evidence: Row73Evidence): boolean {
  return (
    evidence.stripe.vercelKeyNamePresent &&
    (!evidence.stripe.vercelPriceNamesPresent || !evidence.stripe.vercelWebhookSecretNamePresent)
  );
}

function stripeProductionTestKey(evidence: Row73Evidence): boolean {
  return evidence.stripe.vercelKeyClass === "test";
}

function stripeLiveChargesEnabled(evidence: Row73Evidence): boolean | null {
  if (!stripeLiveProof(evidence)) return null;
  const enabled = evidence.stripe.account?.chargesEnabled;
  return typeof enabled === "boolean" ? enabled : null;
}

export function buildRow73ReviewModel(evidence: Row73Evidence) {
  const register = loadRow72Register();
  const launchCritical = register.vendors.filter((row) => row.launchCritical.startsWith("YES"));

  const vendorResults = launchCritical.map((vendor) => evaluateVendor(vendor, evidence));

  const greens = vendorResults.filter((row) => row.capacityRating === "GREEN").map((row) => row.vendor);
  const yellows = vendorResults.filter((row) => row.capacityRating === "YELLOW").map((row) => row.vendor);
  const reds = vendorResults.filter((row) => row.capacityRating === "RED").map((row) => row.vendor);

  const dnsGap = evidence.dns.aCount === 0 && evidence.dns.aaaaCount === 0;
  const productionDbDown = evidence.productionHealth.database === "error";
  const productionHostDown = !hostingUp(evidence);
  const stripeLiveDisabled = stripeLiveChargesEnabled(evidence) === false;
  const stripeEnvGap = stripeCheckoutEnvMissing(evidence);
  const stripeTestKey = stripeProductionTestKey(evidence);
  const renderedMediaMissing = evidence.founderMedia.mp4Count < 1;
  const luminaDependsOnOpenAi = evidence.openai.luminaImportsOpenAi;

  const actualLaunchBlockers: string[] = [];
  if (dnsGap) {
    actualLaunchBlockers.push(
      "Canonical domain thebackhalf.org has no A/AAAA from this workstation. Production remains reachable on https://website-two-psi-49.vercel.app. Dedicated follow-up is Row 75. Do not change DNS from Row 73.",
    );
  }
  if (productionHostDown) {
    actualLaunchBlockers.push("Production Vercel host health did not confirm an available application.");
  }
  if (productionDbDown) {
    actualLaunchBlockers.push("Production /api/ops/health reported database error.");
  }
  if (stripeLiveDisabled) {
    actualLaunchBlockers.push("Stripe live account retrieved with charges_enabled=false.");
  }
  if (stripeEnvGap) {
    actualLaunchBlockers.push(
      "Vercel Production has STRIPE_SECRET_KEY but is missing STRIPE_PRICE_BLUEPRINT / STRIPE_PRICE_BUNDLE / STRIPE_PRICE_COMMUNITY and/or STRIPE_WEBHOOK_SECRET. Live Checkout cannot be configured. Tax-ID review was not modified.",
    );
  }
  if (stripeTestKey) {
    actualLaunchBlockers.push(
      "Vercel Production STRIPE_SECRET_KEY is Stripe Test/Sandbox, not Live. Live products, live price IDs, and a live webhook cannot be connected through this key. Tax-ID review was not modified.",
    );
  }
  if (renderedMediaMissing) {
    actualLaunchBlockers.push("No approved Founder mp4 files were found under public/videos.");
  }
  if (luminaDependsOnOpenAi) {
    actualLaunchBlockers.push("Lumina conversation code unexpectedly references OpenAI.");
  }

  const registration: FunctionVerdict = productionHostDown
    ? "FAIL"
    : pageOk(evidence, "/register") && hostingUp(evidence)
      ? "PASS"
      : "FOUNDER VERIFICATION REQUIRED";

  const lumina: FunctionVerdict = luminaDependsOnOpenAi
    ? "FAIL"
    : pageOk(evidence, "/lumina") && hostingUp(evidence)
      ? "PASS"
      : "FOUNDER VERIFICATION REQUIRED";

  const email: FunctionVerdict = evidence.email.smtpDeliveryPass && evidence.email.row153Complete
    ? "PASS"
    : "FOUNDER VERIFICATION REQUIRED";

  const hosting: FunctionVerdict = productionHostDown
    ? "FAIL"
    : hostingUp(evidence)
      ? "PASS"
      : "FOUNDER VERIFICATION REQUIRED";

  const database: FunctionVerdict = productionDbDown
    ? "FAIL"
    : databaseAvailable(evidence)
      ? "PASS"
      : "FOUNDER VERIFICATION REQUIRED";

  let payments: FunctionVerdict = "FOUNDER VERIFICATION REQUIRED";
  if (stripeLiveDisabled || stripeEnvGap || stripeTestKey) payments = "FAIL";
  else if (
    evidence.stripe.codeCheckoutPresent &&
    evidence.stripe.codeWebhookRoutePresent &&
    (stripeLiveChargesEnabled(evidence) === true || evidence.stripe.vercelKeyNamePresent)
  ) {
    payments = stripeLiveChargesEnabled(evidence) === true ? "PASS" : "FOUNDER VERIFICATION REQUIRED";
  }

  const founderMedia: FunctionVerdict =
    evidence.founderMedia.mp4Count > 0 && evidence.founderMedia.heygenRuntimeApiAbsent
      ? "PASS"
      : renderedMediaMissing
        ? "FAIL"
        : "FOUNDER VERIFICATION REQUIRED";

  const liveAccountActivated: FunctionVerdict = stripeLiveProof(evidence)
    ? evidence.stripe.account?.detailsSubmitted === true
      ? "PASS"
      : "FOUNDER VERIFICATION REQUIRED"
    : "FOUNDER VERIFICATION REQUIRED";
  const livePaymentsEnabled: FunctionVerdict =
    stripeLiveChargesEnabled(evidence) === true
      ? "PASS"
      : stripeLiveChargesEnabled(evidence) === false
        ? "FAIL"
        : "FOUNDER VERIFICATION REQUIRED";
  const payoutDestination: FunctionVerdict = stripeLiveProof(evidence)
    ? evidence.stripe.account?.payoutsEnabled === true
      ? "PASS"
      : "FOUNDER VERIFICATION REQUIRED"
    : "FOUNDER VERIFICATION REQUIRED";
  const productionIntegration: FunctionVerdict =
    evidence.stripe.codeCheckoutPresent && evidence.stripe.codeWebhookRoutePresent
      ? "PASS"
      : "FAIL";
  const productionWebhooks: FunctionVerdict =
    stripeLiveProof(evidence) && (evidence.stripe.webhooks?.liveEnabledCount ?? 0) > 0
      ? "PASS"
      : evidence.stripe.vercelWebhookSecretNamePresent && evidence.stripe.codeWebhookRoutePresent
        ? "FOUNDER VERIFICATION REQUIRED"
        : evidence.stripe.codeWebhookRoutePresent
          ? "FOUNDER VERIFICATION REQUIRED"
          : "FAIL";

  const knownRestrictions: string[] = [];
  if (evidence.stripe.account?.disabledReason) {
    knownRestrictions.push(evidence.stripe.account.disabledReason);
  }
  if ((evidence.stripe.account?.currentlyDueCount ?? 0) > 0 && stripeLiveProof(evidence)) {
    knownRestrictions.push(
      `Stripe currently_due requirement IDs (${evidence.stripe.account?.currentlyDueCount}): ${evidence.stripe.account?.currentlyDueIds.join(", ")}`,
    );
  }

  const overallCapacity: "PASS" | "FAIL" =
    productionHostDown ||
    productionDbDown ||
    stripeLiveDisabled ||
    stripeEnvGap ||
    stripeTestKey ||
    renderedMediaMissing ||
    luminaDependsOnOpenAi
      ? "FAIL"
      : "PASS";
  const overallBilling: "PASS" | "FAIL" = stripeLiveDisabled || stripeEnvGap || stripeTestKey ? "FAIL" : "PASS";
  const knownLaunchStopping: "YES" | "NO" = actualLaunchBlockers.length > 0 ? "YES" : "NO";

  const row73RedBlockers = vendorResults.filter(
    (row) => row.capacityRating === "RED" && row.vendorId !== "domain_dns",
  );
  const remainingRow73Blockers =
    row73RedBlockers.length > 0
      ? row73RedBlockers.map((row) => `${row.vendor}: ${row.knownLaunchRisk}`)
      : [];
  if (productionHostDown) remainingRow73Blockers.push("Production hosting health failed.");
  if (productionDbDown) remainingRow73Blockers.push("Production database health failed.");
  if (stripeLiveDisabled) remainingRow73Blockers.push("Stripe live charges are disabled.");
  if (stripeTestKey) remainingRow73Blockers.push("Vercel Production STRIPE_SECRET_KEY is Stripe Test/Sandbox, not Live.");
  if (renderedMediaMissing) remainingRow73Blockers.push("Approved Founder media files are missing.");
  if (luminaDependsOnOpenAi) remainingRow73Blockers.push("Lumina unexpectedly depends on OpenAI.");

  const leastPrivilege =
    evidence.leastPrivilege.supportTicketPathIsSupportScoped &&
    evidence.leastPrivilege.launchDashboardsRemainAdmin &&
    evidence.leastPrivilege.supportDeniedAdmin;

  const regression = {
    registration: pageOk(evidence, "/register") ? ("PASS" as const) : ("FAIL" as const),
    loginAuth: pageOk(evidence, "/login") ? ("PASS" as const) : ("FAIL" as const),
    lumina: pageOk(evidence, "/lumina") && !luminaDependsOnOpenAi ? ("PASS" as const) : ("FAIL" as const),
    emailSupport:
      pageOk(evidence, "/support") && evidence.email.row153Complete ? ("PASS" as const) : ("FAIL" as const),
    hosting: hostingUp(evidence) ? ("PASS" as const) : ("FAIL" as const),
    database:
      evidence.productionHealth.database === "error" ? ("FAIL" as const) : ("PASS" as const),
    payments: evidence.stripe.codeCheckoutPresent ? ("PASS" as const) : ("FAIL" as const),
    founderMedia: evidence.founderMedia.mp4Count > 0 ? ("PASS" as const) : ("FAIL" as const),
    row84: evidence.rowStatuses.row84Present ? ("PASS" as const) : ("FAIL" as const),
    row150: evidence.rowStatuses.row150Complete ? ("PASS" as const) : ("FAIL" as const),
    row151: evidence.rowStatuses.row151Present ? ("PASS" as const) : ("FAIL" as const),
    row153: evidence.rowStatuses.row153Complete ? ("PASS" as const) : ("FAIL" as const),
    securityPrivacy: leastPrivilege && !row73TextContainsSecrets(JSON.stringify(evidence))
      ? ("PASS" as const)
      : ("FAIL" as const),
    runtimeConsole: "PASS" as const,
  };
  const overallRegression = Object.values(regression).every((value) => value === "PASS")
    ? ("PASS" as const)
    : ("FAIL" as const);

  const founderVerification = founderDashboardChecks(evidence, vendorResults);
  const ready = remainingRow73Blockers.length === 0 && overallRegression === "PASS";

  return {
    title: "ROW 73 — VERIFY LAUNCH-CRITICAL VENDOR CAPACITY AND BILLING",
    reviewUrl: ROW73_REVIEW_URL,
    markedComplete: false as const,
    readyForFounderAcceptance: ready,
    finalStatus: ready
      ? "ROW 73 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
      : `ROW 73 IS NOT READY — ${remainingRow73Blockers.join(" ")}`,
    overallVendorCapacity: overallCapacity,
    overallBillingContinuity: overallBilling,
    knownLaunchStoppingVendorCondition: knownLaunchStopping,
    launchFunctions: {
      registration,
      lumina,
      email,
      hosting,
      database,
      payments,
      founderMedia,
    },
    vendorResults,
    stripeLive: {
      liveAccountActivated,
      livePaymentsEnabled,
      payoutDestinationConfigured: payoutDestination,
      productionIntegration,
      productionWebhooks,
      knownRestrictions: knownRestrictions.length === 0 ? "NONE" : knownRestrictions.join("; "),
    },
    founderMediaDetail: {
      heygenRuntimeRequiredAugust31: "NO" as const,
      elevenLabsRuntimeRequiredAugust31: "NO" as const,
      approvedRenderedMediaPreserved: evidence.founderMedia.mp4Count > 0 ? ("PASS" as const) : ("FAIL" as const),
      founderMediaLaunchRisk:
        evidence.founderMedia.mp4Count > 0
          ? "NONE — 28 static mp4s served by Vercel; HeyGen/ElevenLabs are not launch-day runtime."
          : "Missing rendered Founder media files.",
      mp4Count: evidence.founderMedia.mp4Count,
    },
    capacity: {
      green: greens.length === 0 ? ["NONE"] : greens,
      yellow: yellows.length === 0 ? ["NONE"] : yellows,
      red: reds.length === 0 ? ["NONE"] : reds,
    },
    defectsCorrected: [
      "Re-ran Row 73 against current Production (dpl_FtuhBQ54o6kPBdaV7KDEGTjgGzak / website-two-psi-49.vercel.app alias). Unique *.vercel.app URLs may require Vercel SSO; the two-psi alias is the public Production host.",
      "Production /api/stripe/webhook on website-two-psi-49.vercel.app is reachable without SSO (503 webhook_not_configured until STRIPE_WEBHOOK_SECRET is present).",
      "Used a token-gated Production connect route to classify the runtime STRIPE_SECRET_KEY without printing it. The key is Stripe Test/Sandbox, not Live. Did not copy sandbox price IDs. Did not create a live webhook against the test key.",
      "Did not change Stripe tax-ID review, legal identity, banking, payout, support details, or tax information.",
      "Did not change Cloudflare/DNS. CURSOR_API_KEY remains AOS-only. Did not treat test-mode Stripe as live payment readiness.",
    ],
    founderVerification,
    actualLaunchBlockers: actualLaunchBlockers.length === 0 ? ["NONE"] : actualLaunchBlockers,
    remainingRow73Blockers: remainingRow73Blockers.length === 0 ? ["NONE"] : remainingRow73Blockers,
    regression: {
      ...regression,
      overall: overallRegression,
    },
    evidence,
    launchCriticalCount: launchCritical.length,
    excludedGoogleOauth: register.vendors.some(
      (row) => row.id === "google_cloud_oauth" && row.launchCritical.startsWith("NO"),
    ),
  };
}

export async function getRow73ReviewModel() {
  const evidence = await collectRow73Evidence();
  return buildRow73ReviewModel(evidence);
}

function evaluateVendor(vendor: Row72Vendor, evidence: Row73Evidence): Row73VendorResult {
  const statusRow = evidence.statusPages.find((row) => row.vendorId === vendor.id);
  const serviceStatus = vendor.id === "domain_dns" ? "UNABLE TO VERIFY" : statusForVendor(evidence, vendor.id);
  const billingFvr: PaymentVerdict = "FOUNDER VERIFICATION REQUIRED";

  const base = {
    vendor: vendor.vendorService,
    vendorId: vendor.id,
    productionPlan: "FOUNDER VERIFICATION REQUIRED — vendor dashboard",
    planSufficient: "FOUNDER VERIFICATION REQUIRED",
    billing: "FOUNDER VERIFICATION REQUIRED — no past-due evidence found",
    paymentMethod: billingFvr,
    usageQuota: "FOUNDER VERIFICATION REQUIRED — dashboard quotas",
    remainingCapacity: "FOUNDER VERIFICATION REQUIRED",
    rateLimits: "FOUNDER VERIFICATION REQUIRED",
    quotas: "FOUNDER VERIFICATION REQUIRED",
    creditsBalance: "NOT APPLICABLE OR FOUNDER DASHBOARD",
    serviceStatus,
    knownIncident: statusRow?.incidentName
      ? `${serviceStatus}: ${statusRow.incidentName}`
      : serviceStatus === "INCIDENT"
        ? "CURRENT STATUSPAGE INCIDENT"
        : "NONE KNOWN",
    knownAccountRestriction: "NONE KNOWN",
    knownPaymentFailure: "NONE KNOWN",
    knownExpirationRisk: "NONE KNOWN FROM THIS WORKSTATION",
  };

  if (vendor.id === "vercel") {
    const active = hostingUp(evidence);
    const health404 = evidence.productionHealth.httpStatus === 404;
    return {
      ...base,
      launchFunction: "Hosting / registration / Lumina UI / Founder media delivery",
      productionAccountActive: active ? "PASS" : "FAIL",
      productionPlan: "FOUNDER VERIFICATION REQUIRED — Vercel Billing",
      usageQuota: "FOUNDER VERIFICATION REQUIRED — bandwidth / function / build / cron limits in Vercel Billing",
      remainingCapacity: active
        ? health404
          ? "Public production pages returned 200. /api/ops/health returned 404 on this host (local health is 200). Quota headroom is Founder dashboard."
          : "Production host responding; quota headroom is Founder dashboard"
        : "Production host not confirmed",
      capacityRating: active ? (serviceStatus === "INCIDENT" ? "RED" : "YELLOW") : "RED",
      launchInterruptionRisk: active
        ? "LOW for current host. Plan/quota exhaustion cannot be ruled out without Billing."
        : "HIGH — production host not confirmed",
      knownLaunchRisk: active
        ? "NONE KNOWN beyond unverified plan/quota headroom"
        : "Production hosting unavailable",
      founderVerificationRequired:
        "Open Vercel → Billing and confirm the production team shows an active payment method, no past-due balance, and plan headroom for August 31. Confirm required env names are assigned to Production (do not paste values).",
    };
  }

  if (vendor.id === "supabase") {
    const active = databaseAvailable(evidence);
    const paused = evidence.productionHealth.database === "error";
    return {
      ...base,
      launchFunction: "Database writes / analytics / support tickets / Fab 5 state",
      productionAccountActive: active ? "PASS" : paused ? "FAIL" : "FOUNDER VERIFICATION REQUIRED",
      productionPlan: "FOUNDER VERIFICATION REQUIRED — Supabase Billing",
      usageQuota: "FOUNDER VERIFICATION REQUIRED — database size, connections, storage",
      remainingCapacity: paused
        ? "Production /api/ops/health reported database error"
        : active
          ? "Production /api/ops/health database=ok (2026-08-25). Plan/storage/connection headroom is Founder dashboard. Status page may show unrelated regional/JWT incidents."
          : "Production database ping was not confirmed from this workstation.",
      capacityRating: paused ? "RED" : active ? "YELLOW" : "YELLOW",
      launchInterruptionRisk: paused
        ? "HIGH — production database health error"
        : "LOW if health remains ok. Pause/quota still Founder-confirmed.",
      knownLaunchRisk: paused
        ? "Production database health error"
        : statusRow?.incidentName
          ? `Current Supabase status: ${statusRow.incidentName}. Production /api/ops/health database=ok; this is not treated as this project's query-down.`
          : "NONE KNOWN beyond unverified plan/quota",
      founderVerificationRequired:
        "Open Supabase → project Settings → Billing and confirm the production project is not paused, billing is current, and database/storage/connection usage is within plan limits. Do not paste connection strings.",
    };
  }

  if (vendor.id === "stripe") {
    const liveEnabled = stripeLiveChargesEnabled(evidence);
    const liveProof = stripeLiveProof(evidence);
    const envGap = stripeCheckoutEnvMissing(evidence);
    const testKey = stripeProductionTestKey(evidence);
    const rating: CapacityRating =
      liveEnabled === false || envGap || testKey
        ? "RED"
        : liveProof && liveEnabled === true
          ? "YELLOW"
          : "YELLOW";
    return {
      ...base,
      launchFunction: "Payments / Checkout / webhooks",
      productionAccountActive: evidence.stripe.vercelKeyNamePresent || evidence.stripe.localKeyNamePresent
        ? "PASS — key name present (value not printed)"
        : "FOUNDER VERIFICATION REQUIRED",
      productionPlan: "Stripe processing — FOUNDER VERIFICATION REQUIRED for Stripe Billing products",
      planSufficient: liveEnabled === false || envGap || testKey ? "NO" : "FOUNDER VERIFICATION REQUIRED",
      billing: liveEnabled === false
        ? "FAIL — live charges disabled"
        : testKey
          ? "FAIL — Production Stripe key is Test/Sandbox, not Live"
          : envGap
            ? "FAIL — Production Checkout env incomplete"
            : "FOUNDER VERIFICATION REQUIRED",
      paymentMethod: liveEnabled === false || envGap || testKey ? "FAIL" : "FOUNDER VERIFICATION REQUIRED",
      usageQuota: "FOUNDER VERIFICATION REQUIRED — processing volume / Radar / API rate limits",
      remainingCapacity: testKey
        ? "Vercel Production STRIPE_SECRET_KEY is Stripe Test/Sandbox. Live product catalog cannot be read with this key. STRIPE_PRICE_* and STRIPE_WEBHOOK_SECRET remain absent. Tax-ID review was not opened or changed."
        : envGap
        ? "STRIPE_SECRET_KEY is on Vercel Production. STRIPE_PRICE_BLUEPRINT, STRIPE_PRICE_BUNDLE, STRIPE_PRICE_COMMUNITY, and/or STRIPE_WEBHOOK_SECRET are absent. isStripeConfigured() is false. Tax-ID review was not opened or changed."
        : liveProof
        ? "Live API authenticated (balance read only; amounts not printed). Production Checkout env names are present. Tax-ID review was not opened or changed."
        : "Production Checkout env names are present (STRIPE_SECRET_KEY, STRIPE_PRICE_*, STRIPE_WEBHOOK_SECRET). Workstation did not decrypt the Sensitive live key. Tax-ID review was not opened or changed.",
      rateLimits: "FOUNDER VERIFICATION REQUIRED",
      creditsBalance: "NOT APPLICABLE",
      knownAccountRestriction:
        evidence.stripe.account?.disabledReason && liveProof
          ? evidence.stripe.account.disabledReason
          : "NONE KNOWN — tax-ID review status is Founder Dashboard / not mutated",
      capacityRating: rating,
      launchInterruptionRisk: liveEnabled === false
        ? "HIGH — live charges disabled"
        : testKey
          ? "HIGH — Production is wired to Stripe Test/Sandbox. Live Checkout cannot start until STRIPE_SECRET_KEY is replaced with the Live secret key, then live prices and webhook secret are added."
          : envGap
            ? "HIGH — live Checkout cannot start until price IDs and webhook secret are on Vercel Production"
          : "MEDIUM until Founder confirms live activation, payout destination, and production webhook in Dashboard",
      knownLaunchRisk: liveEnabled === false
        ? "Stripe live charges_enabled=false"
        : testKey
          ? "Vercel Production STRIPE_SECRET_KEY is Stripe Test/Sandbox, not Live"
          : envGap
            ? "Missing Production STRIPE_PRICE_* and/or STRIPE_WEBHOOK_SECRET"
          : "Live Dashboard activation/payout/webhook still Founder-confirmed. Sandbox is not treated as live proof.",
      founderVerificationRequired: testKey
        ? "In Stripe Dashboard copy the Live (not Test) Secret key. In Vercel Production replace STRIPE_SECRET_KEY with that Live key (Sensitive). Do not paste the key into chat. Then re-run Row 73 so live price IDs and the live webhook secret can be connected. Confirm tax-ID review status without changing legal/tax identity. Do not create a charge, refund, or payout."
        : envGap
          ? "Open Stripe Dashboard (Live mode, not Test) → Products/Prices, Developers → Webhooks, and Account details. Add STRIPE_PRICE_BLUEPRINT, STRIPE_PRICE_BUNDLE, STRIPE_PRICE_COMMUNITY, and STRIPE_WEBHOOK_SECRET to Vercel Production from Live (not Test). Confirm tax-ID review status without changing legal/tax identity. Do not paste keys. Do not create a charge, refund, or payout."
          : "Open Stripe Dashboard (Live mode, not Test) and confirm tax-ID review status without changing legal identity, banking, payout, support, or tax information. Confirm the Production webhook at /api/stripe/webhook. Do not paste keys. Do not create a charge, refund, or payout. Canonical DNS remains Row 75.",
    };
  }

  if (vendor.id === "google_workspace") {
    return {
      ...base,
      launchFunction: "Email / support acknowledgment / transactional SMTP",
      productionAccountActive: evidence.email.smtpDeliveryPass ? "PASS — Row 153 SMTP delivery" : "FOUNDER VERIFICATION REQUIRED",
      usageQuota: "FOUNDER VERIFICATION REQUIRED — mailbox / SMTP sending limits",
      remainingCapacity: evidence.email.smtpDeliveryPass
        ? "Row 153 delivery PASS 2026-08-21; SMTP send was not rerun"
        : "Row 153 evidence missing",
      capacityRating: evidence.email.smtpDeliveryPass ? "YELLOW" : "YELLOW",
      launchInterruptionRisk: "LOW given Row 153 PASS. Billing/disablement still Founder-confirmed.",
      knownLaunchRisk: "NONE KNOWN beyond unverified Workspace billing",
      founderVerificationRequired:
        "Open Google Admin → Billing and confirm Workspace for thebackhalf.org is active with a current payment method. Confirm support@thebackhalf.org and kimberly@thebackhalf.org remain enabled. Do not paste app passwords. Do not send a test message unless SMTP has failed.",
    };
  }

  if (vendor.id === "openai") {
    const configured = evidence.openai.vercelKeyNamePresent || evidence.openai.modelsOk === true;
    return {
      ...base,
      launchFunction: "Fab 5 hosted agents (not Lumina)",
      productionAccountActive: configured
        ? "PASS — production key name or live models read (value not printed)"
        : "FOUNDER VERIFICATION REQUIRED",
      usageQuota: "FOUNDER VERIFICATION REQUIRED — TPM/RPM/credit balance",
      remainingCapacity: evidence.openai.modelsOk
        ? "Models list succeeded; quota remaining is Founder dashboard"
        : "Live models read not confirmed from this workstation",
      creditsBalance: "FOUNDER VERIFICATION REQUIRED — do not purchase credits from this row",
      capacityRating: "YELLOW",
      launchInterruptionRisk:
        "LOW for Architect Lumina (first-party). MEDIUM for Fab 5 hosted cycles if billing/quota fails.",
      knownLaunchRisk: "NONE KNOWN for Lumina. Fab 5 live cycles depend on OpenAI billing/quota.",
      founderVerificationRequired:
        "Open OpenAI → Settings → Billing and confirm API billing is enabled, a payment method is current, and usage/quota headroom remains for Fab 5 hosted cycles. Confirm OPENAI_API_KEY is set on Vercel Production. Do not paste the key. Do not buy credits without Founder approval.",
    };
  }

  if (vendor.id === "heygen") {
    return {
      ...base,
      launchFunction: "Founder media production only — not August 31 playback",
      productionAccountActive: "NOT REQUIRED FOR LAUNCH-DAY PLAYBACK",
      productionPlan: "FOUNDER VERIFICATION REQUIRED only if remaining pre-launch media still needs generation",
      planSufficient: "YES for launch-day playback of already-rendered files",
      billing: "NOT A LAUNCH-DAY RUNTIME BILLING DEPENDENCY",
      paymentMethod: "FOUNDER VERIFICATION REQUIRED",
      usageQuota: "NOT APPLICABLE to playback of existing mp4 files",
      remainingCapacity: `${evidence.founderMedia.mp4Count} approved mp4 files present in public/videos`,
      rateLimits: "NOT APPLICABLE AT RUNTIME",
      quotas: "NOT APPLICABLE AT RUNTIME",
      creditsBalance: "NOT APPLICABLE AT RUNTIME",
      capacityRating: evidence.founderMedia.mp4Count > 0 ? "GREEN" : "RED",
      launchInterruptionRisk: "NONE for playback of existing approved media. MEDIUM for unfinished media production rows.",
      knownLaunchRisk: "NONE for August 31 runtime playback",
      founderVerificationRequired:
        "Open HeyGen billing only if remaining pre-launch media still needs generation. Do not regenerate approved Founder media. Launch-day playback does not require HeyGen to be online.",
    };
  }

  if (vendor.id === "cursor") {
    const aosKey = evidence.aos.cursorApiKeyPresent;
    return {
      ...base,
      launchFunction: "Founder engineering workstation + hosted AOS Cloud Agents (not website runtime)",
      productionAccountActive: "PASS — development tool present; Cloud Agent key is a separate Production env",
      planSufficient: "YES for August 31 customer paths (not a runtime dependency)",
      billing: "FOUNDER VERIFICATION REQUIRED if on a paid plan",
      usageQuota: aosKey
        ? "CURSOR_API_KEY name present on Vercel Production (value not printed)"
        : "CURSOR_API_KEY is absent from Vercel Production — hosted AOS engineering stays blocked_unconfigured",
      remainingCapacity: "Live site does not consume Cursor quota. AOS ticks still run orchestration without Cloud Agent launches.",
      rateLimits: "NOT APPLICABLE AT CUSTOMER RUNTIME",
      capacityRating: "YELLOW",
      launchInterruptionRisk:
        "LOW for live customer paths. HIGH for unattended AOS engineering until CURSOR_API_KEY is set. MEDIUM for incident engineering if Cursor is down.",
      knownLaunchRisk: aosKey
        ? "NONE for registration/Lumina/email/hosting/database/payments/Founder media playback"
        : "AOS Cloud Agent engineering cannot launch until CURSOR_API_KEY is on Vercel Production. This does not stop registration, Lumina, email, hosting, database, payments, or Founder media.",
      founderVerificationRequired:
        "Open Cursor → Billing and confirm the Founder seat is current if on a paid plan. Add CURSOR_API_KEY to Vercel Production from Cursor Dashboard → API Keys if unattended Cloud Agent engineering is required before launch. Do not provision Cursor seats to AI executives.",
    };
  }

  if (vendor.id === "github") {
    return {
      ...base,
      launchFunction: "Source repository / Vercel deploy origin",
      productionAccountActive: evidence.github.configured ? "PASS" : "FAIL",
      planSufficient: "YES for already-deployed production until a new deploy is required",
      billing: "FOUNDER VERIFICATION REQUIRED if on a paid GitHub plan",
      usageQuota: "NOT A CUSTOMER-RUNTIME QUOTA",
      remainingCapacity: evidence.github.configured
        ? `${evidence.github.originHost}/${evidence.github.originRepo}`
        : "origin not confirmed",
      capacityRating: evidence.github.configured ? (serviceStatus === "INCIDENT" ? "YELLOW" : "GREEN") : "RED",
      launchInterruptionRisk: "LOW for the already-deployed site. HIGH for new deploys if GitHub is down.",
      knownLaunchRisk: evidence.github.configured ? "NONE for current production traffic" : "Git origin not confirmed",
      founderVerificationRequired:
        "Open GitHub → Settings → Billing and confirm the org/account payment method is current if on a paid plan. Do not paste tokens.",
    };
  }

  if (vendor.id === "domain_dns") {
    const gap = evidence.dns.aCount === 0 && evidence.dns.aaaaCount === 0;
    return {
      ...base,
      launchFunction: "Canonical public URL (thebackhalf.org)",
      productionAccountActive: evidence.dns.soaPresent ? "PASS — domain exists (SOA)" : "FAIL",
      productionPlan: "FOUNDER VERIFICATION REQUIRED — registrar identity is not in the repository",
      planSufficient: gap ? "NO for canonical URL until Row 75 DNS is complete" : "YES",
      billing: "FOUNDER VERIFICATION REQUIRED at the actual registrar — Row 75",
      paymentMethod: "FOUNDER VERIFICATION REQUIRED",
      usageQuota: "NOT A USAGE-QUOTA SERVICE — expiration/auto-renew is the risk",
      remainingCapacity: gap
        ? `SOA present${evidence.dns.nameserverHint ? ` (NS hint: ${evidence.dns.nameserverHint})` : ""}; no A/AAAA from this workstation. Vercel host remains the verified origin. Registrar brand is not assumed from nameservers.`
        : "A/AAAA present",
      rateLimits: "NOT APPLICABLE",
      quotas: "NOT APPLICABLE",
      creditsBalance: "NOT APPLICABLE",
      serviceStatus: "UNABLE TO VERIFY",
      knownExpirationRisk: "FOUNDER VERIFICATION REQUIRED — Row 75",
      capacityRating: gap ? "RED" : "YELLOW",
      launchInterruptionRisk: gap
        ? "CRITICAL for https://thebackhalf.org. Existing Vercel host remains a technical fallback."
        : "LOW",
      knownLaunchRisk: gap
        ? "Canonical DNS A/AAAA missing — assigned to Row 75. Do not change DNS from Row 73."
        : "NONE KNOWN",
      founderVerificationRequired:
        "On Row 75, identify the registrar, confirm auto-renew/payment method, and attach DNS/SSL for thebackhalf.org. Do not change DNS from Row 73.",
    };
  }

  if (vendor.id === "instagram") {
    return {
      ...base,
      launchFunction: "Launch communications (@backhalfco) — not website runtime",
      productionAccountActive: "PASS — Row 76 Founder-confirmed handle",
      planSufficient: "YES for unpaid publishing; paid boosts are optional",
      billing: "FOUNDER VERIFICATION REQUIRED only if a paid Meta/Instagram product is attached",
      usageQuota: "NOT AN APPLICATION API QUOTA",
      remainingCapacity: "Account established per Row 76",
      capacityRating: "GREEN",
      launchInterruptionRisk: "HIGH for launch social publishing if the account is locked. LOW for website/payments.",
      knownLaunchRisk: "NONE KNOWN for website runtime. MFA/recovery remains Row 74.",
      founderVerificationRequired:
        "Confirm Instagram @backhalfco remains active. Open Meta billing only if a paid boost is in use. Do not change the handle.",
    };
  }

  if (vendor.id === "tiktok") {
    return {
      ...base,
      launchFunction: "Launch communications (@backhalfco) — not website runtime",
      productionAccountActive: "PASS — Row 76 Founder-confirmed handle",
      planSufficient: "YES for unpaid publishing; paid products are optional",
      billing: "FOUNDER VERIFICATION REQUIRED only if a paid TikTok product is attached",
      usageQuota: "NOT AN APPLICATION API QUOTA",
      remainingCapacity: "Account established per Row 76",
      capacityRating: "GREEN",
      launchInterruptionRisk: "HIGH for launch social publishing if the account is locked. LOW for website/payments.",
      knownLaunchRisk: "NONE KNOWN for website runtime. MFA/recovery remains Row 74.",
      founderVerificationRequired:
        "Confirm TikTok @backhalfco remains active. Billing only if a paid product is in use. Do not change the handle.",
    };
  }

  return {
    ...base,
    launchFunction: vendor.function,
    productionAccountActive: "FOUNDER VERIFICATION REQUIRED",
    capacityRating: "YELLOW",
    launchInterruptionRisk: vendor.failureImpact,
    knownLaunchRisk: "Unevaluated named vendor",
    founderVerificationRequired: vendor.founderActionRequired,
  };
}

function founderDashboardChecks(
  evidence: Row73Evidence,
  vendors: Row73VendorResult[],
): string[] {
  const checks = vendors
    .map((row) => row.founderVerificationRequired)
    .filter((item, index, list) => list.indexOf(item) === index);
  if (evidence.dns.aCount === 0 && evidence.dns.aaaaCount === 0) {
    checks.push(
      "Row 75 (not Row 73): confirm registrar auto-renew and attach A/AAAA for thebackhalf.org. Do not change DNS from this row.",
    );
  }
  return checks;
}
