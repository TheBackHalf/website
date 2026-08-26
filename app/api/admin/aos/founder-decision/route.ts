import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/access";
import { resolveFounderDecision } from "@/lib/fab-5/aos/store";
import { runAosTick } from "@/lib/fab-5/aos/engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requirePermission("admin:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: {
    decisionId?: unknown;
    status?: unknown;
    comment?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const decisionId = typeof body.decisionId === "string" ? body.decisionId : "";
  const status =
    body.status === "APPROVED" || body.status === "REJECTED" || body.status === "REVIEW"
      ? body.status
      : null;
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (!decisionId || !status) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const decision = await resolveFounderDecision({
    decisionId,
    status,
    founderResponse: comment || status,
  });
  if (!decision) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (status === "APPROVED") {
    await runAosTick({ includeTest: decision.controlledTest, maxPerAgent: 1 });
  }
  return NextResponse.json({ ok: true, decision });
}
