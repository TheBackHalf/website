import { evaluateAiCall } from "@/lib/ai-controls/gate";
import { logAiControlEvent } from "@/lib/ai-controls/logging";
import type { ProviderFailure } from "@/lib/ai-controls/types";

export type AiKimberlyInvokeResult = {
  status: "denied";
  code: "service_disabled";
  launched: false;
  failure: ProviderFailure;
};

/**
 * AI Kimberly is not an operating agent and has no public participant chat at launch.
 * Any production invoke is denied.
 */
export function invokeAiKimberly(actorId = "anonymous"): AiKimberlyInvokeResult {
  const gate = evaluateAiCall({ service: "ai_kimberly", actorId });
  const failure: ProviderFailure = {
    class: "disabled",
    retryable: false,
    message: gate.allow ? "ai_kimberly_not_launched" : gate.reason,
  };
  logAiControlEvent({
    service: "ai_kimberly",
    actorId,
    decision: "deny_not_launched",
    reason: failure.message,
    estimatedUsd: 0,
    requests: 0,
    tokens: 0,
    failureClass: "disabled",
    founderActionRequired: false,
  });
  return {
    status: "denied",
    code: "service_disabled",
    launched: false,
    failure,
  };
}
