import { NextResponse } from "next/server";
import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";
import { runHostedBackupProbe } from "@/lib/backup/hosted-probe";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

export async function GET(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  const result = await runHostedBackupProbe();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
