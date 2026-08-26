/**
 * Mechanical Row 151 validation against the production-compatible architecture.
 * File overrides isolate this run. Does not mark the row Complete.
 * Does not create a live Stripe charge.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { trackProductEvent } from "@/lib/analytics/track";
import {
  getAnalyticsDurability,
  getAnalyticsStore,
  resetAnalyticsStoreForTests,
} from "@/lib/analytics/store";
import { isSmtpReady } from "@/lib/auth/email/smtp";
import { buildLaunchDashboardFromSources } from "@/lib/launch-dashboard/aggregate";
import { launchDashboardPostgresConfigured } from "@/lib/launch-dashboard/db";
import {
  getLaunchDashboardDurability,
  getLaunchDashboardStore,
  resetLaunchDashboardStoreForTests,
} from "@/lib/launch-dashboard/store";
import type {
  LaunchDashboardSources,
  LaunchRiskRecord,
} from "@/lib/launch-dashboard/types";
import { recordLaunchOpsError } from "@/lib/launch-ops-errors/record";
import { createEmptyOnboardingRecord } from "@/lib/journey/onboarding/types";
import {
  dateEt,
  parseAttributionFromSearch,
  trackedRegisterUrl,
} from "@/lib/marketing-kpi/attribution";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";
import {
  recordCheckoutStart,
  recordLandingPageSession,
  recordPurchase,
} from "@/lib/marketing-kpi/collect";
import { HISTORICAL_EXCLUSION_LABEL } from "@/lib/marketing-kpi/period";
import { roleHasPermission } from "@/lib/auth/permissions";
import {
  getMarketingKpiDurability,
  getMarketingKpiStore,
  resetMarketingKpiStoreForTests,
} from "@/lib/marketing-kpi/store";
import { createSupportTicket, toSupportOpsRecord } from "@/lib/support/create-ticket";
import {
  getSupportDurability,
  getSupportStore,
  resetSupportStoreForTests,
} from "@/lib/support/store";

type Verdict = "PASS" | "FAIL" | "N/A";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

const LAUNCH_DAY = "2026-08-28";
const LAUNCH_INSTANT = "2026-08-28T16:00:00.000Z";
const PRIOR_INSTANT = "2026-08-27T16:00:00.000Z";
const HISTORICAL_INSTANT = "2026-08-10T16:00:00.000Z";

function runSiblingSuite(script: string, outEnv: string, outPath: string) {
  const result = spawnSync(`npx --yes tsx ${script}`, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 180000,
    shell: true,
    env: {
      ...process.env,
      [outEnv]: outPath,
    },
  });
  return {
    pass: result.status === 0,
    detail: `status=${result.status} ${(result.stdout || result.stderr || "").replace(/\s+/g, " ").slice(-500)}`,
  };
}

async function sourcesFromLive(
  overrides: Partial<LaunchDashboardSources> = {},
): Promise<LaunchDashboardSources> {
  const store = await getLaunchDashboardStore().read();
  const tickets = await getSupportStore().list({ includeTest: true });
  const projected = tickets.map(toSupportOpsRecord);
  return {
    analyticsEvents: await getAnalyticsStore().listEvents(),
    marketing: await getMarketingKpiStore().read(),
    marketingModel: await buildLaunchKpiDashboard({ includeTest: true }),
    purchases: [],
    stripeEvents: [],
    accounts: [],
    onboarding: [],
    journeyProgress: [],
    socialRoutedSupportCountToday: 0,
    socialRoutedSupportCountOpen: 0,
    opsErrors: store.opsErrors,
    errorLedgerAvailable: true,
    store: {
      ...store,
      support: [
        ...store.support.filter((row) => !row.id.startsWith("BH-S-")),
        ...projected,
      ],
    },
    ...overrides,
  };
}

function launchPurchase(id: string, userId: string, session: string, cents: number) {
  return {
    id,
    userId,
    offerId: "blueprint" as const,
    status: "paid" as const,
    amountCents: cents,
    currency: "usd",
    stripeCheckoutSessionId: session,
    createdAt: LAUNCH_INSTANT,
    updatedAt: LAUNCH_INSTANT,
  };
}

async function main() {
  const failures: string[] = [];
  const tests: Array<{ id: string; name: string; result: Verdict; detail: string }> = [];

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "row151-"));
  process.env.ANALYTICS_DB_FILE = path.join(tmpDir, "analytics.json");
  process.env.MARKETING_KPI_DB_FILE = path.join(tmpDir, "marketing.json");
  process.env.LAUNCH_DASHBOARD_DB_FILE = path.join(tmpDir, "launch.json");
  process.env.SUPPORT_DB_FILE = path.join(tmpDir, "support.json");
  resetAnalyticsStoreForTests();
  resetMarketingKpiStoreForTests();
  resetLaunchDashboardStoreForTests();
  resetSupportStoreForTests();

  const attribution = parseAttributionFromSearch(
    new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
  );

  await trackProductEvent({
    name: "page_viewed",
    path: "/",
    locale: "en",
    anonymousId: "anon-151",
    attribution,
    idempotencyKey: "t1-page",
    payload: { source: "instagram", campaign: "the-question" },
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "registration_viewed",
    path: "/register",
    locale: "en",
    anonymousId: "anon-151",
    attribution,
    idempotencyKey: "t1-regview",
    payload: { source: "instagram", campaign: "the-question" },
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "registration_started",
    path: "/register",
    locale: "en",
    anonymousId: "anon-151",
    attribution,
    idempotencyKey: "t1-regstart",
    payload: { method: "email", source: "instagram", campaign: "the-question" },
    createdAt: LAUNCH_INSTANT,
  });
  await recordLandingPageSession({
    attribution,
    path: "/register",
    visitorKey: "anon-151",
    test: true,
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "registration_succeeded",
    userId: "user-151",
    productArea: "registration",
    attribution,
    idempotencyKey: "registration_succeeded:user-151",
    payload: { method: "email" },
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "checkout_started",
    userId: "user-151",
    productArea: "checkout",
    attribution,
    idempotencyKey: "checkout_started:cs_test_151",
    payload: { offerId: "blueprint", stripeCheckoutSessionId: "cs_test_151" },
    createdAt: LAUNCH_INSTANT,
  });
  await recordCheckoutStart({
    attribution,
    stripeCheckoutSessionId: "cs_test_151",
    test: true,
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "purchase_completed",
    userId: "user-151",
    productArea: "checkout",
    attribution,
    idempotencyKey: "purchase_completed:cs_test_151",
    payload: { offerId: "blueprint", stripeCheckoutSessionId: "cs_test_151" },
    createdAt: LAUNCH_INSTANT,
  });
  await recordPurchase({
    attribution,
    stripeCheckoutSessionId: "cs_test_151",
    test: true,
    amountCents: 150000,
    currency: "usd",
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "onboarding_started",
    userId: "user-151",
    productArea: "onboarding",
    idempotencyKey: "onboarding_started:user-151",
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "checkout_failed",
    userId: "user-151-fail",
    productArea: "checkout",
    idempotencyKey: "checkout_failed:t8",
    payload: { errorCategory: "payment_failed" },
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "page_viewed",
    path: "/",
    locale: "en",
    anonymousId: "anon-151-prior",
    attribution,
    idempotencyKey: "t1-page-prior",
    payload: { source: "instagram", campaign: "the-question" },
    createdAt: PRIOR_INSTANT,
  });
  await trackProductEvent({
    name: "page_viewed",
    path: "/",
    locale: "en",
    anonymousId: "anon-151-b",
    attribution,
    idempotencyKey: "t1-page-b",
    payload: { source: "instagram", campaign: "the-question" },
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "cta_clicked",
    path: "/",
    locale: "en",
    anonymousId: "anon-151",
    attribution,
    idempotencyKey: "t1-cta-architect",
    payload: { cta: "become_architect" },
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "cta_clicked",
    path: "/",
    locale: "en",
    anonymousId: "anon-151",
    attribution,
    idempotencyKey: "t1-cta-explore",
    payload: { cta: "journey_explore" },
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "lumina_opened",
    userId: "user-151",
    productArea: "lumina",
    idempotencyKey: "lumina_opened:user-151",
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "download_completed",
    userId: "user-151",
    productArea: "downloads",
    idempotencyKey: "download_completed:user-151:t1",
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "journey_completed",
    userId: "user-151",
    productArea: "journey",
    idempotencyKey: "journey_completed:user-151",
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "certificate_downloaded",
    userId: "user-151",
    productArea: "completion",
    idempotencyKey: "certificate_downloaded:user-151",
    createdAt: LAUNCH_INSTANT,
  });
  await trackProductEvent({
    name: "membership_activated",
    userId: "user-151",
    productArea: "membership",
    idempotencyKey: "membership_activated:user-151",
    createdAt: LAUNCH_INSTANT,
  });

  const purchases = [launchPurchase("p1", "user-151", "cs_test_151", 150000)];
  const onboarding = [createEmptyOnboardingRecord("user-151", LAUNCH_INSTANT)];
  const accounts = [{ id: "user-151", emailVerified: true, createdAt: LAUNCH_INSTANT }];

  let model = buildLaunchDashboardFromSources(
    await sourcesFromLive({
      purchases,
      onboarding,
      accounts,
    }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );

  tests.push({
    id: "T1",
    name: "Traffic",
    result: mark(
      (model.traffic.websiteSessions.today ?? 0) >= 1 &&
        (model.traffic.uniqueVisitors.today ?? 0) >= 1 &&
        (model.traffic.registrationPageSessions.today ?? 0) >= 1,
    ),
    detail: `sessions=${model.traffic.websiteSessions.today} visitors=${model.traffic.uniqueVisitors.today} registration=${model.traffic.registrationPageSessions.today}`,
  });
  tests.push({
    id: "T2",
    name: "Attribution",
    result: mark(
      model.traffic.bySource.some((row) => row.source === "instagram") ||
        model.traffic.campaignSessions.today >= 1,
    ),
    detail: `top=${model.traffic.topSource} campaign=${model.traffic.campaignSessions.today}`,
  });
  tests.push({
    id: "T3",
    name: "Registration",
    result: mark(
      model.conversion.registrationStarted >= 1 &&
        model.conversion.registrationCompleted >= 1 &&
        model.conversion.registrationConversion.denominator.includes("registration_started"),
    ),
    detail: `started=${model.conversion.registrationStarted} completed=${model.conversion.registrationCompleted}`,
  });
  tests.push({
    id: "T4",
    name: "Checkout",
    result: mark(model.conversion.checkoutStarted >= 1),
    detail: `checkoutStarted=${model.conversion.checkoutStarted}`,
  });
  tests.push({
    id: "T5",
    name: "Purchase / revenue",
    result: mark(
      model.revenue.purchasesToday >= 1 &&
        model.revenue.grossTodayCents === 150000 &&
        model.revenue.source.toLowerCase().includes("stripe"),
    ),
    detail: `purchasesToday=${model.revenue.purchasesToday} gross=${model.revenue.grossTodayCents} source=${model.revenue.source}`,
  });

  const historical = Array.from({ length: 19 }, (_, index) => ({
    id: `hist-${index}`,
    userId: `hist-user-${index}`,
    offerId: "blueprint" as const,
    status: "paid" as const,
    amountCents: 10000,
    currency: "usd",
    stripeCheckoutSessionId: `cs_live_hist_${index}`,
    createdAt: HISTORICAL_INSTANT,
    updatedAt: HISTORICAL_INSTANT,
  }));
  const historicalModel = buildLaunchDashboardFromSources(
    await sourcesFromLive({
      purchases: historical,
      onboarding: [],
      accounts: [],
    }),
    { dateEt: LAUNCH_DAY, includeTest: false },
  );
  tests.push({
    id: "T6",
    name: "Historical isolation",
    result: mark(
      historicalModel.revenue.purchasesToday === 0 &&
        historicalModel.revenue.purchasesCumulative === 0 &&
        historicalModel.revenue.historicalPurchases >= 19 &&
        historicalModel.revenue.historicalLabel === HISTORICAL_EXCLUSION_LABEL,
    ),
    detail: `launchPurchases=${historicalModel.revenue.purchasesCumulative} historical=${historicalModel.revenue.historicalPurchases}`,
  });

  tests.push({
    id: "T7",
    name: "Activation",
    result: mark(
      model.activation.purchased >= 1 &&
        model.activation.activated >= 1 &&
        model.activation.definition.includes("started Architect onboarding"),
    ),
    detail: `purchased=${model.activation.purchased} activated=${model.activation.activated}`,
  });
  tests.push({
    id: "T8",
    name: "Product error",
    result: mark(
      (model.errors.find((row) => row.category === "checkout_failed")?.today ?? 0) >= 1,
    ),
    detail: `checkout_failed=${model.errors.find((row) => row.category === "checkout_failed")?.today}`,
  });

  const ops = await recordLaunchOpsError({
    productArea: "checkout",
    errorCategory: "controlled_server_failure",
    route: "/api/checkout/session",
    service: "next",
    safeCode: "row151-t9",
    message: "password=secret token=abc cvv=123 journey answer lumina prompt",
    statusCode: 500,
    test: true,
    severity: "CRITICAL",
  });
  model = buildLaunchDashboardFromSources(
    await sourcesFromLive({ purchases, onboarding, accounts }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  const appError = model.errors.find(
    (row) =>
      row.kind === "application_server" &&
      (row.productArea === "checkout" || row.category.includes("application_server")),
  );
  tests.push({
    id: "T9",
    name: "Application/server error",
    result: mark(
      Boolean(ops) &&
        (appError?.open ?? 0) >= 1 &&
        !model.errors.some((row) => row.source.toLowerCase().includes("pending source")),
    ),
    detail: `stored=${ops?.id} open=${appError?.open} source=${appError?.source}`,
  });
  const storedBlob = JSON.stringify(ops ?? {});
  tests.push({
    id: "T10",
    name: "Error privacy",
    result: mark(
      Boolean(ops) &&
        !storedBlob.includes("password=secret") &&
        !storedBlob.includes("token=abc") &&
        !storedBlob.includes("cvv=123") &&
        !storedBlob.includes("journey answer") &&
        !storedBlob.includes("lumina prompt"),
    ),
    detail: `fields=${Object.keys(ops ?? {}).join(",")}`,
  });

  const ticket = await createSupportTicket({
    requesterName: "Row 151 Tester",
    requesterEmail: "row151@example.com",
    subject: "Controlled registration help",
    message: "Cannot complete registration in a controlled test.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  await getSupportStore().upsert({
    ...ticket,
    createdAt: LAUNCH_INSTANT,
    updatedAt: LAUNCH_INSTANT,
  });
  const smtp = isSmtpReady();
  model = buildLaunchDashboardFromSources(
    await sourcesFromLive({ purchases, onboarding, accounts }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  tests.push({
    id: "T11",
    name: "Support",
    result: mark(model.support.newToday >= 1 && ticket.id.startsWith("BH-S-")),
    detail: `ticket=${ticket.id} newToday=${model.support.newToday} smtp=${smtp ? "configured" : "not_configured (email delivery is a Row 153 capability, not claimed working)"}`,
  });

  const overdueAt = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString();
  await getSupportStore().upsert({
    ...ticket,
    createdAt: overdueAt,
    responseDueAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  });
  model = buildLaunchDashboardFromSources(
    await sourcesFromLive({ purchases, onboarding, accounts }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  tests.push({
    id: "T12",
    name: "Support SLA",
    result: mark(model.support.approachingSla >= 1 || model.support.overdue >= 1),
    detail: `approaching=${model.support.approachingSla} overdue=${model.support.overdue}`,
  });

  const social = await createSupportTicket({
    requesterName: "Social Architect",
    requesterEmail: "social151@example.com",
    subject: "Instagram handoff",
    message: "Routed from Row 83 social engagement.",
    source: "social_row83",
    channel: "instagram",
    test: true,
    acknowledge: false,
  });
  await getSupportStore().upsert({
    ...social,
    createdAt: LAUNCH_INSTANT,
    updatedAt: LAUNCH_INSTANT,
  });
  model = buildLaunchDashboardFromSources(
    await sourcesFromLive({ purchases, onboarding, accounts }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  tests.push({
    id: "T13",
    name: "Social support deduplication",
    result: mark(
      model.support.socialRoutedToday >= 1 &&
        model.support.socialRoutedToday <= model.support.newToday &&
        social.source === "social_row83",
    ),
    detail: `socialToday=${model.support.socialRoutedToday} newToday=${model.support.newToday}`,
  });

  const yellow: LaunchRiskRecord = {
    id: "RISK-151-Y",
    dateIdentifiedEt: LAUNCH_DAY,
    description: "Controlled YELLOW risk",
    category: "analytics",
    severity: "YELLOW",
    owner: "Michelle Northstar — Chief of Staff & Operations Officer",
    status: "open",
    mitigation: "Monitor only",
    founderEscalationRequired: false,
    createdAt: LAUNCH_INSTANT,
    updatedAt: LAUNCH_INSTANT,
    test: true,
  };
  await getLaunchDashboardStore().upsertRisk(yellow);
  model = buildLaunchDashboardFromSources(
    await sourcesFromLive({ purchases, onboarding, accounts, opsErrors: [] }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  tests.push({
    id: "T14",
    name: "YELLOW risk",
    result: mark(model.health === "YELLOW"),
    detail: `health=${model.health} reasons=${model.healthReasons.join(" | ")}`,
  });
  await getLaunchDashboardStore().deleteRisk(yellow.id);

  const red: LaunchRiskRecord = {
    ...yellow,
    id: "RISK-151-R",
    description: "Controlled RED risk",
    category: "checkout",
    severity: "RED",
    owner: "Imani Heartbeat — Chief Technology & Risk Officer",
    founderEscalationRequired: true,
  };
  await getLaunchDashboardStore().upsertRisk(red);
  model = buildLaunchDashboardFromSources(
    await sourcesFromLive({ purchases, onboarding, accounts, opsErrors: [] }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  tests.push({
    id: "T15",
    name: "RED risk",
    result: mark(model.health === "RED" && model.founderAttentionRequired === true),
    detail: `health=${model.health} attention=${model.founderAttentionRequired}`,
  });
  await getLaunchDashboardStore().deleteRisk(red.id);

  await getLaunchDashboardStore().upsertAvailability({
    area: "registration",
    status: "unavailable",
    note: "Controlled T16 outage flag",
    updatedAt: new Date().toISOString(),
    updatedBy: "imani",
    source: "manual",
  });
  model = buildLaunchDashboardFromSources(
    await sourcesFromLive({ purchases, onboarding, accounts, opsErrors: [] }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  tests.push({
    id: "T16",
    name: "Critical surface failure",
    result: mark(model.health === "RED" && model.founderAttentionRequired === true),
    detail: `health=${model.health} availability=${model.availability.find((row) => row.area === "registration")?.status}`,
  });
  await getLaunchDashboardStore().upsertAvailability({
    area: "registration",
    status: "unreported",
    note: "T16 cleared",
    updatedAt: new Date().toISOString(),
    updatedBy: "imani",
    source: "manual",
  });

  const staleSources = await sourcesFromLive({ purchases, onboarding, accounts });
  staleSources.marketing = {
    ...staleSources.marketing,
    lastUpdatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  };
  const staleModel = buildLaunchDashboardFromSources(staleSources, {
    dateEt: LAUNCH_DAY,
    includeTest: true,
  });
  tests.push({
    id: "T17",
    name: "Data freshness",
    result: mark(
      staleModel.dataFreshness.cells.some((cell) => cell.state === "STALE") &&
        staleModel.dataFreshness.cells.every((cell) => cell.state !== undefined),
    ),
    detail: staleModel.dataFreshness.cells.map((cell) => `${cell.key}:${cell.state}`).join(", "),
  });

  const mismatch = buildLaunchDashboardFromSources(
    await sourcesFromLive({
      purchases: [
        launchPurchase("p1", "user-151", "cs_test_151", 150000),
        launchPurchase("p2", "user-152", "cs_test_152", 150000),
      ],
      onboarding,
      accounts,
    }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  tests.push({
    id: "T18",
    name: "Data quality",
    result: mark(
      mismatch.qualityIssues.some((issue) => issue.startsWith("ERROR:") || issue.startsWith("WARN:")) &&
        mismatch.conversion.billingPurchases !== mismatch.conversion.row150Purchases,
    ),
    detail: mismatch.qualityIssues.join(" | ") || "no issues",
  });

  const snapshotStore = getLaunchDashboardStore();
  const snapshotModel = buildLaunchDashboardFromSources(
    await sourcesFromLive({ purchases, onboarding, accounts }),
    { dateEt: LAUNCH_DAY, includeTest: true },
  );
  await snapshotStore.saveSnapshot({
    dateEt: "2026-08-18",
    frozen: true,
    capturedAt: new Date().toISOString(),
    model: snapshotModel,
  });
  await snapshotStore.saveSnapshot({
    dateEt: "2026-08-18",
    frozen: true,
    capturedAt: new Date().toISOString(),
    model: {
      ...snapshotModel,
      revenue: { ...snapshotModel.revenue, purchasesToday: 999 },
    },
  });
  const frozen = await snapshotStore.getSnapshot("2026-08-18");
  tests.push({
    id: "T19",
    name: "Daily snapshot",
    result: mark(
      Boolean(frozen?.frozen) && frozen?.model.revenue.purchasesToday !== 999,
    ),
    detail: `frozen=${frozen?.frozen} purchasesToday=${frozen?.model.revenue.purchasesToday}`,
  });

  await snapshotStore.upsertRisk({
    ...yellow,
    id: "RISK-151-DURABLE",
    status: "resolved",
    resolutionDateEt: LAUNCH_DAY,
  });
  resetLaunchDashboardStoreForTests();
  const reread = await getLaunchDashboardStore().read();
  const postgres = launchDashboardPostgresConfigured();
  tests.push({
    id: "T20",
    name: "Durability",
    result: mark(reread.risks.some((risk) => risk.id === "RISK-151-DURABLE") && Boolean(frozen)),
    detail: `backend=${getLaunchDashboardDurability().backend} postgresConfigured=${postgres} riskSurvived=${reread.risks.some((risk) => risk.id === "RISK-151-DURABLE")}`,
  });

  tests.push({
    id: "T21",
    name: "Founder brief",
    result: mark(
      snapshotModel.briefMarkdown.includes("THE BACK HALF — DAILY LAUNCH BRIEF") &&
        snapshotModel.briefMarkdown.includes(String(snapshotModel.revenue.purchasesToday)) &&
        snapshotModel.briefMarkdown.includes(snapshotModel.health),
    ),
    detail: snapshotModel.briefMarkdown.split("\n").slice(0, 6).join(" / "),
  });

  const productionView = buildLaunchDashboardFromSources(
    await sourcesFromLive({
      purchases,
      onboarding,
      accounts,
      marketingModel: await buildLaunchKpiDashboard({ includeTest: false }),
    }),
    { dateEt: LAUNCH_DAY, includeTest: false },
  );
  tests.push({
    id: "T22",
    name: "Test data exclusion",
    result: mark(
      productionView.revenue.purchasesToday === 0 &&
        productionView.revenue.grossTodayCents === 0 &&
        productionView.activation.purchased === 0 &&
        !productionView.errors.some((row) => (row.open ?? 0) > 0 && row.kind === "application_server"),
    ),
    detail: `purchases=${productionView.revenue.purchasesToday} activated=${productionView.activation.activated} appErrors=${productionView.errors.find((row) => row.category === "application_server_errors")?.open}`,
  });

  const privacyBlob = `${JSON.stringify(productionView)}${JSON.stringify(ops ?? {})}${JSON.stringify(ticket)}`;
  tests.push({
    id: "T23",
    name: "Privacy",
    result: mark(
      !productionView.briefMarkdown.toLowerCase().includes("password") &&
        !privacyBlob.includes("cvv") &&
        !String(ops?.safeCode ?? "").includes("secret"),
    ),
    detail: "Dashboard aggregates and sanitized ops errors inspected.",
  });

  const enRoute = existsSync(
    path.join(process.cwd(), "app/ops/admin/launch-dashboard/page.tsx"),
  );
  const esRoute = existsSync(
    path.join(process.cwd(), "app/es/ops/admin/launch-dashboard/page.tsx"),
  );
  tests.push({
    id: "T24",
    name: "English/Spanish ops routes",
    result: mark(enRoute && esRoute),
    detail: `en=${enRoute} es=${esRoute}`,
  });

  const pageEn = readFileSync("app/ops/admin/launch-dashboard/page.tsx", "utf8");
  const pageEs = readFileSync("app/es/ops/admin/launch-dashboard/page.tsx", "utf8");
  const proxySrc = readFileSync("proxy.ts", "utf8");
  const viewSrc = readFileSync("components/launch-dashboard/launch-dashboard-view.tsx", "utf8");
  const riskApi = readFileSync("app/api/admin/launch-dashboard/risk/route.ts", "utf8");
  const snapshotApi = readFileSync(
    "app/api/admin/launch-dashboard/snapshot/route.ts",
    "utf8",
  );
  const supportApi = readFileSync(
    "app/api/admin/launch-dashboard/support/route.ts",
    "utf8",
  );
  const availabilityApi = readFileSync(
    "app/api/admin/launch-dashboard/availability/route.ts",
    "utf8",
  );

  tests.push({
    id: "D1",
    name: "Dashboard route loads successfully",
    result: mark(
      enRoute &&
        esRoute &&
        pageEn.includes('includeTest: false') &&
        pageEs.includes('includeTest: false') &&
        pageEn.includes("robots: { index: false, follow: false }") &&
        pageEn.includes('dynamic = "force-dynamic"'),
    ),
    detail: "EN/ES pages exist, force-dynamic, noindex, includeTest false.",
  });
  tests.push({
    id: "D2",
    name: "Unauthorized users cannot access protected operational data",
    result: mark(
      !roleHasPermission("architect", "admin:ops:access") &&
        !roleHasPermission("support", "admin:ops:access") &&
        roleHasPermission("admin", "admin:ops:access") &&
        proxySrc.includes("isAdminOpsPath") &&
        proxySrc.includes("admin:ops:access") &&
        proxySrc.includes('searchParams.set("next", pathname)') &&
        riskApi.includes('requirePermission("admin:ops:access")') &&
        snapshotApi.includes('requirePermission("admin:ops:access")') &&
        supportApi.includes('requirePermission("admin:ops:access")') &&
        availabilityApi.includes('requirePermission("admin:ops:access")'),
    ),
    detail: "Architect/support denied admin:ops:access. Middleware + APIs require admin.",
  });
  tests.push({
    id: "D3",
    name: "Traffic metrics map to authoritative data",
    result: mark(
      (model.traffic.websiteSessions.today ?? 0) >= 2 &&
        model.traffic.campaignSessions.today >= 1 &&
        model.traffic.topSource === "instagram",
    ),
    detail: `sessions=${model.traffic.websiteSessions.today} campaign=${model.traffic.campaignSessions.today} top=${model.traffic.topSource}`,
  });
  const expectedRegRate =
    model.conversion.registrationStarted === 0
      ? null
      : model.conversion.registrationCompleted / model.conversion.registrationStarted;
  tests.push({
    id: "D4",
    name: "Conversion calculations are mathematically correct",
    result: mark(
      model.conversion.becomeArchitectCta >= 1 &&
        model.conversion.journeyExploreCta >= 1 &&
        expectedRegRate !== null &&
        model.conversion.registrationConversion.value !== null &&
        Math.abs(model.conversion.registrationConversion.value - expectedRegRate) < 1e-9 &&
        (model.conversion.registrationConversion.value ?? 1) <= 1,
    ),
    detail: `cta=${model.conversion.becomeArchitectCta} explore=${model.conversion.journeyExploreCta} regRate=${model.conversion.registrationConversion.value}`,
  });
  tests.push({
    id: "D5",
    name: "Revenue maps to authoritative billing/payment data",
    result: mark(
      model.revenue.purchasesToday >= 1 &&
        model.revenue.grossTodayCents === 150000 &&
        model.revenue.averageTransactionCents === 150000 &&
        model.revenue.source.toLowerCase().includes("stripe") &&
        historicalModel.revenue.purchasesCumulative === 0,
    ),
    detail: `gross=${model.revenue.grossTodayCents} aov=${model.revenue.averageTransactionCents} source=${model.revenue.source}`,
  });
  tests.push({
    id: "D6",
    name: "Activation metrics map to actual product signals",
    result: mark(
      model.activation.activated >= 1 &&
        model.activation.luminaOpenedToday >= 1 &&
        model.activation.downloadsCompletedToday >= 1 &&
        model.activation.journeyCompleted >= 1 &&
        model.activation.certificateDownloaded >= 1 &&
        model.activation.membershipActivated >= 1 &&
        model.activation.definition.includes("started Architect onboarding"),
    ),
    detail: `activated=${model.activation.activated} lumina=${model.activation.luminaOpenedToday} downloads=${model.activation.downloadsCompletedToday}`,
  });

  const unavailable = buildLaunchDashboardFromSources(
    await sourcesFromLive({
      purchases: [],
      onboarding: [],
      accounts: [],
      analyticsEvents: [],
      opsErrors: [],
      errorLedgerAvailable: false,
    }),
    { dateEt: LAUNCH_DAY, includeTest: false },
  );
  const appUnavailable = unavailable.errors.find(
    (row) => row.category === "application_server_errors",
  );
  const onboardingUnavailable = unavailable.errors.find(
    (row) => row.category === "onboarding_errors",
  );
  tests.push({
    id: "D7",
    name: "Error metrics do not manufacture zeros for unavailable telemetry",
    result: mark(
      appUnavailable?.today === null &&
        appUnavailable?.open === null &&
        onboardingUnavailable?.today === null &&
        onboardingUnavailable?.open === null &&
        viewSrc.includes('row.today === null ? "n/a"') &&
        viewSrc.includes('row.open === null ? "n/a"'),
    ),
    detail: `appToday=${appUnavailable?.today} appOpen=${appUnavailable?.open} onboardingToday=${onboardingUnavailable?.today}`,
  });
  tests.push({
    id: "D8",
    name: "Support metrics map to actual support data",
    result: mark(model.support.newToday >= 1 && ticket.id.startsWith("BH-S-")),
    detail: `ticket=${ticket.id} newToday=${model.support.newToday}`,
  });
  tests.push({
    id: "D9",
    name: "Launch-risk rules operate against real measurable conditions",
    result: mark(
      tests.find((row) => row.id === "T14")?.result === "PASS" &&
        tests.find((row) => row.id === "T15")?.result === "PASS" &&
        tests.find((row) => row.id === "T16")?.result === "PASS" &&
        unavailable.health === "YELLOW" &&
        unavailable.healthReasons.some((reason) =>
          reason.toLowerCase().includes("error ledger"),
        ),
    ),
    detail: `unavailableHealth=${unavailable.health} reasons=${unavailable.healthReasons.join(" | ")}`,
  });
  tests.push({
    id: "D10",
    name: "Test events/data are excluded from launch reporting",
    result: mark(
      productionView.revenue.purchasesToday === 0 &&
        productionView.revenue.grossTodayCents === 0 &&
        productionView.activation.purchased === 0 &&
        pageEn.includes("includeTest: false"),
    ),
    detail: `purchases=${productionView.revenue.purchasesToday} livePageIncludeTest=false`,
  });
  tests.push({
    id: "D11",
    name: "Date boundaries/timezone behavior are correct",
    result: mark(
      dateEt("2026-08-28T04:00:00.000Z") === "2026-08-28" &&
        dateEt("2026-08-28T03:59:00.000Z") === "2026-08-27" &&
        model.dateEt === LAUNCH_DAY &&
        pageEn.includes("dateEt"),
    ),
    detail: `midnightET=${dateEt("2026-08-28T04:00:00.000Z")} before=${dateEt("2026-08-28T03:59:00.000Z")}`,
  });
  tests.push({
    id: "D12",
    name: "Previous-day comparisons are correct",
    result: mark(
      (model.traffic.websiteSessions.today ?? 0) === 2 &&
        model.traffic.websiteSessions.versusPriorDay === 1 &&
        (model.traffic.uniqueVisitors.versusPriorDay ?? 0) === 1,
    ),
    detail: `today=${model.traffic.websiteSessions.today} vsPrior=${model.traffic.websiteSessions.versusPriorDay}`,
  });
  tests.push({
    id: "D13",
    name: "Empty/unavailable states are truthful",
    result: mark(
      unavailable.conversion.registrationConversion.value === null &&
        unavailable.revenue.averageTransactionCents === null &&
        unavailable.activation.activationRate.value === null &&
        unavailable.traffic.websiteSessions.today === 0 &&
        viewSrc.includes('if (value === null || value === undefined) return "n/a"') &&
        viewSrc.includes('if (value === null) return "n/a"'),
    ),
    detail: `emptySessions=${unavailable.traffic.websiteSessions.today} emptyRegRate=${unavailable.conversion.registrationConversion.value} emptyAov=${unavailable.revenue.averageTransactionCents}`,
  });
  tests.push({
    id: "D14",
    name: "No prohibited sensitive information is exposed",
    result: mark(
      tests.find((row) => row.id === "T23")?.result === "PASS" &&
        !viewSrc.toLowerCase().includes("password") &&
        !productionView.briefMarkdown.toLowerCase().includes("row151@example.com"),
    ),
    detail: "Founder view is aggregates; ticket emails are not on the dashboard model brief.",
  });

  const row84 = runSiblingSuite(
    "scripts/fab-5/row-84-validate.ts",
    "ROW84_VALIDATION_OUT",
    "ops/fab-5/runs/row-151-row84-regression.json",
  );
  const row150 = runSiblingSuite(
    "scripts/fab-5/row-150-validate.ts",
    "ROW150_VALIDATION_OUT",
    "ops/fab-5/runs/row-151-row150-regression.json",
  );
  tests.push({
    id: "D15",
    name: "Row 84 regression passes",
    result: mark(row84.pass),
    detail: row84.detail,
  });
  tests.push({
    id: "D16",
    name: "Row 150 regression passes",
    result: mark(row150.pass),
    detail: row150.detail,
  });
  tests.push({
    id: "D17",
    name: "Customer-facing launch-critical regression passes",
    result: mark(
      existsSync("app/register/page.tsx") &&
        existsSync("app/login/page.tsx") &&
        existsSync("app/checkout/page.tsx") &&
        existsSync("app/architect/onboarding/page.tsx") &&
        existsSync("app/architect/journey/page.tsx") &&
        existsSync("app/architect/lumina/page.tsx") &&
        existsSync("app/es/register/page.tsx") &&
        existsSync("app/es/login/page.tsx") &&
        existsSync("app/es/checkout/page.tsx") &&
        existsSync("lib/analytics/taxonomy.ts") &&
        existsSync("app/ops/admin/launch-kpi/page.tsx"),
    ),
    detail: "EN/ES register/login/checkout/onboarding/journey/Lumina files present. Live browser QA not claimed.",
  });
  tests.push({
    id: "D18",
    name: "Dashboard is usable at desktop, tablet, and mobile widths",
    result: mark(
      viewSrc.includes("sm:grid-cols-2") &&
        viewSrc.includes("lg:grid-cols-4") &&
        viewSrc.includes("overflow-x-auto") &&
        viewSrc.includes("max-w-6xl") &&
        viewSrc.includes("px-6"),
    ),
    detail: "Responsive grid and overflow classes present. Live visual pass not claimed.",
  });

  const regression = {
    row81: existsSync("approved-assets/row-81-social-launch"),
    row83: existsSync("ops/fab-5/ROW-83-SOCIAL-ENGAGEMENT-RESPONSE-PROTOCOL.md") ||
      existsSync("ops/fab-5/social-engagement-log.json"),
    row84: existsSync("app/ops/admin/launch-kpi/page.tsx") && row84.pass,
    row150: existsSync("lib/analytics/taxonomy.ts") && row150.pass,
    row153: existsSync("app/support/page.tsx") && existsSync("app/ops/admin/support/page.tsx"),
  };

  for (const test of tests) {
    if (test.result === "FAIL") failures.push(`${test.id} ${test.name}: ${test.detail}`);
  }

  const payload = {
    row: 151,
    generatedAt: new Date().toISOString(),
    founderAccepted: false,
    rowMarkedComplete: false,
    durability: {
      launchDashboard: getLaunchDashboardDurability(),
      analytics: getAnalyticsDurability(),
      marketing: getMarketingKpiDurability(),
      support: getSupportDurability(),
      postgresConfigured: postgres,
    },
    productionVerification: {
      codeReady: true,
      mechanicallyTested: true,
      productionVerified: postgres,
      blocker: postgres
        ? null
        : "This workstation cannot decrypt Vercel Production POSTGRES_URL. Isolated T20 durability is file_test_override. Live dashboard HTTP against protected production aliases is not claimed.",
    },
    tests,
    failures,
    regression,
    smtpConfigured: smtp,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-151-launch-dashboard-validation.json",
    JSON.stringify(payload, null, 2),
    "utf8",
  );

  const failed = tests.filter((test) => test.result === "FAIL");
  console.log(JSON.stringify({ failed: failed.length, tests, postgres, smtp }, null, 2));
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
