import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";
import { buildDailyLaunchReport } from "@/lib/marketing-kpi/report";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePermission("admin:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const dateEt = url.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateEt)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const model = await buildLaunchKpiDashboard({
    includeTest: url.searchParams.get("test") === "1",
  });
  const report = buildDailyLaunchReport(model, dateEt);
  return NextResponse.json(report);
}
