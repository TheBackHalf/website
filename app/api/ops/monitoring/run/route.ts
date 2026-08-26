import { NextResponse } from "next/server";
import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";
import { runProductionMonitoring } from "@/lib/monitoring/run";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const snapshot = await runProductionMonitoring({ includeControlledError: false });
  return NextResponse.json({
    ok:
      snapshot.uptime.status !== "FAIL" &&
      snapshot.database.status === "PASS" &&
      snapshot.payments.status === "PASS",
    generatedAt: snapshot.generatedAt,
    applicationOrigin: snapshot.applicationOrigin,
    canonicalDns: snapshot.canonicalDns,
    uptime: snapshot.uptime.status,
    errors: snapshot.errors.status,
    database: snapshot.database.status,
    payments: snapshot.payments.status,
    founderAttention: snapshot.operations.founderAttention,
    alertCount: snapshot.alerts.length,
  });
}
