import { NextResponse } from "next/server";

import {
  authorizeMichelleRequest,
  runMichelleCycle,
  runMichelleDurability,
  type DurabilityAction,
  type MichelleTrigger,
} from "@/lib/fab-5/michelle-runtime";

export const runtime = "nodejs";
export const maxDuration = 120;

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

export async function GET(request: Request) {
  const auth = authorizeMichelleRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  const result = await runMichelleCycle({ trigger: "schedule" });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = authorizeMichelleRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  let trigger: MichelleTrigger = "queue";
  let task: string | undefined;
  let founderUnavailable = false;
  let acceptancePack = false;
  let idempotencyKey: string | undefined;
  let durability: { action: DurabilityAction; key: string } | undefined;
  let skipLiveModel = false;
  try {
    const body = (await request.json()) as {
      trigger?: unknown;
      task?: unknown;
      founderUnavailable?: unknown;
      acceptancePack?: unknown;
      idempotencyKey?: unknown;
      durability?: unknown;
      skipLiveModel?: unknown;
    };
    if (body.trigger === "event" || body.trigger === "queue" || body.trigger === "retry" || body.trigger === "schedule") {
      trigger = body.trigger;
    }
    if (typeof body.task === "string") task = body.task;
    founderUnavailable = body.founderUnavailable === true;
    acceptancePack = body.acceptancePack === true;
    skipLiveModel = body.skipLiveModel === true;
    if (typeof body.idempotencyKey === "string") idempotencyKey = body.idempotencyKey;
    if (body.durability && typeof body.durability === "object") {
      const raw = body.durability as { action?: unknown; key?: unknown };
      if (
        (raw.action === "write" || raw.action === "retrieve" || raw.action === "retry" || raw.action === "resolve") &&
        typeof raw.key === "string"
      ) {
        durability = { action: raw.action, key: raw.key };
      }
    }
  } catch {
    trigger = "queue";
  }
  if (durability) {
    return NextResponse.json(await runMichelleDurability(durability));
  }
  const result = await runMichelleCycle({
    trigger,
    task,
    founderUnavailable,
    acceptancePack,
    idempotencyKey,
    skipLiveModel,
  });
  return NextResponse.json(result);
}
