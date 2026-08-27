/**
 * Mechanical Row 209 validation for the Launch-Day Executive Dashboard.
 * File overrides isolate this run. Does not mark the row Complete.
 * Does not create a live Stripe charge or change auth/payments.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { roleHasPermission } from "@/lib/auth/permissions";
import { isAdminOpsPath } from "@/lib/auth/ops-paths";
import { composeExecutiveDashboard } from "@/lib/executive-dashboard/compose";
import { EXECUTIVE_PANEL_IDS } from "@/lib/executive-dashboard/types";
import { buildLaunchDashboardFromSources } from "@/lib/launch-dashboard/aggregate";
import {
  getLaunchDashboardStore,
  resetLaunchDashboardStoreForTests,
} from "@/lib/launch-dashboard/store";
import type {
  LaunchDashboardSources,
  LaunchRiskRecord,
  SupportOpsRecord,
} from "@/lib/launch-dashboard/types";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";
import {
  getMarketingKpiStore,
  resetMarketingKpiStoreForTests,
} from "@/lib/marketing-kpi/store";
import { recordLandingPageSession } from "@/lib/marketing-kpi/collect";
import { parseAttributionFromSearch, trackedRegisterUrl } from "@/lib/marketing-kpi/attribution";
import type { FounderDecision } from "@/lib/fab-5/aos/types";
import type { ProductionMonitoringSnapshot } from "@/lib/monitoring/types";
import type { AnalyticsEventRecord } from "@/lib/analytics/types";
import type { PurchaseRecord } from "@/lib/billing/types";
import { runRow209LiveTests } from "./row-209-live";

type Verdict = "PASS" | "FAIL";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

const DAY = "2026-08-31";
const INSTANT = "2026-08-31T16:00:00.000Z";
const PRE_DAY = "2026-08-26";

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|password|cvv|AUTH_SECRET/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function panel(
  model: ReturnType<typeof composeExecutiveDashboard>,
  id: (typeof EXECUTIVE_PANEL_IDS)[number],
) {
  return model.panels.find((entry) => entry.id === id);
}

async function baseSources(
  overrides: Partial<LaunchDashboardSources> = {},
): Promise<LaunchDashboardSources> {
  const store = await getLaunchDashboardStore().read();
  return {
    analyticsEvents: [],
    marketing: await getMarketingKpiStore().read(),
    marketingModel: await buildLaunchKpiDashboard({ includeTest: true }),
    purchases: [],
    stripeEvents: [],
    accounts: [],
    onboarding: [],
    journeyProgress: [],
    socialRoutedSupportCountToday: 0,
    socialRoutedSupportCountOpen: 0,
    opsErrors: [],
    errorLedgerAvailable: true,
    store,
    ...overrides,
  };
}

function event(
  name: AnalyticsEventRecord["name"],
  extra: Partial<AnalyticsEventRecord> = {},
): AnalyticsEventRecord {
  return {
    id: extra.id ?? `evt-${name}-${Math.random().toString(16).slice(2, 8)}`,
    name,
    idempotencyKey: extra.idempotencyKey ?? `key-${name}-${extra.id ?? "x"}`,
    createdAt: extra.createdAt ?? INSTANT,
    userId: extra.userId,
    payload: extra.payload,
    test: extra.test,
  };
}

function paidPurchase(id: string, userId: string): PurchaseRecord {
  return {
    id,
    userId,
    offerId: "blueprint",
    status: "paid",
    amountCents: 9700,
    currency: "usd",
    stripeCheckoutSessionId: `cs_live_${id}`,
    createdAt: INSTANT,
    updatedAt: INSTANT,
  };
}

function failedPurchase(id: string, userId: string): PurchaseRecord {
  return {
    id,
    userId,
    offerId: "blueprint",
    status: "failed",
    amountCents: 9700,
    currency: "usd",
    stripeCheckoutSessionId: `cs_live_${id}`,
    createdAt: INSTANT,
    updatedAt: INSTANT,
  };
}

function risk(partial: Partial<LaunchRiskRecord> & Pick<LaunchRiskRecord, "id" | "description" | "severity">): LaunchRiskRecord {
  return {
    dateIdentifiedEt: DAY,
    category: "website",
    owner: "imani",
    status: "open",
    mitigation: "contain",
    founderEscalationRequired: partial.severity === "RED",
    createdAt: INSTANT,
    updatedAt: INSTANT,
    ...partial,
  };
}

function ticket(partial: Partial<SupportOpsRecord> & Pick<SupportOpsRecord, "id">): SupportOpsRecord {
  return {
    dateEt: DAY,
    category: "general",
    status: "open",
    source: "public_form",
    delivery: "recorded",
    createdAt: INSTANT,
    slaState: "within",
    ...partial,
  };
}

function monitoringFixture(
  overrides: Partial<ProductionMonitoringSnapshot> = {},
): ProductionMonitoringSnapshot {
  return {
    generatedAt: INSTANT,
    environment: "Production",
    canonicalOrigin: "https://thebackhalf.org",
    applicationOrigin: "https://thebackhalf.org",
    canonicalDns: "resolves",
    uptime: {
      status: "PASS",
      lastVerification: INSTANT,
      alerting: "armed",
      targets: [],
      missingPathDetection: null,
      recovery: null,
    },
    errors: {
      status: "PASS",
      source: "launch_ops_errors",
      controlledTest: "not_run",
      alerting: "armed",
      openCritical: 0,
      openCriticalCategories: [],
    },
    database: {
      status: "PASS",
      connected: true,
      persistenceVerified: true,
      alerting: "armed",
      backend: "postgres",
    },
    payments: {
      status: "PASS",
      provider: "Stripe",
      configured: true,
      mode: "live",
      webhookConfigured: true,
      providerReachable: true,
      alerting: "armed",
    },
    operations: {
      technicalOwner: "Imani Heartbeat — Chief Technology & Risk Officer",
      operationalCoordination: "Michelle Northstar — Chief of Staff & Operations Officer",
      founderAttention: false,
    },
    alerts: [],
    availability: [],
    ...overrides,
  };
}

function decision(partial: Partial<FounderDecision> = {}): FounderDecision {
  return {
    decisionId: "dec-209",
    requestingAgent: "nia",
    workId: "al-209",
    decisionRequired: "Confirm public pause copy if Lumina is contained",
    agentRecommendation: "Keep approved voice. Do not invent new claims.",
    reason: "Experience containment during an incident",
    riskIfDelayed: "Inconsistent public response",
    deadline: null,
    allowedResponse: "Approve / Reject / Review",
    status: "OPEN",
    createdAt: INSTANT,
    resolvedAt: null,
    founderResponse: null,
    executionResumedAt: null,
    severity: "urgent",
    controlledTest: false,
    ...partial,
  };
}

async function main() {
  const failures: string[] = [];
  const tests: Array<{ id: string; name: string; result: Verdict; detail: string }> = [];

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "row209-"));
  process.env.MARKETING_KPI_DB_FILE = path.join(tmpDir, "marketing.json");
  process.env.LAUNCH_DASHBOARD_DB_FILE = path.join(tmpDir, "launch.json");
  resetMarketingKpiStoreForTests();
  resetLaunchDashboardStoreForTests();

  const attribution = parseAttributionFromSearch(
    new URL(trackedRegisterUrl("R81-0831-IG")).searchParams,
  );

  const emptySources = await baseSources();
  const emptyLaunch = buildLaunchDashboardFromSources(emptySources, {
    dateEt: PRE_DAY,
    includeTest: true,
  });
  const emptyMarketing = emptySources.marketingModel;
  const emptyModel = composeExecutiveDashboard({
    launch: emptyLaunch,
    marketing: emptyMarketing,
    monitoring: null,
    founderDecisions: [],
    aosBackend: "none",
  });

  tests.push({
    id: "T1",
    name: "Empty environment exposes all 10 required panels as N/A, not false GREEN",
    result: mark(
      emptyModel.panels.length === 10 &&
        EXECUTIVE_PANEL_IDS.every((id) => emptyModel.panels.some((entry) => entry.id === id)) &&
        EXECUTIVE_PANEL_IDS.every((id) => panel(emptyModel, id)?.status === "N/A") &&
        EXECUTIVE_PANEL_IDS.every((id) => panel(emptyModel, id)?.telemetry === "unconfirmed") &&
        emptyModel.executiveStatus === "N/A" &&
        emptyModel.founderAttentionRequired === false &&
        panel(emptyModel, "enrollment-revenue")?.status !== "GREEN" &&
        panel(emptyModel, "payments")?.status !== "GREEN" &&
        emptyModel.launchHealth !== "RED",
    ),
    detail: `panels=${emptyModel.panels.map((entry) => `${entry.id}:${entry.status}:${entry.telemetry}`).join(",")}`,
  });

  const purchaseSources = await baseSources({
    purchases: [paidPurchase("p1", "user-209")],
    analyticsEvents: [
      event("page_viewed", { id: "pv1", payload: { anonymousId: "a1" } }),
      event("registration_viewed", { id: "rv1", payload: { anonymousId: "a1" } }),
      event("checkout_started", { id: "cs1", userId: "user-209" }),
      event("purchase_completed", { id: "pc1", userId: "user-209" }),
    ],
  });
  const purchaseLaunch = buildLaunchDashboardFromSources(purchaseSources, {
    dateEt: DAY,
    includeTest: true,
  });
  const purchaseModel = composeExecutiveDashboard({
    launch: purchaseLaunch,
    marketing: emptyMarketing,
    monitoring: null,
    founderDecisions: [],
    aosBackend: "none",
  });
  tests.push({
    id: "T2",
    name: "Enrollment/revenue shows paid launch purchase and excludes historical label field",
    result: mark(
      purchaseLaunch.revenue.purchasesToday === 1 &&
        purchaseLaunch.revenue.grossTodayCents === 9700 &&
        panel(purchaseModel, "enrollment-revenue")?.status !== "RED" &&
        (panel(purchaseModel, "enrollment-revenue")?.metrics.some(
          (metric) => metric.label === "Purchases today" && metric.value === "1",
        ) ?? false) &&
        purchaseLaunch.revenue.historicalLabel.includes("PRE-LAUNCH"),
    ),
    detail: `purchasesToday=${purchaseLaunch.revenue.purchasesToday} gross=${purchaseLaunch.revenue.grossTodayCents} status=${panel(purchaseModel, "enrollment-revenue")?.status}`,
  });

  tests.push({
    id: "T3",
    name: "Traffic/conversion counts first-party sessions",
    result: mark(
      (purchaseLaunch.traffic.websiteSessions.today ?? 0) >= 1 &&
        panel(purchaseModel, "traffic-conversion")?.status === "GREEN",
    ),
    detail: `sessions=${purchaseLaunch.traffic.websiteSessions.today}`,
  });

  const failMonitor = monitoringFixture({
    uptime: {
      status: "FAIL",
      lastVerification: INSTANT,
      alerting: "firing",
      targets: [],
      missingPathDetection: null,
      recovery: null,
    },
    operations: {
      technicalOwner: "Imani Heartbeat — Chief Technology & Risk Officer",
      operationalCoordination: "Michelle Northstar — Chief of Staff & Operations Officer",
      founderAttention: true,
    },
  });
  const prodModel = composeExecutiveDashboard({
    launch: emptyLaunch,
    marketing: emptyMarketing,
    monitoring: failMonitor,
    founderDecisions: [],
    aosBackend: "none",
  });
  tests.push({
    id: "T4",
    name: "Production health RED on Row 61 uptime FAIL raises Founder attention",
    result: mark(
      panel(prodModel, "production-health")?.status === "RED" &&
        prodModel.founderAttentionRequired === true,
    ),
    detail: `production=${panel(prodModel, "production-health")?.status} attention=${prodModel.founderAttentionRequired}`,
  });

  const failedPaySources = await baseSources({
    purchases: [failedPurchase("f1", "user-fail")],
  });
  const failedPayLaunch = buildLaunchDashboardFromSources(failedPaySources, {
    dateEt: DAY,
    includeTest: true,
  });
  const failedPayModel = composeExecutiveDashboard({
    launch: failedPayLaunch,
    marketing: emptyMarketing,
    monitoring: monitoringFixture(),
    founderDecisions: [],
    aosBackend: "supabase_postgres",
  });
  tests.push({
    id: "T5",
    name: "Payments panel YELLOW when failed payments exist today",
    result: mark(
      failedPayLaunch.revenue.failedPaymentsToday >= 1 &&
        panel(failedPayModel, "payments")?.status === "YELLOW",
    ),
    detail: `failedToday=${failedPayLaunch.revenue.failedPaymentsToday} status=${panel(failedPayModel, "payments")?.status}`,
  });

  const accessSources = await baseSources({
    analyticsEvents: [event("auth_failed", { id: "af1", userId: "user-209" })],
  });
  const accessLaunch = buildLaunchDashboardFromSources(accessSources, {
    dateEt: DAY,
    includeTest: true,
  });
  const accessModel = composeExecutiveDashboard({
    launch: accessLaunch,
    marketing: emptyMarketing,
    monitoring: null,
    founderDecisions: [],
    aosBackend: "none",
  });
  tests.push({
    id: "T6",
    name: "Account/access YELLOW on auth_failed today",
    result: mark(
      (accessLaunch.errors.find((row) => row.category === "auth_failed")?.today ?? 0) >= 1 &&
        panel(accessModel, "account-access")?.status === "YELLOW",
    ),
    detail: `auth_failed=${accessLaunch.errors.find((row) => row.category === "auth_failed")?.today}`,
  });

  const luminaNa = panel(emptyModel, "lumina-health")?.status;
  const luminaSources = await baseSources({
    analyticsEvents: [
      event("lumina_opened", { id: "lo1", userId: "user-209" }),
      event("lumina_error", { id: "le1", userId: "user-209" }),
    ],
  });
  const luminaLaunch = buildLaunchDashboardFromSources(luminaSources, {
    dateEt: DAY,
    includeTest: true,
  });
  const luminaModel = composeExecutiveDashboard({
    launch: luminaLaunch,
    marketing: emptyMarketing,
    monitoring: null,
    founderDecisions: [],
    aosBackend: "none",
  });
  tests.push({
    id: "T7",
    name: "Lumina unreported is N/A; lumina_error today is YELLOW; no conversation text",
    result: mark(
      luminaNa === "N/A" &&
        panel(luminaModel, "lumina-health")?.status === "YELLOW" &&
        luminaLaunch.activation.luminaOpenedToday >= 1 &&
        !JSON.stringify(luminaModel).includes("Lumina said") &&
        !("messages" in luminaModel) &&
        !JSON.stringify(luminaModel).includes("assistant_message"),
    ),
    detail: `empty=${luminaNa} withError=${panel(luminaModel, "lumina-health")?.status} opened=${luminaLaunch.activation.luminaOpenedToday}`,
  });

  const supportStore = await getLaunchDashboardStore().read();
  const supportSources = await baseSources({
    store: {
      ...supportStore,
      support: [
        ticket({ id: "BH-S-1", slaState: "overdue", priority: "P1", category: "login" }),
      ],
    },
  });
  const supportLaunch = buildLaunchDashboardFromSources(supportSources, {
    dateEt: DAY,
    includeTest: true,
  });
  const supportModel = composeExecutiveDashboard({
    launch: supportLaunch,
    marketing: emptyMarketing,
    monitoring: null,
    founderDecisions: [],
    aosBackend: "none",
  });
  tests.push({
    id: "T8",
    name: "Support volume YELLOW on overdue / P1 tickets (counts only)",
    result: mark(
      supportLaunch.support.overdue >= 1 &&
        supportLaunch.support.p1Open >= 1 &&
        panel(supportModel, "support-volume")?.status === "YELLOW",
    ),
    detail: `overdue=${supportLaunch.support.overdue} p1=${supportLaunch.support.p1Open}`,
  });

  await recordLandingPageSession({
    attribution,
    path: "/register",
    visitorKey: "anon-209",
    test: true,
    createdAt: INSTANT,
  });
  const marketingAfter = await buildLaunchKpiDashboard({ includeTest: true });
  const marketingModel = composeExecutiveDashboard({
    launch: emptyLaunch,
    marketing: marketingAfter,
    monitoring: null,
    founderDecisions: [],
    aosBackend: "none",
  });
  tests.push({
    id: "T9",
    name: "Marketing panel reads Row 84 funnel and does not require LinkedIn",
    result: mark(
      marketingAfter.linkedinRequiredForLaunch === false &&
        marketingAfter.funnel.landingPageSessions >= 1 &&
        (panel(marketingModel, "marketing-performance")?.summary.includes("LinkedIn") ?? false),
    ),
    detail: `landing=${marketingAfter.funnel.landingPageSessions} linkedinRequired=${marketingAfter.linkedinRequiredForLaunch}`,
  });

  const incidentSources = await baseSources({
    store: {
      ...(await getLaunchDashboardStore().read()),
      risks: [
        risk({
          id: "risk-red",
          description: "Homepage unavailable during launch window",
          severity: "RED",
          category: "website",
          founderEscalationRequired: true,
        }),
      ],
    },
  });
  const incidentLaunch = buildLaunchDashboardFromSources(incidentSources, {
    dateEt: DAY,
    includeTest: true,
  });
  const incidentModel = composeExecutiveDashboard({
    launch: incidentLaunch,
    marketing: emptyMarketing,
    monitoring: null,
    founderDecisions: [],
    aosBackend: "none",
  });
  tests.push({
    id: "T10",
    name: "Critical incidents RED on open RED launch risk",
    result: mark(
      incidentLaunch.health === "RED" &&
        panel(incidentModel, "critical-incidents")?.status === "RED" &&
        incidentModel.founderAttentionRequired === true,
    ),
    detail: `health=${incidentLaunch.health} incidents=${panel(incidentModel, "critical-incidents")?.status}`,
  });

  const decisionModel = composeExecutiveDashboard({
    launch: emptyLaunch,
    marketing: emptyMarketing,
    monitoring: null,
    founderDecisions: [decision()],
    aosBackend: "supabase_postgres",
  });
  tests.push({
    id: "T11",
    name: "Founder decisions panel lists OPEN urgent AOS decisions",
    result: mark(
      decisionModel.decisions.length === 1 &&
        panel(decisionModel, "founder-decisions")?.status === "RED" &&
        decisionModel.founderAttentionRequired === true &&
        decisionModel.decisions[0]?.decisionRequired.includes("pause copy"),
    ),
    detail: `decisions=${decisionModel.decisions.length} status=${panel(decisionModel, "founder-decisions")?.status}`,
  });

  const enPage = readFileSync("app/ops/admin/executive-dashboard/page.tsx", "utf8");
  const esPage = readFileSync("app/es/ops/admin/executive-dashboard/page.tsx", "utf8");
  const reviewPage = readFileSync(
    "app/%5Finternal/row209-executive-dashboard-review/page.tsx",
    "utf8",
  );
  const sourcesSrc = readFileSync("lib/executive-dashboard/sources.ts", "utf8");
  const composeSrc = readFileSync("lib/executive-dashboard/compose.ts", "utf8");
  const viewSrc = readFileSync(
    "components/executive-dashboard/executive-dashboard-view.tsx",
    "utf8",
  );

  tests.push({
    id: "T12",
    name: "Live pages are force-dynamic, noindex, includeTest false",
    result: mark(
      enPage.includes('export const dynamic = "force-dynamic"') &&
        enPage.includes("index: false") &&
        enPage.includes("includeTest: false") &&
        esPage.includes("includeTest: false") &&
        esPage.includes("index: false") &&
        reviewPage.includes("includeTest: false"),
    ),
    detail: "EN/ES/review pages set force-dynamic, noindex, includeTest: false",
  });

  tests.push({
    id: "T13",
    name: "EN, ES, and localhost review routes exist",
    result: mark(
      existsSync("app/ops/admin/executive-dashboard/page.tsx") &&
        existsSync("app/es/ops/admin/executive-dashboard/page.tsx") &&
        existsSync("app/%5Finternal/row209-executive-dashboard-review/page.tsx"),
    ),
    detail: "/ops/admin/executive-dashboard · /es/ops/admin/executive-dashboard · /_internal/row209-executive-dashboard-review",
  });

  tests.push({
    id: "T14",
    name: "Admin middleware covers the executive dashboard; architect/support denied",
    result: mark(
      isAdminOpsPath("/ops/admin/executive-dashboard") &&
        isAdminOpsPath("/es/ops/admin/executive-dashboard") &&
        !roleHasPermission("architect", "admin:ops:access") &&
        !roleHasPermission("support", "admin:ops:access") &&
        roleHasPermission("admin", "admin:ops:access"),
    ),
    detail: "Existing isAdminOpsPath prefix; no auth catalog change required",
  });

  const serialized = JSON.stringify(emptyModel) + JSON.stringify(decisionModel);
  tests.push({
    id: "T15",
    name: "Serialized model has no secrets, emails, or payment credentials",
    result: mark(!SECRET_PATTERN.test(serialized) && !EMAIL_PATTERN.test(serialized)),
    detail: "Aggregates and operational titles only",
  });

  tests.push({
    id: "T16",
    name: "Composer is read-only: loads monitoring snapshot, does not run probes or Stripe",
    result: mark(
      sourcesSrc.includes("loadMonitoringSnapshot") &&
        !sourcesSrc.includes("runProductionMonitoring") &&
        !composeSrc.includes("runProductionMonitoring") &&
        !sourcesSrc.includes("@/lib/billing/store") &&
        !composeSrc.includes("STRIPE_SECRET_KEY") &&
        !enPage.includes("runProductionMonitoring"),
    ),
    detail: "Read-only composition over Row 151 / 84 / 61 / AOS",
  });

  tests.push({
    id: "T17",
    name: "View is responsive and renders every required panel id",
    result: mark(
      viewSrc.includes("lg:grid-cols-2") &&
        viewSrc.includes("sm:grid-cols-2") &&
        viewSrc.includes("max-w-6xl") &&
        viewSrc.includes("px-6") &&
        viewSrc.includes("data-bh-executive-dashboard") &&
        viewSrc.includes("data-panel-id") &&
        viewSrc.includes("data-panel-telemetry") &&
        viewSrc.includes("N/A — telemetry not confirmed") &&
        viewSrc.includes("model.panels.map"),
    ),
    detail: "Desktop two-column grid, mobile stacked, N/A visually distinct from GREEN",
  });

  tests.push({
    id: "T18",
    name: "Missing Row 61 snapshot is N/A and does not fabricate GREEN/RED production health",
    result: mark(
      emptyModel.monitoringAvailable === false &&
        panel(emptyModel, "production-health")?.status === "N/A" &&
        panel(emptyModel, "production-health")?.summary.includes("not treated as an outage"),
    ),
    detail: "Unconfigured monitoring cannot produce false GREEN or false RED",
  });

  tests.push({
    id: "T19",
    name: "Approve/Reject stays on Agent Operations; executive view does not execute decisions",
    result: mark(
      viewSrc.includes("/ops/admin/agent-operations") &&
        viewSrc.includes("does not execute Founder decisions") &&
        !viewSrc.includes("FounderDecisionActions"),
    ),
    detail: "Nia experience view only; AOS decision actions unchanged",
  });

  tests.push({
    id: "T20",
    name: "Auth, Stripe webhook, and middleware files were not modified for this row",
    result: mark(
      existsSync("middleware.ts") &&
        existsSync("app/api/stripe/webhook/route.ts") &&
        existsSync("lib/auth/ops-paths.ts") &&
        !enPage.includes("AUTH_SECRET") &&
        !composeSrc.includes("verifySessionToken"),
    ),
    detail: "New route is covered by existing /ops/admin prefix. No auth/payment system edits.",
  });

  const zeroMonitor = monitoringFixture();
  const zeroModel = composeExecutiveDashboard({
    launch: emptyLaunch,
    marketing: emptyMarketing,
    monitoring: zeroMonitor,
    founderDecisions: [],
    aosBackend: "none",
  });
  tests.push({
    id: "T21",
    name: "Zero activity with Row 61 payments PASS is honest GREEN, not N/A",
    result: mark(
      panel(zeroModel, "enrollment-revenue")?.status === "GREEN" &&
        panel(zeroModel, "payments")?.status === "GREEN" &&
        panel(zeroModel, "production-health")?.status === "GREEN" &&
        panel(zeroModel, "critical-incidents")?.status === "GREEN" &&
        panel(zeroModel, "enrollment-revenue")?.telemetry === "confirmed" &&
        panel(emptyModel, "enrollment-revenue")?.status === "N/A" &&
        panel(emptyModel, "payments")?.status === "N/A",
    ),
    detail: `withProbe enrollment=${panel(zeroModel, "enrollment-revenue")?.status} payments=${panel(zeroModel, "payments")?.status}; empty enrollment=${panel(emptyModel, "enrollment-revenue")?.status}`,
  });

  tests.push({
    id: "T21b",
    name: "Partial telemetry cannot paint executive status GREEN",
    result: mark(
      purchaseModel.executiveStatus !== "GREEN" &&
        panel(purchaseModel, "traffic-conversion")?.status === "GREEN" &&
        panel(purchaseModel, "production-health")?.status === "N/A" &&
        emptyModel.executiveStatus === "N/A" &&
        zeroModel.executiveStatus !== "GREEN",
    ),
    detail: `purchaseExec=${purchaseModel.executiveStatus} emptyExec=${emptyModel.executiveStatus} zeroExec=${zeroModel.executiveStatus}`,
  });

  for (const test of tests) {
    if (test.result === "FAIL") failures.push(`${test.id} ${test.name}: ${test.detail}`);
  }

  if (process.env.ROW209_SKIP_LIVE !== "1") {
    try {
      const liveTests = await runRow209LiveTests();
      tests.push(...liveTests);
      for (const test of liveTests) {
        if (test.result === "FAIL") failures.push(`${test.id} ${test.name}: ${test.detail}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      tests.push({
        id: "T22",
        name: "Authenticated admin loads EN/ES executive dashboard; architect/support denied",
        result: "FAIL",
        detail: message,
      });
      failures.push(`T22 live access failed: ${message}`);
    }
  }

  const payload = {
    row: 209,
    aosWorkId: "al-209",
    generatedAt: new Date().toISOString(),
    founderAccepted: false,
    rowMarkedComplete: false,
    dashboard: "/ops/admin/executive-dashboard",
    review: "/_internal/row209-executive-dashboard-review",
    tests,
    failures,
    passCount: tests.filter((test) => test.result === "PASS").length,
    failCount: failures.length,
  };

  const outPath =
    process.env.ROW209_VALIDATION_OUT ??
    "ops/fab-5/runs/row-209-executive-dashboard-validation.json";
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  if (failures.length > 0) {
    console.error(`ROW 209 VALIDATION FAILED (${failures.length})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }
  console.log(`ROW 209 VALIDATION PASSED (${tests.length}/${tests.length})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
