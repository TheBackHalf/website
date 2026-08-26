import type { Metadata } from "next";
import { LaunchKpiDashboardView } from "@/components/marketing-kpi/launch-kpi-dashboard-view";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launch Marketing KPI Dashboard — The Back Half",
  robots: { index: false, follow: false },
};

export default async function LaunchKpiDashboardPage() {
  const model = await buildLaunchKpiDashboard({ includeTest: false });
  return <LaunchKpiDashboardView model={model} />;
}
