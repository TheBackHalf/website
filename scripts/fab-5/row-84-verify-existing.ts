/**
 * Short Row 84 verification of the existing dashboard.
 * Does not rebuild the KPI system. Does not mark Complete.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

import {
  ACTIVE_LAUNCH_CHANNELS,
  CAMPAIGN_START_DATE_ET,
  LAUNCH_CHANNELS,
  isActiveLaunchChannel,
} from "@/lib/marketing-kpi/attribution";
import {
  buildLaunchKpiDashboard,
  formatCount,
} from "@/lib/marketing-kpi/aggregate";
import { loadBaseline } from "@/lib/marketing-kpi/baseline";
import { KPI_DICTIONARY } from "@/lib/marketing-kpi/dictionary";
import { CAMPAIGN_START_UTC, reportingPeriodAt } from "@/lib/marketing-kpi/period";
import { buildDailyLaunchReport } from "@/lib/marketing-kpi/report";
import { getMarketingKpiDurability } from "@/lib/marketing-kpi/store";

type Verdict = "PASS" | "FAIL";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

async function httpStatus(url: string): Promise<number | string> {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status;
  } catch (error) {
    return error instanceof Error ? error.message : "fetch_failed";
  }
}

async function main() {
  const tests: Array<{ id: string; name: string; result: Verdict; detail: string }> = [];

  const model = await buildLaunchKpiDashboard({ includeTest: false });
  const baseline = await loadBaseline();
  const durability = getMarketingKpiDurability();
  const justBefore = reportingPeriodAt("2026-08-28T03:59:59.000Z");
  const atBoundary = reportingPeriodAt(CAMPAIGN_START_UTC.toISOString());
  const linkedinMissing = model.issues.some(
    (issue) =>
      issue.code === "missing_daily_social" && /linkedin/i.test(issue.message),
  );
  const instagramChannel = model.channels.find((row) => row.channel === "instagram");
  const tiktokChannel = model.channels.find((row) => row.channel === "tiktok");
  const linkedinChannel = model.channels.find((row) => row.channel === "linkedin");
  const daily = buildDailyLaunchReport(model, CAMPAIGN_START_DATE_ET);
  const checkoutWired =
    readFileSync("lib/checkout/create-session.ts", "utf8").includes(
      "recordCheckoutStart",
    ) &&
    readFileSync("lib/billing/sync-effects.ts", "utf8").includes("recordPurchase") &&
    readFileSync("app/api/marketing/session/route.ts", "utf8").includes(
      "recordLandingPageSession",
    );
  const row151Wired =
    readFileSync("lib/launch-dashboard/sources.ts", "utf8").includes(
      "buildLaunchKpiDashboard",
    ) &&
    readFileSync("lib/launch-dashboard/aggregate.ts", "utf8").includes(
      "row84Launch",
    );
  const dashboardStatus = await httpStatus("http://localhost:3000/ops/admin/launch-kpi");
  const dashboardLoads =
    dashboardStatus === 200 ||
    dashboardStatus === 302 ||
    dashboardStatus === 303 ||
    dashboardStatus === 307 ||
    dashboardStatus === 308;

  tests.push({
    id: "D1",
    name: "Dashboard route exists",
    result: mark(
      existsSync("app/ops/admin/launch-kpi/page.tsx") && dashboardLoads,
    ),
    detail: `localhost /ops/admin/launch-kpi status=${String(dashboardStatus)}`,
  });
  const postgresStorePresent = readFileSync("lib/marketing-kpi/store.ts", "utf8").includes(
    "createPostgresMarketingKpiStore",
  );
  const hostedDisablesFile = readFileSync("lib/marketing-kpi/store.ts", "utf8").includes(
    "unconfigured_production",
  );
  const schemaPresent =
    readFileSync("lib/marketing-kpi/db.ts", "utf8").includes("marketing_kpi_events") &&
    readFileSync("lib/marketing-kpi/db.ts", "utf8").includes("marketing_kpi_purchases") &&
    readFileSync("lib/marketing-kpi/db.ts", "utf8").includes("marketing_kpi_social_daily");
  const localPostgresConfigured = durability.backend === "supabase_postgres";

  tests.push({
    id: "D2",
    name: "Production persistence backend",
    result: mark(
      postgresStorePresent &&
        hostedDisablesFile &&
        schemaPresent &&
        durability.dataDirIsSourceOfTruth === false,
    ),
    detail: `cliBackend=${durability.backend}; localPostgresConfigured=${String(localPostgresConfigured)}; hostedDisablesFile=${String(hostedDisablesFile)}; dataDirIsSourceOfTruth=${durability.dataDirIsSourceOfTruth}`,
  });
  tests.push({
    id: "M1",
    name: "Reach / impressions / engagement / follower growth / link clicks",
    result: mark(
      KPI_DICTIONARY.some((kpi) => kpi.id === "reach") &&
        KPI_DICTIONARY.some((kpi) => kpi.id === "impressions") &&
        KPI_DICTIONARY.some((kpi) => kpi.id === "engagements") &&
        KPI_DICTIONARY.some((kpi) => kpi.id === "follower_growth") &&
        KPI_DICTIONARY.some((kpi) => kpi.id === "link_clicks") &&
        formatCount(model.totals.reach).includes("N/A") &&
        formatCount(model.totals.impressions).includes("N/A"),
    ),
    detail: `reach=${formatCount(model.totals.reach)}; impressions=${formatCount(model.totals.impressions)}; engagements=${formatCount(model.totals.engagements)}; followerGrowth=${formatCount(model.totals.followerGrowth)}; linkClicks=${formatCount(model.totals.linkClicks)}`,
  });
  tests.push({
    id: "M2",
    name: "First-party funnel metrics",
    result: mark(
      typeof model.totals.landingPageSessions === "number" &&
        typeof model.totals.checkoutStarts === "number" &&
        typeof model.totals.purchases === "number" &&
        model.emailSignups.status.includes("N/A") &&
        model.totals.rates.overallLaunchConversionDenominator ===
          "landing_page_sessions",
    ),
    detail: `sessions=${model.totals.landingPageSessions}; checkoutStarts=${model.totals.checkoutStarts}; purchases=${model.totals.purchases}; email=${model.emailSignups.status}; conversion=${String(model.totals.rates.purchaseConversion)}`,
  });
  tests.push({
    id: "C1",
    name: "Active launch channels",
    result: mark(
      ACTIVE_LAUNCH_CHANNELS.join(",") === "instagram,tiktok" &&
        Boolean(instagramChannel) &&
        Boolean(tiktokChannel) &&
        model.linkedinRequiredForLaunch === false &&
        !linkedinMissing &&
        LAUNCH_CHANNELS.includes("linkedin") &&
        Boolean(linkedinChannel) &&
        !isActiveLaunchChannel("linkedin"),
    ),
    detail: `active=${model.activeLaunchChannels.join(",")}; linkedinRequired=${String(model.linkedinRequiredForLaunch)}; linkedinMissingFlag=${String(linkedinMissing)}`,
  });
  tests.push({
    id: "R1",
    name: "Baseline and daily reporting",
    result: mark(
      baseline.baselineDate === "2026-08-19" &&
        (baseline.purchases.value ?? 0) === 19 &&
        model.days.length > 0 &&
        model.days[0]?.dateEt === "2026-08-28" &&
        daily.dateEt === "2026-08-28" &&
        daily.markdown.includes("Executive summary"),
    ),
    detail: `baselineDate=${baseline.baselineDate}; historicalPurchases=${String(baseline.purchases.value)}; days=${model.days.map((day) => day.dateEt).join(",")}`,
  });
  tests.push({
    id: "B1",
    name: "Launch boundary and historical exclusion",
    result: mark(
      CAMPAIGN_START_DATE_ET === "2026-08-28" &&
        model.reportingBoundary.campaignStartEt === "2026-08-28 12:00 AM ET" &&
        CAMPAIGN_START_UTC.toISOString() === "2026-08-28T04:00:00.000Z" &&
        justBefore === "pre_launch_historical" &&
        atBoundary === "launch_campaign" &&
        model.periods.preLaunchHistorical.excludedFromLaunchKpi === true &&
        model.periods.launchCampaign.excludedFromLaunchKpi === false &&
        model.periods.preLaunchHistorical.purchases === 19 &&
        model.periods.launchCampaign.purchases === 0 &&
        model.periods.launchCampaign.revenueCents === 0,
    ),
    detail: `startEt=${model.reportingBoundary.campaignStartEt}; startUtc=${CAMPAIGN_START_UTC.toISOString()}; historical=${model.periods.preLaunchHistorical.purchases}; launchPurchases=${model.periods.launchCampaign.purchases}; launchRevenueCents=${model.periods.launchCampaign.revenueCents}`,
  });
  tests.push({
    id: "I1",
    name: "Row 150 / Row 151 wiring intact",
    result: mark(checkoutWired && row151Wired),
    detail: `row150Collect=${String(checkoutWired)}; row151Sources=${String(row151Wired)}`,
  });

  const failures = tests.filter((test) => test.result === "FAIL");
  const payload = {
    row: 84,
    runId: "r84-verify-existing-2026-08-21",
    at: new Date().toISOString(),
    mode: "verification-pass-only",
    rebuilt: false,
    founderAcceptance: "PENDING",
    markedComplete: false,
    dashboard: "/ops/admin/launch-kpi",
    tests,
    failures: failures.map((test) => `${test.id} ${test.name}: ${test.detail}`),
    result: failures.length === 0 ? "PASS" : "FAIL",
    readyForFounderAcceptanceReview: failures.length === 0,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-84-launch-marketing-kpi-verification-2026-08-21.json",
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        result: payload.result,
        failures: payload.failures,
        passed: tests.filter((test) => test.result === "PASS").length,
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
