/**
 * Production AI usage, cost, and failure controls (August Launch row 122).
 * Runtime policy only. Never logs prompts, conversation text, or secrets.
 */

export const AI_SERVICE_IDS = ["lumina", "ai_kimberly", "fab5"] as const;
export type AiServiceId = (typeof AI_SERVICE_IDS)[number];

export const AI_PROVIDER_IDS = ["none", "openai"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export const AI_FAILURE_CLASSES = [
  "unavailable",
  "quota",
  "rate_limited",
  "timeout",
  "auth",
  "disabled",
  "spend_hard_stop",
  "unknown",
] as const;
export type AiFailureClass = (typeof AI_FAILURE_CLASSES)[number];

export const AI_DECISIONS = [
  "allow",
  "fallback_stub",
  "deny_rate_limited",
  "deny_quota",
  "deny_disabled",
  "deny_spend",
  "deny_not_launched",
  "skip_live",
] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];

export type AiUsageLimits = {
  perActorPerMinute: number;
  perActorPerTenMinutes: number;
  perActorPerDay: number;
  globalPerDay: number;
};

export type AiSpendPolicy = {
  /** Application-level estimate only — not OpenAI billing. */
  estimateUsdPer1kTokens: number;
  estimateUsdPerRequestWhenTokensUnknown: number;
  dailySoftAlertUsd: number;
  dailyHardStopUsd: number;
  monthlyHardStopUsd: number;
  founderRequiredForUnbudgetedMaterialSpend: true;
};

export type AiTimeoutRetryPolicy = {
  timeoutMs: number;
  maxAttempts: number;
  retryOn: readonly AiFailureClass[];
  /** Never retry quota, auth, disable, or spend stops. */
  neverRetry: readonly AiFailureClass[];
};

export type AiLoggingPolicy = {
  logUsageAndDecisions: true;
  logPrompts: false;
  logConversationText: false;
  logSecrets: false;
  actorIdentifier: "hashed_actor_id";
};

export type AiPrivacyBoundary = {
  noPromptLogging: true;
  noSecretEcho: true;
  participantContentStaysOnService: string;
  crossServiceIsolation: string;
};

export type AiServicePolicy = {
  service: AiServiceId;
  displayName: string;
  launchState: "first_party_stub" | "disabled_no_public_chat" | "openai_live_optional";
  provider: AiProviderId;
  model: string | null;
  modelSource: string;
  productionUse: string;
  usageLimits: AiUsageLimits;
  spend: AiSpendPolicy;
  rateLimitBehavior: string;
  timeoutRetry: AiTimeoutRetryPolicy;
  fallback: string;
  degradedExperience: string;
  logging: AiLoggingPolicy;
  privacy: AiPrivacyBoundary;
  emergencyDisable: string;
};

export type AiControlRequest = {
  service: AiServiceId;
  actorId: string;
  estimatedTokens?: number;
};

export type SpendAlert = {
  level: "soft" | "hard";
  service: AiServiceId;
  window: "day" | "month";
  estimatedUsd: number;
  thresholdUsd: number;
  founderActionRequired: boolean;
};

export type AiGateResult =
  | {
      allow: true;
      decision: "allow";
      policy: AiServicePolicy;
      spendAlerts: SpendAlert[];
    }
  | {
      allow: false;
      decision: Exclude<AiDecision, "allow" | "fallback_stub">;
      policy: AiServicePolicy;
      failureClass: AiFailureClass;
      reason: string;
      retryable: boolean;
      retryAfterMs: number | null;
      spendAlerts: SpendAlert[];
      luminaErrorCode:
        | "rate_limited"
        | "quota_exceeded"
        | "service_disabled"
        | "provider_unavailable";
    };

export type ProviderFailure = {
  class: AiFailureClass;
  retryable: boolean;
  message: string;
};

export type AiControlLogEvent = {
  at: string;
  service: AiServiceId;
  decision: AiDecision | "provider_failure" | "usage_recorded" | "fallback";
  reason: string;
  actorHash: string;
  estimatedUsd: number;
  requests: number;
  tokens: number;
  failureClass: AiFailureClass | null;
  founderActionRequired: boolean;
};

export type AiUsageSnapshot = {
  service: AiServiceId;
  actorId: string;
  actorPerMinute: number;
  actorPerTenMinutes: number;
  actorPerDay: number;
  globalPerDay: number;
  estimatedUsdDay: number;
  estimatedUsdMonth: number;
};

export const AI_CONTROL_SKIP_PREFIX = "AI_CONTROL_SKIP:";
