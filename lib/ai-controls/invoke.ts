import { classifyProviderError, isRetryableFailure } from "@/lib/ai-controls/classify";
import type { AiFailureClass, ProviderFailure } from "@/lib/ai-controls/types";

export class AiCallTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`AI_CALL_TIMEOUT:${timeoutMs}`);
    this.name = "AbortError";
  }
}

export async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new AiCallTimeoutError(timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withAiTimeoutAndRetry<T>(input: {
  timeoutMs: number;
  maxAttempts: number;
  retryOn: readonly AiFailureClass[];
  neverRetry: readonly AiFailureClass[];
  run: () => Promise<T>;
}): Promise<{ value: T; attempts: number } | { failure: ProviderFailure; attempts: number }> {
  const maxAttempts = Math.max(1, input.maxAttempts);
  let lastFailure: ProviderFailure | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const value = await withTimeout(input.run(), input.timeoutMs);
      return { value, attempts: attempt };
    } catch (error) {
      lastFailure = classifyProviderError(error);
      const canRetry =
        attempt < maxAttempts &&
        isRetryableFailure(lastFailure, input.retryOn, input.neverRetry);
      if (!canRetry) {
        return { failure: lastFailure, attempts: attempt };
      }
    }
  }
  return {
    failure: lastFailure ?? { class: "unknown", retryable: false, message: "retry_exhausted" },
    attempts: maxAttempts,
  };
}
