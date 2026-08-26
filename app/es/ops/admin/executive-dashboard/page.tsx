import type { Metadata } from "next";
import { ExecutiveDashboardView } from "@/components/executive-dashboard/executive-dashboard-view";
import { buildExecutiveDashboard } from "@/lib/executive-dashboard/sources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel ejecutivo del día de lanzamiento — The Back Half",
  robots: { index: false, follow: false },
};

export default async function ExecutiveDashboardPageEs({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : undefined;
  const model = await buildExecutiveDashboard({
    dateEt: date,
    includeTest: false,
  });
  return <ExecutiveDashboardView model={model} />;
}
