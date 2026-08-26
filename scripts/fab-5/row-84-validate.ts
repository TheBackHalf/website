/**
 * Mechanical Row 84 validation. Does not mark the row Complete.
 * Does not create a live Stripe charge.
 */

import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";

import {
  CAMPAIGN_UTM,
  PUBLIC_DESTINATION_HOST,
  PUBLIC_DESTINATION_PATH,
  parseAttributionFromSearch,
  trackedRegisterUrl,
} from "@/lib/marketing-kpi/attribution";
import {
  buildLaunchKpiDashboard,
  formatRate,
} from "@/lib/marketing-kpi/aggregate";
import { captureBaseline, loadBaseline } from "@/lib/marketing-kpi/baseline";
import {
  recordCheckoutStart,
  recordLandingPageSession,
  recordPurchase,
} from "@/lib/marketing-kpi/collect";
import { buildDailyLaunchReport } from "@/lib/marketing-kpi/report";
import {
  getMarketingKpiStore,
  resetMarketingKpiStoreForTests,
} from "@/lib/marketing-kpi/store";

type Verdict = "PASS" | "FAIL";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

async function main() {
  const failures: string[] = [];
  const tests: Array<{ id: string; name: string; result: Verdict; detail: string }> = [];

  const baseline = existsSync("ops/fab-5/marketing-kpi/baseline.json")
    ? await loadBaseline()
    : await captureBaseline();

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "row84-"));
  const tmpDb = path.join(tmpDir, "database.json");
  process.env.MARKETING_KPI_DB_FILE = tmpDb;
  resetMarketingKpiStoreForTests();

  const igUrl = trackedRegisterUrl("R78-0828-IG");
  const liUrl = trackedRegisterUrl("R78-0828-LI");
  const ttUrl = trackedRegisterUrl("R81-0831-TT");
  const parsedIg = parseAttributionFromSearch(new URL(igUrl).searchParams);

  tests.push({
    id: "T1",
    name: "Social attribution",
    result: mark(
      parsedIg.source === "instagram" &&
        parsedIg.campaign === CAMPAIGN_UTM &&
        parsedIg.content === "R78-0828-IG" &&
        igUrl.startsWith(PUBLIC_DESTINATION_HOST),
    ),
    detail: igUrl,
  });

  await recordLandingPageSession({
    attribution: parsedIg,
    path: "/register",
    visitorKey: "test-ig",
    test: true,
    createdAt: "2026-08-28T14:00:00.000Z",
  });

  const afterLanding = await buildLaunchKpiDashboard({ includeTest: true });
  tests.push({
    id: "T2",
    name: "Landing-page session",
    result: mark(afterLanding.totals.landingPageSessions === 1),
    detail: `sessions=${afterLanding.totals.landingPageSessions}`,
  });

  await recordCheckoutStart({
    attribution: parsedIg,
    stripeCheckoutSessionId: "cs_test_row84",
    test: true,
    createdAt: "2026-08-28T14:05:00.000Z",
  });
  const afterCheckout = await buildLaunchKpiDashboard({ includeTest: true });
  tests.push({
    id: "T3",
    name: "Checkout start",
    result: mark(afterCheckout.totals.checkoutStarts === 1),
    detail: `starts=${afterCheckout.totals.checkoutStarts}`,
  });

  await recordPurchase({
    attribution: parsedIg,
    stripeCheckoutSessionId: "cs_test_row84",
    test: true,
    createdAt: "2026-08-28T14:10:00.000Z",
  });
  const afterPurchase = await buildLaunchKpiDashboard({ includeTest: true });
  tests.push({
    id: "T4",
    name: "Purchase (sandbox ledger, no live charge)",
    result: mark(afterPurchase.totals.purchases === 1),
    detail: `purchases=${afterPurchase.totals.purchases}; live charge=not created`,
  });

  await recordLandingPageSession({
    attribution: parseAttributionFromSearch(new URL(liUrl).searchParams),
    path: "/register",
    visitorKey: "test-li",
    test: true,
    createdAt: "2026-08-28T15:00:00.000Z",
  });
  await recordLandingPageSession({
    attribution: parseAttributionFromSearch(new URL(ttUrl).searchParams),
    path: "/register",
    visitorKey: "test-tt",
    test: true,
    createdAt: "2026-08-31T15:00:00.000Z",
  });
  const channels = await buildLaunchKpiDashboard({ includeTest: true });
  const ig = channels.channels.find((row) => row.channel === "instagram");
  const li = channels.channels.find((row) => row.channel === "linkedin");
  const tt = channels.channels.find((row) => row.channel === "tiktok");
  tests.push({
    id: "T5",
    name: "Channel differentiation",
    result: mark(
      (ig?.landingPageSessions ?? 0) >= 1 &&
        (li?.landingPageSessions ?? 0) >= 1 &&
        (tt?.landingPageSessions ?? 0) >= 1,
    ),
    detail: `ig=${ig?.landingPageSessions} li=${li?.landingPageSessions} tt=${tt?.landingPageSessions}`,
  });

  const asset0828 = channels.assets.find((row) => row.assetId === "R78-0828-IG");
  const asset0831 = channels.assets.find((row) => row.assetId === "R81-0831-TT");
  tests.push({
    id: "T6",
    name: "Asset differentiation",
    result: mark(
      (asset0828?.landingPageSessions ?? 0) >= 1 &&
        (asset0831?.landingPageSessions ?? 0) >= 1 &&
        asset0828?.assetId !== asset0831?.assetId,
    ),
    detail: `R78-0828-IG sessions=${asset0828?.landingPageSessions}; R81-0831-TT sessions=${asset0831?.landingPageSessions}`,
  });

  const baselineAgain = await loadBaseline();
  tests.push({
    id: "T7",
    name: "Baseline remains after daily data",
    result: mark(
      baselineAgain.baselineDate === baseline.baselineDate &&
        baselineAgain.purchases.value === baseline.purchases.value &&
        channels.totals.landingPageSessions > (baseline.registrationPageTraffic.value ?? 0),
    ),
    detail: `baselineDate=${baselineAgain.baselineDate}; purchases=${baselineAgain.purchases.value}`,
  });

  const report = buildDailyLaunchReport(channels, "2026-08-28");
  await mkdir("ops/fab-5/marketing-kpi/daily-reports", { recursive: true });
  await writeFile(
    "ops/fab-5/marketing-kpi/daily-reports/TEST-2026-08-28.md",
    report.markdown,
    "utf8",
  );
  tests.push({
    id: "T8",
    name: "Daily reporting",
    result: mark(
      report.dateEt === "2026-08-28" &&
        report.markdown.includes("Executive summary") &&
        report.markdown.includes("Purchase conversion"),
    ),
    detail: `purchases line present; action=${report.actionOrEscalation}`,
  });

  const expectedConversion = 1 / (ig?.landingPageSessions ?? 1);
  tests.push({
    id: "T9",
    name: "Funnel math",
    result: mark(
      ig !== undefined &&
        ig.rates.purchaseConversion !== null &&
        Math.abs((ig.rates.purchaseConversion ?? -1) - expectedConversion) < 0.0001 &&
        formatRate(ig.rates.purchaseConversion).includes("%") &&
        ig.rates.overallLaunchConversionDenominator === "landing_page_sessions",
    ),
    detail: `instagram purchase conversion=${ig?.rates.purchaseConversion}`,
  });

  await getMarketingKpiStore().upsertSocialDaily({
    dateEt: "2026-08-28",
    channel: "instagram",
    reach: -3,
    impressions: 10,
    engagements: 2,
    followers: 0,
    followerGrowth: 0,
    linkClicks: 1,
    enteredBy: "test",
    sourceSystem: "native-instagram",
  });
  const dirty = await buildLaunchKpiDashboard({ includeTest: true });
  const negativeFlag = dirty.issues.some((issue) => issue.code === "negative_count");
  tests.push({
    id: "T10",
    name: "Data-quality controls",
    result: mark(negativeFlag),
    detail: negativeFlag
      ? "negative reach flagged; dashboard did not silently accept it"
      : "negative reach was not flagged",
  });

  const archiveCopy = existsSync(
    "approved-assets/row-81-social-launch/ROW-81-FINAL-APPROVED-COPY.md",
  );
  const archiveManifest = existsSync(
    "approved-assets/row-81-social-launch/ROW-81-ASSET-MANIFEST.md",
  );
  const registerPathUnchanged = PUBLIC_DESTINATION_PATH === "/register";
  tests.push({
    id: "R1",
    name: "Regression — Row 81 archive and /register destination",
    result: mark(archiveCopy && archiveManifest && registerPathUnchanged),
    detail: "Archive files present; public destination remains /register",
  });

  for (const test of tests) {
    if (test.result === "FAIL") failures.push(`${test.id} ${test.name}: ${test.detail}`);
  }

  const payload = {
    row: 84,
    runId: "r84-2026-08-19-kpi-dashboard-validation",
    at: new Date().toISOString(),
    founderAcceptance: null,
    founderAccepted: false,
    rowMarkedComplete: false,
    row85Started: false,
    dashboard: "/ops/admin/launch-kpi",
    protocol: "ops/fab-5/ROW-84-LAUNCH-MARKETING-KPI-DASHBOARD.md",
    baseline: "ops/fab-5/marketing-kpi/baseline.json",
    tests,
    failures,
    result: failures.length === 0 ? "PASS" : "FAIL",
    readyForFounderAcceptanceReview: failures.length === 0,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  const evidencePath =
    process.env.ROW84_VALIDATION_OUT ??
    "ops/fab-5/runs/row-84-launch-marketing-kpi-validation.json";
  await writeFile(
    evidencePath,
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );

  await rm(tmpDir, { recursive: true, force: true });
  console.log(JSON.stringify({ result: payload.result, failures, passed: tests.filter((t) => t.result === "PASS").length }, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
