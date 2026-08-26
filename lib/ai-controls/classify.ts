import { redactAiControlText } from "@/lib/ai-controls/redact";
import type { AiFailureClass, ProviderFailure } from "@/lib/ai-controls/types";

export function classifyProviderError(error: unknown): ProviderFailure {
  const raw = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  const message = redactAiControlText(raw).slice(0, 240);
  const lower = message.toLowerCase();

  if (
    /insufficient_quota|quota.?exceeded|billing_hard_limit|exceeded your current quota/.test(lower)
  ) {
    return { class: "quota", retryable: false, message };
  }
  if (/\b429\b|rate.?limit|too many requests|rpm|tpm/.test(lower)) {
    return { class: "rate_limited", retryable: false, message };
  }
  if (/abort(?:error)?|timed?\s*out|timeout|deadline/.test(lower)) {
    return { class: "timeout", retryable: true, message };
  }
  if (/\b401\b|\b403\b|invalid api key|incorrect api key|unauthorized/.test(lower)) {
    return { class: "auth", retryable: false, message };
  }
  if (
    /econnreset|enotfound|econnrefused|fetch failed|service unavailable|\b503\b|\b529\b|overloaded|unavailable/.test(
      lower,
    )
  ) {
    return { class: "unavailable", retryable: true, message };
  }
  if (/\b5\d\d\b/.test(lower)) {
    return { class: "unavailable", retryable: true, message };
  }
  return { class: "unknown", retryable: false, message };
}

export function isRetryableFailure(
  failure: ProviderFailure,
  retryOn: readonly AiFailureClass[],
  neverRetry: readonly AiFailureClass[],
): boolean {
  if (neverRetry.includes(failure.class)) return false;
  return failure.retryable && retryOn.includes(failure.class);
}
