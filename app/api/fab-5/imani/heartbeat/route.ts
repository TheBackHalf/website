import { NextResponse } from "next/server";

import {
  authorizeHeartbeatRequest,
  runImaniHeartbeat,
  type HeartbeatTrigger,
} from "@/lib/fab-5/heartbeat";

export const runtime = "nodejs";
export const maxDuration = 120;

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

async function handle(request: Request, trigger: HeartbeatTrigger, task?: string) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  const result = await runImaniHeartbeat({ trigger, task });
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return handle(request, "schedule");
}

export async function POST(request: Request) {
  let trigger: HeartbeatTrigger = "queue";
  let task: string | undefined;
  try {
    const body = (await request.json()) as { trigger?: unknown; task?: unknown };
    if (body.trigger === "event" || body.trigger === "queue" || body.trigger === "retry") {
      trigger = body.trigger;
    }
    if (typeof body.task === "string") task = body.task;
  } catch {
    trigger = "queue";
  }
  return handle(request, trigger, task);
}
