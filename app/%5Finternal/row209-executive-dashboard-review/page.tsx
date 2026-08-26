import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ExecutiveDashboardView } from "@/components/executive-dashboard/executive-dashboard-view";
import { buildExecutiveDashboard } from "@/lib/executive-dashboard/sources";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 209 Founder acceptance review only.
 * URL: /_internal/row209-executive-dashboard-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 209 complete.
 */
function assertLocalhostOnly(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return;
  }
  notFound();
}

export default async function Row209ExecutiveDashboardReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const params = await searchParams;
  const date =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : undefined;
  const model = await buildExecutiveDashboard({
    dateEt: date,
    includeTest: false,
  });

  return (
    <div
      className="min-h-screen bg-bh-cream"
      data-bh-temp-qa="row209-executive-dashboard-review"
    >
      <ExecutiveDashboardView
        model={model}
        reviewBanner="TEMPORARY LOCAL QA — ROW 209 CREATE LAUNCH-DAY EXECUTIVE DASHBOARD. Not Founder-accepted. Not complete."
      />
    </div>
  );
}
