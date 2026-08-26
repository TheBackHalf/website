import { createHash } from "node:crypto";

import { optionalPositiveNumber } from "@/lib/ai-controls/env";
import { policyFor } from "@/lib/ai-controls/catalog";
import type { AiServiceId, AiUsageSnapshot } from "@/lib/ai-controls/types";

export type AiUsageEvent = {
  atMs: number;
  service: AiServiceId;
  actorId: string;
  requests: number;
  estimatedUsd: number;
  tokens: number;
};

const MINUTE_MS = 60_000;
const TEN_MINUTE_MS = 10 * MINUTE_MS;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

let events: AiUsageEvent[] = [];
let clockMs: number | null = null;

export function nowMs(): number {
  return clockMs ?? Date.now();
}

export function setAiControlClockForTests(ms: number | null): void {
  clockMs = ms;
}

export function resetAiControlStoreForTests(): void {
  events = [];
  clockMs = null;
}

export function seedAiUsageForTests(event: AiUsageEvent): void {
  events.push(event);
}

export function hashActorId(actorId: string): string {
  return createHash("sha256").update(actorId).digest("hex").slice(0, 16);
}

function inWindow(event: AiUsageEvent, windowMs: number, at: number): boolean {
  return event.atMs > at - windowMs && event.atMs <= at;
}

export function usageSnapshot(service: AiServiceId, actorId: string): AiUsageSnapshot {
  const at = nowMs();
  let actorPerMinute = 0;
  let actorPerTenMinutes = 0;
  let actorPerDay = 0;
  let globalPerDay = 0;
  let estimatedUsdDay = 0;
  let estimatedUsdMonth = 0;

  for (const event of events) {
    if (event.service !== service) continue;
    if (inWindow(event, MONTH_MS, at)) {
      estimatedUsdMonth += event.estimatedUsd;
    }
    if (inWindow(event, DAY_MS, at)) {
      globalPerDay += event.requests;
      estimatedUsdDay += event.estimatedUsd;
      if (event.actorId === actorId) actorPerDay += event.requests;
    }
    if (event.actorId !== actorId) continue;
    if (inWindow(event, TEN_MINUTE_MS, at)) actorPerTenMinutes += event.requests;
    if (inWindow(event, MINUTE_MS, at)) actorPerMinute += event.requests;
  }

  return {
    service,
    actorId,
    actorPerMinute,
    actorPerTenMinutes,
    actorPerDay,
    globalPerDay,
    estimatedUsdDay,
    estimatedUsdMonth,
  };
}

export function recordAiUsage(input: {
  service: AiServiceId;
  actorId: string;
  requests?: number;
  tokens?: number;
  estimatedUsd?: number;
}): AiUsageEvent {
  const policy = policyFor(input.service);
  const tokens = Math.max(0, input.tokens ?? 0);
  const requests = Math.max(1, input.requests ?? 1);
  const estimateUsdPer1k =
    optionalPositiveNumber("AI_ESTIMATE_USD_PER_1K_TOKENS") ?? policy.spend.estimateUsdPer1kTokens;
  const estimatePerRequest =
    optionalPositiveNumber("AI_ESTIMATE_USD_PER_REQUEST") ??
    policy.spend.estimateUsdPerRequestWhenTokensUnknown;
  const estimatedUsd =
    input.estimatedUsd ??
    (tokens > 0 ? (tokens / 1000) * estimateUsdPer1k : requests * estimatePerRequest);

  const event: AiUsageEvent = {
    atMs: nowMs(),
    service: input.service,
    actorId: input.actorId,
    requests,
    tokens,
    estimatedUsd: Number(estimatedUsd.toFixed(6)),
  };
  events.push(event);
  return event;
}

export function listAiUsageEventsForTests(): readonly AiUsageEvent[] {
  return events;
}
