import { aosConfigured, listOpenDecisions } from "@/lib/fab-5/aos/store";
import { composeExecutiveDashboard } from "@/lib/executive-dashboard/compose";
import type { ExecutiveDashboardModel } from "@/lib/executive-dashboard/types";
import { buildLaunchDashboard } from "@/lib/launch-dashboard/sources";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";
import { loadMonitoringSnapshot } from "@/lib/monitoring/snapshot";

/**
 * Compose the Launch-Day Executive Dashboard from existing systems.
 * Read-only. Does not run production probes, write billing, or change auth.
 */
export async function buildExecutiveDashboard(options?: {
  dateEt?: string;
  includeTest?: boolean;
}): Promise<ExecutiveDashboardModel> {
  const includeTest = Boolean(options?.includeTest);
  const [launch, marketing, monitoring, founderDecisions] = await Promise.all([
    buildLaunchDashboard({
      dateEt: options?.dateEt,
      includeTest,
      preferSnapshot: true,
    }),
    buildLaunchKpiDashboard({ includeTest }),
    loadMonitoringSnapshot().catch(() => null),
    listOpenDecisions(includeTest).catch(() => []),
  ]);
  return composeExecutiveDashboard({
    launch,
    marketing,
    monitoring,
    founderDecisions,
    aosBackend: aosConfigured() ? "supabase_postgres" : "none",
  });
}
