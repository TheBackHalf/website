import { NextResponse } from "next/server";

import {
  runAnalyticsDurability,
  type AnalyticsDurabilityAction,
} from "@/lib/analytics/durability-ops";
import { authorizeMichelleRequest } from "@/lib/fab-5/michelle-runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  const auth = authorizeMichelleRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);

  let action: AnalyticsDurabilityAction = "retrieve";
  let key = "";
  try {
    const body = (await request.json()) as { action?: unknown; key?: unknown };
    if (
      body.action === "write" ||
      body.action === "retrieve" ||
      body.action === "suite" ||
      body.action === "cleanup"
    ) {
      action = body.action;
    }
    if (typeof body.key === "string") key = body.key;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  return NextResponse.json(await runAnalyticsDurability({ action, key }));
}
