import { NextResponse } from "next/server";

import {
  authorizeNiaRequest,
  runNiaCycle,
  runNiaDurability,
  runNiaResearchAction,
  type NiaDurabilityAction,
  type NiaTrigger,
} from "@/lib/fab-5/nia-runtime";

export const runtime = "nodejs";
export const maxDuration = 120;

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

export async function GET(request: Request) {
  const auth = authorizeNiaRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  const result = await runNiaCycle({ trigger: "schedule" });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = authorizeNiaRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  let trigger: NiaTrigger = "queue";
  let task: string | undefined;
  let founderUnavailable = false;
  let acceptancePack = false;
  let threeAgent = false;
  let skipLiveModel = false;
  let idempotencyKey: string | undefined;
  let durability: { action: NiaDurabilityAction; key: string } | undefined;
  let research: Parameters<typeof runNiaResearchAction>[0] | undefined;
  try {
    const body = (await request.json()) as {
      trigger?: unknown;
      task?: unknown;
      founderUnavailable?: unknown;
      acceptancePack?: unknown;
      threeAgent?: unknown;
      skipLiveModel?: unknown;
      idempotencyKey?: unknown;
      durability?: unknown;
      research?: unknown;
      researchPack?: unknown;
    };
    if (body.trigger === "event" || body.trigger === "queue" || body.trigger === "retry" || body.trigger === "schedule") {
      trigger = body.trigger;
    }
    if (typeof body.task === "string") task = body.task;
    founderUnavailable = body.founderUnavailable === true;
    acceptancePack = body.acceptancePack === true;
    threeAgent = body.threeAgent === true;
    skipLiveModel = body.skipLiveModel === true;
    if (typeof body.idempotencyKey === "string") idempotencyKey = body.idempotencyKey;
    if (body.researchPack === true) {
      research = { action: "pack" };
    }
    if (body.research && typeof body.research === "object") {
      const raw = body.research as {
        action?: unknown;
        topic?: unknown;
        question?: unknown;
        whyNeeded?: unknown;
        origin?: unknown;
        requestingExecutive?: unknown;
        idempotencyKey?: unknown;
        key?: unknown;
        maxSearches?: unknown;
      };
      if (raw.action === "run" || raw.action === "retrieve" || raw.action === "pack" || raw.action === "weekly") {
        research = {
          action: raw.action,
          topic: typeof raw.topic === "string" ? raw.topic : undefined,
          question: typeof raw.question === "string" ? raw.question : undefined,
          whyNeeded: typeof raw.whyNeeded === "string" ? raw.whyNeeded : undefined,
          origin: typeof raw.origin === "string" ? raw.origin : undefined,
          requestingExecutive:
            raw.requestingExecutive === "michelle" ||
            raw.requestingExecutive === "imani" ||
            raw.requestingExecutive === "kimberly" ||
            raw.requestingExecutive === "nia"
              ? raw.requestingExecutive
              : undefined,
          idempotencyKey: typeof raw.idempotencyKey === "string" ? raw.idempotencyKey : undefined,
          key: typeof raw.key === "string" ? raw.key : undefined,
          maxSearches: typeof raw.maxSearches === "number" ? raw.maxSearches : undefined,
        };
      }
    }
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
    return NextResponse.json(await runNiaDurability(durability));
  }
  if (research) {
    return NextResponse.json(await runNiaResearchAction(research));
  }
  const result = await runNiaCycle({
    trigger,
    task,
    founderUnavailable,
    acceptancePack,
    threeAgent,
    idempotencyKey,
    skipLiveModel,
  });
  return NextResponse.json(result);
}
