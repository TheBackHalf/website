import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import { getLaunchDashboardStore } from "@/lib/launch-dashboard/store";
import { normalizeSupportCategory } from "@/lib/launch-dashboard/aggregate";
import { SUPPORT_STATUS, type SupportStatus } from "@/lib/launch-dashboard/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requirePermission("admin:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const category = normalizeSupportCategory(
    typeof body.category === "string" ? body.category : "other",
  );
  const status = (
    typeof body.status === "string" &&
    (SUPPORT_STATUS as readonly string[]).includes(body.status)
      ? body.status
      : "open"
  ) as SupportStatus;
  const day =
    typeof body.dateEt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateEt)
      ? body.dateEt
      : dateEt();
  const now = new Date().toISOString();
  const id =
    typeof body.id === "string" && body.id.trim()
      ? body.id.trim()
      : crypto.randomUUID();

  const record = await getLaunchDashboardStore().upsertSupport({
    id,
    dateEt: day,
    category,
    status,
    source: "ops_manual",
    delivery: "recorded",
    createdAt: now,
    resolvedAt: status === "resolved" ? now : undefined,
    responseMinutes: status === "resolved" ? 0 : undefined,
    test: body.test === true,
  });

  return NextResponse.json({ status: "saved", id: record.id });
}
