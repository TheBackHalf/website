import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import { getLaunchDashboardStore } from "@/lib/launch-dashboard/store";
import {
  RISK_CATEGORIES,
  RISK_SEVERITY,
  RISK_STATUS,
  type RiskCategory,
  type RiskSeverity,
  type RiskStatus,
} from "@/lib/launch-dashboard/types";

export const runtime = "nodejs";

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

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

  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 280) : "";
  const mitigation =
    typeof body.mitigation === "string" ? body.mitigation.trim().slice(0, 280) : "";
  const owner = typeof body.owner === "string" ? body.owner.trim().slice(0, 80) : "";
  const category = asEnum(body.category, RISK_CATEGORIES);
  const severity = asEnum(body.severity, RISK_SEVERITY);
  const status = asEnum(body.status, RISK_STATUS) ?? "open";
  const dateIdentifiedEt =
    typeof body.dateIdentifiedEt === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.dateIdentifiedEt)
      ? body.dateIdentifiedEt
      : dateEt();

  if (!description || !mitigation || !owner || !category || !severity) {
    return NextResponse.json({ error: "invalid_risk" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id =
    typeof body.id === "string" && body.id.trim()
      ? body.id.trim().slice(0, 40)
      : `R151-${dateIdentifiedEt}-${crypto.randomUUID().slice(0, 8)}`;

  const record = await getLaunchDashboardStore().upsertRisk({
    id,
    dateIdentifiedEt,
    description,
    category: category as RiskCategory,
    severity: severity as RiskSeverity,
    owner,
    status: status as RiskStatus,
    mitigation,
    founderEscalationRequired: body.founderEscalationRequired === true,
    resolutionDateEt: status === "resolved" ? dateEt() : undefined,
    test: body.test === true,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ status: "saved", id: record.id });
}

export async function DELETE(request: Request) {
  try {
    await requirePermission("admin:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const removed = await getLaunchDashboardStore().deleteRisk(id);
  return NextResponse.json({ status: removed ? "deleted" : "missing" });
}
