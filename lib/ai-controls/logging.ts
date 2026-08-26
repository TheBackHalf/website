import { redactAiControlText } from "@/lib/ai-controls/redact";
import { hashActorId } from "@/lib/ai-controls/store";
import type { AiControlLogEvent } from "@/lib/ai-controls/types";

const MAX_LOGS = 200;
let logs: AiControlLogEvent[] = [];

export function resetAiControlLogsForTests(): void {
  logs = [];
}

export function listAiControlLogs(): readonly AiControlLogEvent[] {
  return logs;
}

export function logAiControlEvent(
  event: Omit<AiControlLogEvent, "at" | "actorHash"> & { actorId: string },
): AiControlLogEvent {
  const recorded: AiControlLogEvent = {
    at: new Date().toISOString(),
    service: event.service,
    decision: event.decision,
    reason: redactAiControlText(event.reason).slice(0, 240),
    actorHash: hashActorId(event.actorId),
    estimatedUsd: event.estimatedUsd,
    requests: event.requests,
    tokens: event.tokens,
    failureClass: event.failureClass,
    founderActionRequired: event.founderActionRequired,
  };
  logs.push(recorded);
  if (logs.length > MAX_LOGS) logs = logs.slice(-MAX_LOGS);
  return recorded;
}

export function aiControlLogsLeakSecrets(serialized: string): boolean {
  return (
    /sk_live_[A-Za-z0-9]+/.test(serialized) ||
    /sk_test_[A-Za-z0-9]+/.test(serialized) ||
    /whsec_[A-Za-z0-9]+/.test(serialized) ||
    /OPENAI_API_KEY\s*[:=]\s*sk-/i.test(serialized) ||
    /sk-[A-Za-z0-9_-]{12,}/.test(serialized)
  );
}
