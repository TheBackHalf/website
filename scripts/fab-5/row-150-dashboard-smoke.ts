/**
 * Row 84 / Row 151 production-config smoke. Prints counts only — no secrets, PII, or payloads.
 */
import { getAnalyticsDurability, resetAnalyticsStoreForTests } from "@/lib/analytics/store";
import { buildLaunchDashboardFromSources } from "@/lib/launch-dashboard/aggregate";
import { gatherLaunchDashboardSources } from "@/lib/launch-dashboard/sources";
import { getLaunchDashboardDurability, resetLaunchDashboardStoreForTests } from "@/lib/launch-dashboard/store";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";
import { loadPostgresEnvFromLocalFile } from "@/lib/marketing-kpi/db";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import {
  getMarketingKpiDurability,
  resetMarketingKpiStoreForTests,
} from "@/lib/marketing-kpi/store";

async function main() {
  loadPostgresEnvFromLocalFile();
  delete process.env.ANALYTICS_DB_FILE;
  delete process.env.MARKETING_KPI_DB_FILE;
  resetAnalyticsStoreForTests();
  resetMarketingKpiStoreForTests();
  resetLaunchDashboardStoreForTests();

  const kpi = await buildLaunchKpiDashboard({ includeTest: false });
  const sources = await gatherLaunchDashboardSources({ includeTest: false });
  const launch = buildLaunchDashboardFromSources(sources, {
    dateEt: dateEt(),
    includeTest: false,
  });

  console.log(
    JSON.stringify(
      {
        analyticsBackend: getAnalyticsDurability().backend,
        marketingBackend: getMarketingKpiDurability().backend,
        launchDashboardBackend: getLaunchDashboardDurability().backend,
        row84: {
          built: true,
          landingPageSessions: kpi.totals.landingPageSessions,
          checkoutStarts: kpi.totals.checkoutStarts,
          purchases: kpi.totals.purchases,
          channels: kpi.channels.length,
          days: kpi.days.length,
        },
        row151: {
          built: true,
          health: launch.health,
          websiteSessionsToday: launch.traffic.websiteSessions.today,
          registrationCompleted: launch.conversion.registrationCompleted,
          purchases: launch.conversion.purchases,
          errorRows: launch.errors.length,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    message
      .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
      .replace(/eyJ[A-Za-z0-9_-]{20,}/g, "[redacted]"),
  );
  process.exit(1);
});
