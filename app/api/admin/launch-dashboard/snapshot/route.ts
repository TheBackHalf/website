import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import { buildLaunchDashboard } from "@/lib/launch-dashboard/sources";
import { getLaunchDashboardStore } from "@/lib/launch-dashboard/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requirePermission("admin:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const day =
    typeof body.dateEt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateEt)
      ? body.dateEt
      : dateEt();
  const model = await buildLaunchDashboard({
    dateEt: day,
    includeTest: body.includeTest === true,
    preferSnapshot: false,
  });
  const saved = await getLaunchDashboardStore().saveSnapshot({
    dateEt: day,
    frozen: day < dateEt(),
    capturedAt: new Date().toISOString(),
    model,
  });
  return NextResponse.json({
    status: saved.status,
    dateEt: saved.record.dateEt,
    frozen: saved.record.frozen,
  });
}
