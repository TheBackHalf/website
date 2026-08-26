import { policyFor } from "@/lib/ai-controls/catalog";
import { isAiServiceDisabled, optionalPositiveNumber } from "@/lib/ai-controls/env";
import { logAiControlEvent } from "@/lib/ai-controls/logging";
import { usageSnapshot } from "@/lib/ai-controls/store";
import type {
  AiControlRequest,
  AiGateResult,
  AiServicePolicy,
  SpendAlert,
} from "@/lib/ai-controls/types";

function limitsOf(policy: AiServicePolicy) {
  if (policy.service === "lumina") {
    const daily = optionalPositiveNumber("AI_LUMINA_DAILY_REQUEST_LIMIT");
    return daily != null ? { ...policy.usageLimits, perActorPerDay: daily } : policy.usageLimits;
  }
  if (policy.service === "fab5") {
    const daily = optionalPositiveNumber("AI_FAB5_DAILY_REQUEST_LIMIT");
    return daily != null ? { ...policy.usageLimits, globalPerDay: daily } : policy.usageLimits;
  }
  return policy.usageLimits;
}

function spendOf(policy: AiServicePolicy) {
  if (policy.service !== "fab5") return policy.spend;
  return {
    ...policy.spend,
    dailySoftAlertUsd:
      optionalPositiveNumber("AI_FAB5_DAILY_USD_SOFT") ?? policy.spend.dailySoftAlertUsd,
    dailyHardStopUsd:
      optionalPositiveNumber("AI_FAB5_DAILY_USD_HARD") ?? policy.spend.dailyHardStopUsd,
    monthlyHardStopUsd:
      optionalPositiveNumber("AI_FAB5_MONTHLY_USD_HARD") ?? policy.spend.monthlyHardStopUsd,
  };
}

function retryAfterMs(kind: "minute" | "ten_minutes" | "day"): number {
  if (kind === "minute") return 60_000;
  if (kind === "ten_minutes") return 10 * 60_000;
  return 60_000;
}

export function evaluateAiCall(request: AiControlRequest): AiGateResult {
  const policy = policyFor(request.service);
  const spend = spendOf(policy);
  const limits = limitsOf(policy);
  const usage = usageSnapshot(request.service, request.actorId);
  const spendAlerts: SpendAlert[] = [];

  if (spend.dailySoftAlertUsd > 0 && usage.estimatedUsdDay >= spend.dailySoftAlertUsd) {
    spendAlerts.push({
      level: "soft",
      service: request.service,
      window: "day",
      estimatedUsd: usage.estimatedUsdDay,
      thresholdUsd: spend.dailySoftAlertUsd,
      founderActionRequired: false,
    });
  }
  if (spend.monthlyHardStopUsd > 0 && usage.estimatedUsdMonth >= spend.monthlyHardStopUsd) {
    spendAlerts.push({
      level: "hard",
      service: request.service,
      window: "month",
      estimatedUsd: usage.estimatedUsdMonth,
      thresholdUsd: spend.monthlyHardStopUsd,
      founderActionRequired: true,
    });
  }
  if (spend.dailyHardStopUsd > 0 && usage.estimatedUsdDay >= spend.dailyHardStopUsd) {
    spendAlerts.push({
      level: "hard",
      service: request.service,
      window: "day",
      estimatedUsd: usage.estimatedUsdDay,
      thresholdUsd: spend.dailyHardStopUsd,
      founderActionRequired: true,
    });
  }

  const deny = (
    decision: Extract<
      AiGateResult,
      { allow: false }
    >["decision"],
    failureClass: Extract<AiGateResult, { allow: false }>["failureClass"],
    reason: string,
    luminaErrorCode: Extract<AiGateResult, { allow: false }>["luminaErrorCode"],
    retryAfter: number | null,
  ): AiGateResult => {
    const result: AiGateResult = {
      allow: false,
      decision,
      policy,
      failureClass,
      reason,
      retryable: false,
      retryAfterMs: retryAfter,
      spendAlerts,
      luminaErrorCode,
    };
    logAiControlEvent({
      service: request.service,
      actorId: request.actorId,
      decision,
      reason,
      estimatedUsd: usage.estimatedUsdDay,
      requests: usage.actorPerDay,
      tokens: 0,
      failureClass,
      founderActionRequired: spendAlerts.some((alert) => alert.founderActionRequired),
    });
    return result;
  };

  if (request.service === "ai_kimberly") {
    return deny(
      "deny_not_launched",
      "disabled",
      "AI Kimberly has no public participant chat at launch.",
      "service_disabled",
      null,
    );
  }

  if (isAiServiceDisabled(request.service)) {
    return deny(
      "deny_disabled",
      "disabled",
      "Emergency disable is active for this AI service.",
      "service_disabled",
      null,
    );
  }

  const hardSpend = spendAlerts.find((alert) => alert.level === "hard");
  if (hardSpend) {
    return deny(
      "deny_spend",
      "spend_hard_stop",
      `Estimated ${hardSpend.window} spend ${hardSpend.estimatedUsd.toFixed(2)} reached hard stop ${hardSpend.thresholdUsd}.`,
      "quota_exceeded",
      retryAfterMs("day"),
    );
  }

  if (usage.actorPerMinute >= limits.perActorPerMinute) {
    return deny(
      "deny_rate_limited",
      "rate_limited",
      "Per-actor per-minute limit reached.",
      "rate_limited",
      retryAfterMs("minute"),
    );
  }
  if (usage.actorPerTenMinutes >= limits.perActorPerTenMinutes) {
    return deny(
      "deny_rate_limited",
      "rate_limited",
      "Per-actor ten-minute limit reached.",
      "rate_limited",
      retryAfterMs("ten_minutes"),
    );
  }
  if (usage.actorPerDay >= limits.perActorPerDay || usage.globalPerDay >= limits.globalPerDay) {
    return deny(
      "deny_quota",
      "quota",
      usage.globalPerDay >= limits.globalPerDay
        ? "Global daily request quota reached."
        : "Per-actor daily request quota reached.",
      "quota_exceeded",
      retryAfterMs("day"),
    );
  }

  logAiControlEvent({
    service: request.service,
    actorId: request.actorId,
    decision: "allow",
    reason: spendAlerts.length > 0 ? "allowed_with_spend_alert" : "allowed",
    estimatedUsd: usage.estimatedUsdDay,
    requests: usage.actorPerDay,
    tokens: request.estimatedTokens ?? 0,
    failureClass: null,
    founderActionRequired: false,
  });

  return { allow: true, decision: "allow", policy, spendAlerts };
}

export function aiControlSkipError(decision: string): string {
  return `AI_CONTROL_SKIP:${decision}`;
}

export function isAiControlSkipError(error: string | undefined): boolean {
  return Boolean(error?.startsWith("AI_CONTROL_SKIP:"));
}
