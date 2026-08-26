/**
 * Row 84 targeted correction tests A–J.
 * Preserves original validation evidence. Does not mark the row Complete.
 * Does not create a live Stripe charge.
 */

import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  CAMPAIGN_UTM,
  PUBLIC_DESTINATION_PATH,
  parseAttributionFromSearch,
  trackedRegisterUrl,
} from "@/lib/marketing-kpi/attribution";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";
import {
  recordCheckoutStart,
  recordLandingPageSession,
  recordPurchase,
} from "@/lib/marketing-kpi/collect";
import { marketingKpiPostgresConfigured, loadPostgresEnvFromLocalFile } from "@/lib/marketing-kpi/db";
import {
  HISTORICAL_EXCLUSION_LABEL,
  PERIOD_LABELS,
  CAMPAIGN_START_UTC,
  classifyRecord,
  reportingPeriodAt,
} from "@/lib/marketing-kpi/period";
import { buildDailyLaunchReport } from "@/lib/marketing-kpi/report";
import {
  migrateKpiPurchasesNow,
  resetKpiPurchaseMigrationForTests,
} from "@/lib/marketing-kpi/migrate";
import {
  getMarketingKpiDurability,
  getMarketingKpiStore,
  resetMarketingKpiStoreForTests,
} from "@/lib/marketing-kpi/store";

type Verdict = "PASS" | "FAIL";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

async function withTempKpiStore<T>(fn: () => Promise<T>): Promise<T> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "row84-final-"));
  const previous = process.env.MARKETING_KPI_DB_FILE;
  process.env.MARKETING_KPI_DB_FILE = path.join(tmpDir, "database.json");
  resetMarketingKpiStoreForTests();
  resetKpiPurchaseMigrationForTests();
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete process.env.MARKETING_KPI_DB_FILE;
    else process.env.MARKETING_KPI_DB_FILE = previous;
    resetMarketingKpiStoreForTests();
    resetKpiPurchaseMigrationForTests();
    await rm(tmpDir, { recursive: true, force: true });
  }
}

function readEnvLocalName(name: string): string | undefined {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return undefined;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (key !== name) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

function loadNamedEnvFile(filePath: string, allowed: Set<string>): void {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!allowed.has(key) || process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (value.length > 0) process.env[key] = value;
  }
}

async function loadPostgresFromVercelApi(): Promise<{ loaded: boolean; source: string }> {
  const token = readEnvLocalName("VERCEL_TOKEN");
  if (!token) return { loaded: false, source: "vercel_token_absent" };
  const projectId = "prj_FCi9UmpaTJVGQwlHeREMqDEfJsOy";
  const teamId = "team_78QcHJQpS3JFQLL0nRZTUY8e";
  const listUrl = new URL(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env`,
  );
  listUrl.searchParams.set("decrypt", "true");
  listUrl.searchParams.set("teamId", teamId);
  const res = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    return { loaded: false, source: `vercel_env_http_${res.status}` };
  }
  const json = (await res.json()) as {
    envs?: Array<{ id?: string; key?: string; value?: string; target?: string[] }>;
  };
  const rows = Array.isArray(json) ? json : json.envs ?? [];
  const wanted = new Set([
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL",
    "POSTGRES_PRISMA_URL",
  ]);
  const matching = rows.filter(
    (item) => item && typeof item.key === "string" && wanted.has(item.key),
  );
  for (const item of matching) {
    let value = typeof item.value === "string" ? item.value : "";
    if (!value && item.id) {
      const oneUrl = new URL(
        `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(item.id)}`,
      );
      oneUrl.searchParams.set("decrypt", "true");
      oneUrl.searchParams.set("teamId", teamId);
      const one = await fetch(oneUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (one.ok) {
        const body = (await one.json()) as { value?: string };
        if (typeof body.value === "string") value = body.value;
      }
    }
    if (!value || !item.key) continue;
    const targets = Array.isArray(item.target) ? item.target : [];
    if (targets.length > 0 && !targets.includes("production") && !targets.includes("preview") && !targets.includes("development")) {
      continue;
    }
    if (!process.env[item.key]) process.env[item.key] = value;
  }
  if (!process.env.POSTGRES_URL?.trim()) {
    const fallback =
      process.env.POSTGRES_URL_NON_POOLING?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_PRISMA_URL?.trim();
    if (fallback) process.env.POSTGRES_URL = fallback;
  }
  const matchingKeys = matching.map((item) => item.key).join(",");
  return {
    loaded: marketingKpiPostgresConfigured(),
    source: `vercel_api_match=${matchingKeys || "none"};value=${Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING)};count=${rows.length}`,
  };
}

async function ensureProductionPostgresEnv(): Promise<{ loaded: boolean; source: string }> {
  loadPostgresEnvFromLocalFile();
  if (marketingKpiPostgresConfigured()) {
    return { loaded: true, source: "local_or_process" };
  }
  const fromApi = await loadPostgresFromVercelApi();
  if (fromApi.loaded) return fromApi;
  const token = readEnvLocalName("VERCEL_TOKEN");
  const tmpFile = path.join(os.tmpdir(), `row84-pg-env-${process.pid}.tmp`);
  const env = { ...process.env };
  if (token) env.VERCEL_TOKEN = token;
  spawnSync(
    "npx --yes vercel link --yes --project website --scope back-half",
    {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
      shell: true,
      timeout: 60000,
    },
  );
  const pulled = spawnSync(
    `npx --yes vercel env pull "${tmpFile}" --environment production --yes --project website --scope back-half`,
    {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
      shell: true,
      timeout: 90000,
    },
  );
  try {
    loadNamedEnvFile(
      tmpFile,
      new Set([
        "POSTGRES_URL",
        "POSTGRES_URL_NON_POOLING",
        "DATABASE_URL",
        "POSTGRES_PRISMA_URL",
      ]),
    );
    if (!process.env.POSTGRES_URL?.trim()) {
      const fallback =
        process.env.POSTGRES_URL_NON_POOLING?.trim() ||
        process.env.DATABASE_URL?.trim() ||
        process.env.POSTGRES_PRISMA_URL?.trim();
      if (fallback) process.env.POSTGRES_URL = fallback;
    }
    if (marketingKpiPostgresConfigured()) {
      return { loaded: true, source: "vercel_production_env" };
    }
    const err = (pulled.stderr || pulled.stdout || "")
      .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
      .replace(/vcp_[A-Za-z0-9]+/g, "[redacted-token]")
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    return {
      loaded: false,
      source: `${fromApi.source};vercel_pull_exit_${pulled.status};${err || "no_cli_error"}`,
    };
  } finally {
    try {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    } catch {
      // Temp env file must not remain on disk.
    }
  }
}

async function hostedKpiRoundTrip(): Promise<{ ok: boolean; detail: string }> {
  const secret = readEnvLocalName("CRON_SECRET");
  if (!secret) return { ok: false, detail: "cron_secret_absent" };
  const hosts = ["website-two-psi-49.vercel.app", "thebackhalf.org"];
  const key = `row84-durability-${Date.now().toString(36)}`;
  for (const host of hosts) {
    try {
      const write = await fetch(`https://${host}/api/fab-5/kpi-durability`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "write", key }),
      });
      if (write.status === 404) continue;
      const retrieve = await fetch(`https://${host}/api/fab-5/kpi-durability`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "retrieve", key }),
      });
      const retrieveJson = (await retrieve.json()) as {
        ok?: boolean;
        found?: boolean;
        backend?: string;
        dataDirIsSourceOfTruth?: boolean;
      };
      const cleanup = await fetch(`https://${host}/api/fab-5/kpi-durability`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "cleanup", key }),
      });
      const cleanupJson = (await cleanup.json()) as { ok?: boolean };
      if (
        write.ok &&
        retrieve.ok &&
        retrieveJson.found === true &&
        retrieveJson.backend === "supabase_postgres" &&
        retrieveJson.dataDirIsSourceOfTruth === false &&
        cleanup.ok &&
        cleanupJson.ok === true
      ) {
        return { ok: true, detail: `hosted=${host};backend=supabase_postgres;cleanup=true` };
      }
      return {
        ok: false,
        detail: `hosted=${host}; write=${write.status}; retrieve=${retrieve.status}; backend=${retrieveJson.backend ?? "none"}; cleanup=${cleanup.status}`,
      };
    } catch {
      continue;
    }
  }
  return { ok: false, detail: "hosted_route_not_deployed" };
}

async function main() {
  const failures: string[] = [];
  const tests: Array<{
    id: string;
    name: string;
    expected: string;
    actual: string;
    result: Verdict;
  }> = [];

  function record(test: {
    id: string;
    name: string;
    expected: string;
    actual: string;
    pass: boolean;
  }) {
    const result = mark(test.pass);
    tests.push({
      id: test.id,
      name: test.name,
      expected: test.expected,
      actual: test.actual,
      result,
    });
    if (!test.pass) failures.push(`${test.id} ${test.name}: ${test.actual}`);
  }

  const postgresEnv = await ensureProductionPostgresEnv();
  delete process.env.MARKETING_KPI_DB_FILE;
  resetMarketingKpiStoreForTests();
  resetKpiPurchaseMigrationForTests();
  await migrateKpiPurchasesNow();

  const productionModel = await buildLaunchKpiDashboard({ includeTest: false });
  const historical = productionModel.periods.preLaunchHistorical.purchases;
  const launchPurchases = productionModel.periods.launchCampaign.purchases;
  const launchRevenue = productionModel.periods.launchCampaign.revenueCents;
  record({
    id: "A",
    name: "Historical isolation",
    expected:
      "Historical Purchases = 19; Launch Purchases = 0; Launch Revenue = $0 before qualifying August 28 activity",
    actual: `historical=${historical}; launchPurchases=${launchPurchases}; launchRevenueCents=${launchRevenue}; excluded=${productionModel.periods.preLaunchHistorical.excludedFromLaunchKpi}`,
    pass:
      historical === 19 &&
      launchPurchases === 0 &&
      launchRevenue === 0 &&
      productionModel.periods.preLaunchHistorical.excludedFromLaunchKpi,
  });

  const preBoundary = "2026-08-28T03:59:59.000Z";
  const postBoundary = "2026-08-28T04:00:00.000Z";
  const pre = classifyRecord({ createdAt: preBoundary });
  const post = classifyRecord({ createdAt: postBoundary });
  await withTempKpiStore(async () => {
    const ig = parseAttributionFromSearch(
      new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
    );
    await recordPurchase({
      attribution: ig,
      stripeCheckoutSessionId: "cs_live_row84_pre_boundary",
      amountCents: 150000,
      createdAt: preBoundary,
    });
    await recordPurchase({
      attribution: ig,
      stripeCheckoutSessionId: "cs_live_row84_post_boundary",
      amountCents: 150000,
      createdAt: postBoundary,
    });
    const model = await buildLaunchKpiDashboard({ includeTest: false });
    record({
      id: "B",
      name: "August 28 boundary",
      expected:
        "Pre-boundary → pre_launch_historical; post-boundary 2026-08-28 12:00 AM ET → launch_campaign; timezone America/New_York",
      actual: `pre=${pre.period}/${pre.classification}; post=${post.period}/${post.classification}; startUtc=${CAMPAIGN_START_UTC.toISOString()}; dashboardLaunch=${model.periods.launchCampaign.purchases}; dashboardHistorical=${model.periods.preLaunchHistorical.purchases}`,
      pass:
        reportingPeriodAt(preBoundary) === "pre_launch_historical" &&
        reportingPeriodAt(postBoundary) === "launch_campaign" &&
        CAMPAIGN_START_UTC.toISOString() === "2026-08-28T04:00:00.000Z" &&
        model.periods.launchCampaign.purchases === 1 &&
        model.periods.preLaunchHistorical.purchases === 1 &&
        model.funnel.purchases === 1,
    });
  });

  await withTempKpiStore(async () => {
    const ig = parseAttributionFromSearch(
      new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
    );
    await recordPurchase({
      attribution: ig,
      stripeCheckoutSessionId: "cs_test_row84_sandbox_launch",
      amountCents: 150000,
      test: true,
      createdAt: "2026-08-28T15:00:00.000Z",
    });
    const founder = await buildLaunchKpiDashboard({ includeTest: false });
    const testView = await buildLaunchKpiDashboard({ includeTest: true });
    record({
      id: "C",
      name: "Test data exclusion",
      expected:
        "Sandbox/test transactions do not appear as launch purchases, launch revenue, or conversion",
      actual: `founderPurchases=${founder.periods.launchCampaign.purchases}; founderRevenue=${founder.periods.launchCampaign.revenueCents}; testViewPurchases=${testView.periods.launchCampaign.purchases}`,
      pass:
        founder.periods.launchCampaign.purchases === 0 &&
        founder.periods.launchCampaign.revenueCents === 0 &&
        founder.totals.rates.purchaseConversion === null &&
        testView.periods.launchCampaign.purchases === 1,
    });
  });

  const postgresConfigured = marketingKpiPostgresConfigured();
  delete process.env.MARKETING_KPI_DB_FILE;
  resetMarketingKpiStoreForTests();
  const durableKey = `row84-durable-${Date.now()}`;
  if (postgresConfigured) {
    const store = getMarketingKpiStore();
    await store.appendEvent({
      name: "landing_page_session",
      createdAt: "2026-08-28T16:00:00.000Z",
      dateEt: "2026-08-28",
      attribution: parseAttributionFromSearch(
        new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
      ),
      path: "/register",
      idempotencyKey: `landing:2026-08-28:${durableKey}:/register:R78-0828-IG`,
      test: true,
    });
    resetMarketingKpiStoreForTests();
    const again = getMarketingKpiStore();
    const reread = await again.read();
    const found = reread.events.some(
      (event) => event.idempotencyKey.endsWith(`${durableKey}:/register:R78-0828-IG`),
    );
    const durability = getMarketingKpiDurability();
    record({
      id: "D",
      name: "Durable storage",
      expected:
        "KPI data remains available after a new store instance (serverless-equivalent) on Supabase Postgres; .data/ is not production source of truth",
      actual: `backend=${durability.backend}; found=${found}; dataDirIsSourceOfTruth=${durability.dataDirIsSourceOfTruth}`,
      pass:
        durability.backend === "supabase_postgres" &&
        found &&
        durability.dataDirIsSourceOfTruth === false,
    });
  } else {
    const hosted = await hostedKpiRoundTrip();
    const durability = getMarketingKpiDurability();
    record({
      id: "D",
      name: "Durable storage",
      expected:
        "KPI data remains available after a new store instance on Supabase Postgres; .data/ is not production source of truth",
      actual: `hosted=${hosted.detail}; envSource=${postgresEnv.source}; dataDirIsSourceOfTruth=${durability.dataDirIsSourceOfTruth}`,
      pass: hosted.ok && durability.dataDirIsSourceOfTruth === false,
    });
  }

  await withTempKpiStore(async () => {
    const ig = parseAttributionFromSearch(
      new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
    );
    const first = await recordPurchase({
      attribution: ig,
      stripeCheckoutSessionId: "cs_test_row84_idempotent",
      amountCents: 150000,
      test: true,
      createdAt: "2026-08-28T18:00:00.000Z",
    });
    const second = await recordPurchase({
      attribution: ig,
      stripeCheckoutSessionId: "cs_test_row84_idempotent",
      amountCents: 150000,
      test: true,
      createdAt: "2026-08-28T18:00:05.000Z",
    });
    const model = await buildLaunchKpiDashboard({ includeTest: true });
    record({
      id: "E",
      name: "Purchase idempotency",
      expected: "Same checkout/webhook identifier processed twice → one purchase and one revenue contribution",
      actual: `first=${first.status}; second=${second.status}; purchases=${model.periods.launchCampaign.purchases}; revenueCents=${model.periods.launchCampaign.revenueCents}`,
      pass:
        first.status === "created" &&
        second.status === "duplicate" &&
        model.periods.launchCampaign.purchases === 1 &&
        model.periods.launchCampaign.revenueCents === 150000,
    });
  });

  await withTempKpiStore(async () => {
    const ig = parseAttributionFromSearch(
      new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
    );
    const sessionId = "cs_test_row84_reconcile";
    const recorded = await recordPurchase({
      attribution: ig,
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: "pi_test_row84_reconcile",
      amountCents: 150000,
      currency: "usd",
      test: true,
      createdAt: "2026-08-28T19:00:00.000Z",
    });
    const model = await buildLaunchKpiDashboard({ includeTest: true });
    const ledger = (await getMarketingKpiStore().read()).purchases.find(
      (row) => row.stripeCheckoutSessionId === sessionId,
    );
    record({
      id: "F",
      name: "Payment reconciliation",
      expected:
        "Sandbox authoritative payment amount ↔ durable KPI purchase ↔ dashboard purchase/revenue (no live charge)",
      actual: `eventAmount=${recorded.record.amountCents}; ledgerAmount=${ledger?.amountCents}; dashboardPurchases=${model.periods.launchCampaign.purchases}; dashboardRevenue=${model.periods.launchCampaign.revenueCents}; liveCharge=not created`,
      pass:
        recorded.record.amountCents === 150000 &&
        ledger?.amountCents === 150000 &&
        ledger.stripeCheckoutSessionId === sessionId &&
        model.periods.launchCampaign.purchases === 1 &&
        model.periods.launchCampaign.revenueCents === 150000,
    });
  });

  await withTempKpiStore(async () => {
    const url = trackedRegisterUrl("R78-0828-LI");
    const attribution = parseAttributionFromSearch(new URL(url).searchParams);
    await recordLandingPageSession({
      attribution,
      path: "/register",
      visitorKey: "row84-attr-visitor",
      createdAt: "2026-08-28T14:00:00.000Z",
    });
    await recordCheckoutStart({
      attribution,
      stripeCheckoutSessionId: "cs_test_row84_attr",
      createdAt: "2026-08-28T14:05:00.000Z",
    });
    const purchased = await recordPurchase({
      attribution,
      stripeCheckoutSessionId: "cs_test_row84_attr",
      amountCents: 150000,
      test: true,
      createdAt: "2026-08-28T14:10:00.000Z",
    });
    const model = await buildLaunchKpiDashboard({ includeTest: true });
    const li = model.channels.find((row) => row.channel === "linkedin");
    const asset = model.assets.find((row) => row.assetId === "R78-0828-LI");
    record({
      id: "G",
      name: "Attribution persistence",
      expected:
        "Tracked social link → /register → checkout → purchase retains utm_source=linkedin, campaign=the-question, content=R78-0828-LI",
      actual: `source=${purchased.record.attribution.source}; campaign=${purchased.record.attribution.campaign}; content=${purchased.record.attribution.content}; liPurchases=${li?.purchases}; assetPurchases=${asset?.purchases}`,
      pass:
        purchased.record.attribution.source === "linkedin" &&
        purchased.record.attribution.campaign === CAMPAIGN_UTM &&
        purchased.record.attribution.content === "R78-0828-LI" &&
        (li?.purchases ?? 0) === 1 &&
        (asset?.purchases ?? 0) === 1 &&
        url.startsWith("https://thebackhalf.org/register"),
    });
  });

  await withTempKpiStore(async () => {
    const ig = parseAttributionFromSearch(
      new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
    );
    await recordPurchase({
      attribution: ig,
      stripeCheckoutSessionId: "cs_live_row84_historical_daily",
      amountCents: 150000,
      createdAt: "2026-08-10T20:00:00.000Z",
    });
    await recordLandingPageSession({
      attribution: ig,
      path: "/register",
      visitorKey: "row84-daily",
      createdAt: "2026-08-28T14:00:00.000Z",
    });
    const model = await buildLaunchKpiDashboard({ includeTest: false });
    const report = buildDailyLaunchReport(model, "2026-08-28");
    record({
      id: "H",
      name: "Daily report",
      expected:
        "August 28 daily launch purchases/revenue/conversion do not include historical purchases",
      actual: `dailyPurchases=${report.purchases}; historical=${model.periods.preLaunchHistorical.purchases}; launch=${model.periods.launchCampaign.purchases}; markdownExcludes=${report.markdown.includes(HISTORICAL_EXCLUSION_LABEL)}`,
      pass:
        report.purchases === "0" &&
        model.periods.launchCampaign.purchases === 0 &&
        model.periods.preLaunchHistorical.purchases === 1 &&
        report.markdown.includes(HISTORICAL_EXCLUSION_LABEL) &&
        !report.markdown.includes("19 launch"),
    });
  });

  const viewPath = "components/marketing-kpi/launch-kpi-dashboard-view.tsx";
  const viewSource = existsSync(viewPath) ? readFileSync(viewPath, "utf8") : "";
  record({
    id: "I",
    name: "Dashboard executive view",
    expected:
      "/ops/admin/launch-kpi distinguishes PRE-LAUNCH BASELINE / HISTORICAL from LAUNCH CAMPAIGN without inspecting underlying data",
    actual: `labels.historical=${productionModel.periods.preLaunchHistorical.label}; labels.launch=${productionModel.periods.launchCampaign.label}; viewHasHistorical=${viewSource.includes("PRE-LAUNCH BASELINE / HISTORICAL")}; viewHasLaunch=${viewSource.includes("LAUNCH CAMPAIGN")}`,
    pass:
      productionModel.periods.preLaunchHistorical.label === PERIOD_LABELS.pre_launch_historical &&
      productionModel.periods.launchCampaign.label === PERIOD_LABELS.launch_campaign &&
      viewSource.includes("PRE-LAUNCH BASELINE / HISTORICAL") &&
      viewSource.includes("LAUNCH CAMPAIGN") &&
      viewSource.includes("Launch Purchases:") &&
      viewSource.includes("HISTORICAL_EXCLUSION_LABEL"),
  });

  const regression = spawnSync(
    "npx --yes tsx scripts/fab-5/row-84-validate.ts",
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ROW84_VALIDATION_OUT:
          "ops/fab-5/runs/row-84-launch-marketing-kpi-validation-regression.json",
      },
      encoding: "utf8",
      shell: true,
    },
  );
  const originalEvidence = existsSync(
    "ops/fab-5/runs/row-84-launch-marketing-kpi-validation.json",
  );
  const archiveCopy = existsSync(
    "approved-assets/row-81-social-launch/ROW-81-FINAL-APPROVED-COPY.md",
  );
  const registerUnchanged = PUBLIC_DESTINATION_PATH === "/register";
  record({
    id: "J",
    name: "Regression",
    expected:
      "Original Row 84 mechanical tests still pass; Row 81 archive and /register unchanged; original evidence preserved",
    actual: `originalExit=${regression.status}; spawnError=${regression.error?.message ?? "none"}; originalEvidence=${originalEvidence}; archive=${archiveCopy}; register=${registerUnchanged}; stderr=${(regression.stderr || "").slice(0, 240)}`,
    pass:
      regression.status === 0 &&
      originalEvidence &&
      archiveCopy &&
      registerUnchanged,
  });

  const payload = {
    row: 84,
    runId: "r84-2026-08-19-persistence-historical-isolation",
    at: new Date().toISOString(),
    founderAcceptance: null,
    founderAccepted: false,
    rowMarkedComplete: false,
    dashboard: "/ops/admin/launch-kpi",
    protocol: "ops/fab-5/ROW-84-LAUNCH-MARKETING-KPI-DASHBOARD.md",
    originalEvidence: "ops/fab-5/runs/row-84-launch-marketing-kpi-validation.json",
    regressionEvidence:
      "ops/fab-5/runs/row-84-launch-marketing-kpi-validation-regression.json",
    tests,
    failures,
    result: failures.length === 0 ? "PASS" : "FAIL",
    readyForFounderAcceptanceReview: failures.length === 0,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-84-persistence-historical-isolation-validation.json",
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        result: payload.result,
        failures,
        passed: tests.filter((test) => test.result === "PASS").length,
        tests: tests.map((test) => ({
          id: test.id,
          result: test.result,
        })),
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
