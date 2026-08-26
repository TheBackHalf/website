import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { getLaunchDashboardStore } from "@/lib/launch-dashboard/store";
import {
  AVAILABILITY_AREAS,
  AVAILABILITY_STATUSES,
  type AvailabilityArea,
  type AvailabilityStatus,
} from "@/lib/launch-dashboard/types";

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

  const area =
    typeof body.area === "string" &&
    (AVAILABILITY_AREAS as readonly string[]).includes(body.area)
      ? (body.area as AvailabilityArea)
      : null;
  const status =
    typeof body.status === "string" &&
    (AVAILABILITY_STATUSES as readonly string[]).includes(body.status)
      ? (body.status as AvailabilityStatus)
      : null;
  if (!area || !status) {
    return NextResponse.json({ error: "invalid_availability" }, { status: 400 });
  }

  const record = await getLaunchDashboardStore().upsertAvailability({
    area,
    status,
    note:
      typeof body.note === "string" ? body.note.trim().slice(0, 200) : undefined,
    updatedAt: new Date().toISOString(),
    updatedBy:
      typeof body.updatedBy === "string"
        ? body.updatedBy.trim().slice(0, 40)
        : "admin",
    source: "manual",
  });

  return NextResponse.json({ status: "saved", area: record.area });
}
