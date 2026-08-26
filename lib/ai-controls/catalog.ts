import type { AiServiceId, AiServicePolicy } from "@/lib/ai-controls/types";

const LOGGING = {
  logUsageAndDecisions: true,
  logPrompts: false,
  logConversationText: false,
  logSecrets: false,
  actorIdentifier: "hashed_actor_id",
} as const;

const ZERO_SPEND = {
  estimateUsdPer1kTokens: 0,
  estimateUsdPerRequestWhenTokensUnknown: 0,
  dailySoftAlertUsd: 0,
  dailyHardStopUsd: 0,
  monthlyHardStopUsd: 0,
  founderRequiredForUnbudgetedMaterialSpend: true,
} as const;

const FAB5_RETRY_ON = ["unavailable", "timeout"] as const;
const NEVER_RETRY = ["quota", "auth", "disabled", "spend_hard_stop", "rate_limited"] as const;

export const AI_EMERGENCY_DISABLE_PROCEDURE = [
  "Set Vercel Production env AI_EMERGENCY_DISABLE=1 to stop Lumina live/stub sends, Fab 5 live model calls, and any AI Kimberly invoke. Per-service: AI_DISABLE_LUMINA=1, AI_DISABLE_FAB5=1, AI_DISABLE_AI_KIMBERLY=1.",
  "Do not rotate or paste API keys in chat, traces, or git. Do not weaken auth.",
  "Confirm degraded behavior: Lumina returns service_disabled; Fab 5 skips live invocation and continues first-party agents; AI Kimberly remains off (no public chat at launch).",
  "Founder-owned OpenAI dashboard: pause usage, set billing alerts, or disable the key if spend is out of control. Material unbudgeted spend remains Kimberly Walker (human) reserved.",
  "Re-enable by unsetting the env var(s) after the incident is contained. Do not mark this row Complete; Founder acceptance stays with Kimberly Walker (human).",
] as const;

export const LUMINA_POLICY: AiServicePolicy = {
  service: "lumina",
  displayName: "Lumina",
  launchState: "first_party_stub",
  provider: "none",
  model: null,
  modelSource: "No live LLM at launch. lib/lumina/conversation.ts first-party stub.",
  productionUse:
    "Authenticated Architect conversation. First-party stub replies. A future live provider must call this control plane before any model request.",
  usageLimits: {
    perActorPerMinute: 8,
    perActorPerTenMinutes: 40,
    perActorPerDay: 200,
    globalPerDay: 4000,
  },
  spend: ZERO_SPEND,
  rateLimitBehavior:
    "Deny the send, keep the user message, return rate_limited. Retry is allowed after the window. Do not hammer a live provider.",
  timeoutRetry: {
    timeoutMs: 12000,
    maxAttempts: 2,
    retryOn: FAB5_RETRY_ON,
    neverRetry: NEVER_RETRY,
  },
  fallback:
    "If a live provider is later attached and is unavailable or quota-exhausted, continue the first-party stub so Architect conversation still works.",
  degradedExperience:
    "Stub replies remain available when a live provider fails. Emergency disable and application quota return a structured error instead of a model reply.",
  logging: LOGGING,
  privacy: {
    noPromptLogging: true,
    noSecretEcho: true,
    participantContentStaysOnService: "Lumina conversation store only. Not sent to OpenAI at launch.",
    crossServiceIsolation: "Lumina never shares turns with Fab 5 or AI Kimberly.",
  },
  emergencyDisable: "AI_DISABLE_LUMINA=1 or AI_EMERGENCY_DISABLE=1",
};

export const AI_KIMBERLY_POLICY: AiServicePolicy = {
  service: "ai_kimberly",
  displayName: "AI Kimberly",
  launchState: "disabled_no_public_chat",
  provider: "none",
  model: null,
  modelSource: "No public participant chat at launch. Direct URLs are age-gated only.",
  productionUse:
    "Not an operating agent. Not execution capacity. No live participant chat. Any invoke is denied.",
  usageLimits: {
    perActorPerMinute: 0,
    perActorPerTenMinutes: 0,
    perActorPerDay: 0,
    globalPerDay: 0,
  },
  spend: ZERO_SPEND,
  rateLimitBehavior: "Every invoke is denied as not launched. No retry to a provider.",
  timeoutRetry: {
    timeoutMs: 1000,
    maxAttempts: 1,
    retryOn: [],
    neverRetry: NEVER_RETRY,
  },
  fallback: "Age-gated URLs remain; no chat surface is created by this control.",
  degradedExperience:
    "No participant chat. Homepage Founder section stays labeled Founder, not live AI chat.",
  logging: LOGGING,
  privacy: {
    noPromptLogging: true,
    noSecretEcho: true,
    participantContentStaysOnService: "No AI Kimberly conversation store exists at launch.",
    crossServiceIsolation: "AI Kimberly is not an operating agent and cannot consume Fab 5 or Lumina context.",
  },
  emergencyDisable: "Already off at launch. AI_DISABLE_AI_KIMBERLY=1 keeps it off.",
};

export const FAB5_POLICY: AiServicePolicy = {
  service: "fab5",
  displayName: "Fab 5 production services",
  launchState: "openai_live_optional",
  provider: "openai",
  model: "gpt-5.6-luna",
  modelSource: "OPENAI_DEFAULT_MODEL if set, else lib/fab-5/live-runner.ts LIVE_MODEL_FALLBACK.",
  productionUse:
    "Michelle, Imani, and Nia live cycles via @openai/agents. Nia live research uses the same SDK. First-party agents continue when live is skipped.",
  usageLimits: {
    perActorPerMinute: 4,
    perActorPerTenMinutes: 12,
    perActorPerDay: 40,
    globalPerDay: 80,
  },
  spend: {
    estimateUsdPer1kTokens: 0.015,
    estimateUsdPerRequestWhenTokensUnknown: 0.04,
    dailySoftAlertUsd: 15,
    dailyHardStopUsd: 40,
    monthlyHardStopUsd: 250,
    founderRequiredForUnbudgetedMaterialSpend: true,
  },
  rateLimitBehavior:
    "Skip the live OpenAI call. Continue first-party Fab 5 agents. Do not retry 429/quota. Heartbeat records SKIPPED, not a crash.",
  timeoutRetry: {
    timeoutMs: 25000,
    maxAttempts: 2,
    retryOn: FAB5_RETRY_ON,
    neverRetry: NEVER_RETRY,
  },
  fallback:
    "No second LLM vendor. Skip live invocation. Deterministic Michelle/Imani/Nia runtimes continue. Escalate unavailable_credentials or quota.",
  degradedExperience:
    "Hosted cycles keep working without live synthesis. Research returns a structured error. Architect-facing site, checkout, and Lumina stub are unaffected.",
  logging: LOGGING,
  privacy: {
    noPromptLogging: true,
    noSecretEcho: true,
    participantContentStaysOnService: "Fab 5 must not ingest Lumina conversation text or Architect journal content.",
    crossServiceIsolation: "Operating agents only. Lumina and Kimberly Walker (AI) are not operating agents.",
  },
  emergencyDisable: "AI_DISABLE_FAB5=1 or AI_EMERGENCY_DISABLE=1",
};

export const AI_SERVICE_POLICIES: Record<AiServiceId, AiServicePolicy> = {
  lumina: LUMINA_POLICY,
  ai_kimberly: AI_KIMBERLY_POLICY,
  fab5: FAB5_POLICY,
};

export function policyFor(service: AiServiceId): AiServicePolicy {
  return AI_SERVICE_POLICIES[service];
}

export function resolvedFab5Model(): string {
  const override = process.env.OPENAI_DEFAULT_MODEL?.trim();
  return override && override.length > 0 ? override : FAB5_POLICY.model ?? "gpt-5.6-luna";
}
