import { NextResponse } from "next/server";

import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";
import { ingestCommandCenterSnapshot, loadCommandCenterSnapshot } from "@/lib/fab-5/aos/ingest";
import { runAosTick } from "@/lib/fab-5/aos/engine";
import { aosConfigured } from "@/lib/fab-5/aos/store";

export const runtime = "nodejs";
export const maxDuration = 120;

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
  if (!aosConfigured()) {
    return NextResponse.json({ ok: false, error: "aos_backend_unconfigured" }, { status: 503 });
  }
  const result = await runAosTick({ includeTest: false, engineeringRuntime: true });
  console.log(JSON.stringify({ aosTick: true, ...result }));
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  let ingest = false;
  let includeTest = false;
  try {
    const body = (await request.json()) as { ingest?: unknown; includeTest?: unknown };
    ingest = body.ingest === true;
    includeTest = body.includeTest === true;
  } catch {
    ingest = false;
  }
  if (ingest) {
    try {
      const snapshot = await loadCommandCenterSnapshot();
      const ingested = await ingestCommandCenterSnapshot(snapshot);
      const tick = await runAosTick({ includeTest, engineeringRuntime: true });
      return NextResponse.json({ ingest: ingested, tick });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ingest_failed";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }
  const result = await runAosTick({ includeTest, engineeringRuntime: true });
  console.log(JSON.stringify({ aosTick: true, ...result }));
  return NextResponse.json(result);
}
