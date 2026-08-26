import { classifyProviderError } from "@/lib/ai-controls/classify";
import { evaluateAiCall } from "@/lib/ai-controls/gate";
import { withAiTimeoutAndRetry } from "@/lib/ai-controls/invoke";
import { logAiControlEvent } from "@/lib/ai-controls/logging";
import { recordAiUsage } from "@/lib/ai-controls/store";
import type { AiGateResult, ProviderFailure } from "@/lib/ai-controls/types";

export type LuminaProviderResult =
  | { ok: true; source: "stub" | "live"; content?: string }
  | { ok: false; failure: ProviderFailure };

export type LuminaProviderAdapter = {
  id: "stub" | "simulated_live";
  invoke: () => Promise<LuminaProviderResult>;
};

let testAdapter: LuminaProviderAdapter | null = null;

export function setLuminaProviderAdapterForTests(adapter: LuminaProviderAdapter | null): void {
  testAdapter = adapter;
}

export type LuminaControlledTurn =
  | { status: "ok"; source: "stub" | "live"; spendAlerts: AiGateResult["spendAlerts"] }
  | {
      status: "denied";
      code: "rate_limited" | "quota_exceeded" | "service_disabled" | "provider_unavailable";
      reason: string;
    };

export async function authorizeLuminaTurn(actorId: string): Promise<LuminaControlledTurn> {
  const gate = evaluateAiCall({ service: "lumina", actorId });
  if (!gate.allow) {
    return { status: "denied", code: gate.luminaErrorCode, reason: gate.reason };
  }

  const adapter = testAdapter;
  if (!adapter || adapter.id === "stub") {
    recordAiUsage({ service: "lumina", actorId, requests: 1, tokens: 0, estimatedUsd: 0 });
    return { status: "ok", source: "stub", spendAlerts: gate.spendAlerts };
  }

  const timed = await withAiTimeoutAndRetry({
    timeoutMs: gate.policy.timeoutRetry.timeoutMs,
    maxAttempts: gate.policy.timeoutRetry.maxAttempts,
    retryOn: gate.policy.timeoutRetry.retryOn,
    neverRetry: gate.policy.timeoutRetry.neverRetry,
    run: adapter.invoke,
  });

  if ("failure" in timed) {
    logAiControlEvent({
      service: "lumina",
      actorId,
      decision: "fallback",
      reason: timed.failure.message,
      estimatedUsd: 0,
      requests: 1,
      tokens: 0,
      failureClass: timed.failure.class,
      founderActionRequired: false,
    });
    recordAiUsage({ service: "lumina", actorId, requests: 1, tokens: 0, estimatedUsd: 0 });
    return { status: "ok", source: "stub", spendAlerts: gate.spendAlerts };
  }

  if (!timed.value.ok) {
    const failure = timed.value.failure;
    logAiControlEvent({
      service: "lumina",
      actorId,
      decision: "fallback",
      reason: failure.message,
      estimatedUsd: 0,
      requests: 1,
      tokens: 0,
      failureClass: failure.class,
      founderActionRequired: false,
    });
    recordAiUsage({ service: "lumina", actorId, requests: 1, tokens: 0, estimatedUsd: 0 });
    return { status: "ok", source: "stub", spendAlerts: gate.spendAlerts };
  }

  recordAiUsage({ service: "lumina", actorId, requests: 1, tokens: 0, estimatedUsd: 0 });
  return { status: "ok", source: timed.value.source, spendAlerts: gate.spendAlerts };
}

export function luminaLiveUnavailableAdapter(message = "openai_unavailable"): LuminaProviderAdapter {
  return {
    id: "simulated_live",
    invoke: async () => ({
      ok: false,
      failure: classifyProviderError(new Error(message)),
    }),
  };
}

export function luminaLiveQuotaAdapter(message = "insufficient_quota"): LuminaProviderAdapter {
  return {
    id: "simulated_live",
    invoke: async () => ({
      ok: false,
      failure: classifyProviderError(new Error(message)),
    }),
  };
}
