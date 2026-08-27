import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { isPrivacyRequestStatus } from "@/lib/privacy/catalog";
import { closePrivacyRequest, fulfillPrivacyRequest } from "@/lib/privacy/fulfill";
import { buildPrivacyMetrics } from "@/lib/privacy/metrics";
import { getPrivacyStore } from "@/lib/privacy/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePermission("admin:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const requests = await getPrivacyStore().list({ includeTest: false });
  return NextResponse.json({
    requests,
    metrics: buildPrivacyMetrics(requests),
  });
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

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  if (body.action === "fulfill") {
    const result = await fulfillPrivacyRequest(id, {
      confirmDeletion: body.confirmDeletion === true,
    });
    return NextResponse.json({
      status: "saved",
      request: result.request,
      exportGenerated: Boolean(result.exportPackage),
    });
  }

  if (body.action === "status") {
    const status = typeof body.status === "string" ? body.status : "";
    if (status === "CLOSED") {
      const next = await closePrivacyRequest(id, typeof body.note === "string" ? body.note : undefined);
      return NextResponse.json({ status: "saved", request: next });
    }
    if (!isPrivacyRequestStatus(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    const store = getPrivacyStore();
    const existing = await store.get(id);
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const now = new Date().toISOString();
    const next = await store.upsert({
      ...existing,
      status,
      updatedAt: now,
      history: [
        ...existing.history,
        {
          at: now,
          actor: "imani",
          type: "status",
          note: status,
        },
      ],
    });
    return NextResponse.json({ status: "saved", request: next });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
