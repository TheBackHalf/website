import type { Metadata } from "next";
import { LaunchDashboardView } from "@/components/launch-dashboard/launch-dashboard-view";
import { buildLaunchDashboard } from "@/lib/launch-dashboard/sources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily Launch Dashboard — The Back Half",
  robots: { index: false, follow: false },
};

export default async function LaunchDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : undefined;
  const model = await buildLaunchDashboard({
    dateEt: date,
    includeTest: false,
    preferSnapshot: true,
  });
  return <LaunchDashboardView model={model} />;
}
