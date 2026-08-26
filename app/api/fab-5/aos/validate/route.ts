import { NextResponse } from "next/server";

import { cursorCloudConfigured } from "@/lib/fab-5/aos/cursor-cloud";
import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";
import { ingestCommandCenterSnapshot, loadCommandCenterSnapshot } from "@/lib/fab-5/aos/ingest";
import { runAosTick } from "@/lib/fab-5/aos/engine";
import { aosConfigured } from "@/lib/fab-5/aos/store";
import { runAosValidation } from "@/lib/fab-5/aos/validate";
import { smsConfigured } from "@/lib/fab-5/aos/notify";
import { isSmtpReady } from "@/lib/auth/email/smtp";

export const runtime = "nodejs";
export const maxDuration = 300;

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

function flags() {
  return NextResponse.json({
    ok: aosConfigured(),
    hosted: process.env.VERCEL === "1",
    smtpReady: isSmtpReady(),
    smsConfigured: smsConfigured(),
    postgresUrlPresent: Boolean(process.env.POSTGRES_URL?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim()),
    cursorCloudConfigured: cursorCloudConfigured(),
  });
}

async function runGate(ingest: boolean) {
  const validation = await runAosValidation();
  const coreIds = ["A", "B", "C", "D", "E", "F", "G", "I", "J", "K", "M", "N", "O", "P"] as const;
  const corePass =
    validation.configured &&
    coreIds.every((id) => validation.tests.some((test) => test.id === id && test.pass));

  const summary = {
    aosGate: true,
    corePass,
    hosted: process.env.VERCEL === "1",
    smtpReady: isSmtpReady(),
    smsConfigured: smsConfigured(),
    cursorCloudConfigured: cursorCloudConfigured(),
    passed: validation.passed,
    failed: validation.failed,
    tests: validation.tests.map((test) => ({ id: test.id, pass: test.pass, note: test.note })),
  };

  let ingested: Record<string, unknown> | null = null;
  let tick: unknown = null;
  if (ingest) {
    if (!corePass) {
      console.log(JSON.stringify({ ...summary, ingest: "blocked" }));
      return NextResponse.json(
        {
          ok: false,
          error: "ingest_blocked_until_core_gate_passes",
          hosted: process.env.VERCEL === "1",
          smtpReady: isSmtpReady(),
          smsConfigured: smsConfigured(),
          postgresUrlPresent: Boolean(
            process.env.POSTGRES_URL?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim(),
          ),
          corePass,
          validation,
        },
        { status: 409 },
      );
    }
    const snapshot = await loadCommandCenterSnapshot();
    const result = await ingestCommandCenterSnapshot(snapshot);
    tick = await runAosTick({ includeTest: false, engineeringRuntime: true, maxPerAgent: 2 });
    ingested = {
      ingested: result.ingested,
      skippedKim: result.skippedKim,
      skippedComplete: result.skippedComplete,
      skippedInvalid: result.skippedInvalid,
    };
  }

  console.log(JSON.stringify({ ...summary, ingest: ingested, tick }));
  return NextResponse.json({
    ok: corePass,
    hosted: process.env.VERCEL === "1",
    smtpReady: isSmtpReady(),
    smsConfigured: smsConfigured(),
    postgresUrlPresent: Boolean(process.env.POSTGRES_URL?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim()),
    cursorCloudConfigured: cursorCloudConfigured(),
    corePass,
    validation,
    ingest: ingested,
    tick,
  });
}

export async function GET(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  if (new URL(request.url).searchParams.get("flags") === "1") {
    return flags();
  }
  return runGate(true);
}

export async function POST(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);

  let ingest = false;
  try {
    const body = (await request.json()) as { ingest?: unknown };
    ingest = body.ingest === true;
  } catch {
    ingest = false;
  }
  return runGate(ingest);
}
