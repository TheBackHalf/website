import { NextResponse } from "next/server";
import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";
import { runInactivityScan } from "@/lib/lifecycle/inactivity";
import { getLifecycleDurability } from "@/lib/lifecycle/store";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

async function handle() {
  const scan = await runInactivityScan();
  return NextResponse.json({
    ok: scan.failed === 0,
    trigger: "inactivity.journey_nudge",
    durability: getLifecycleDurability(),
    ...scan,
  });
}

export async function GET(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  return handle();
}

export async function POST(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  return handle();
}
