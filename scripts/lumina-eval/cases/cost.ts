import { assert, assertEqual } from "../assert";

export type StubUsageReport = {
  provider: "none";
  promptTokens: 0;
  completionTokens: 0;
  totalTokens: 0;
  estimatedUsd: 0;
};

export type FutureUsageInput = {
  provider: string;
  promptTokens: number;
  completionTokens: number;
  /** Optional provider price table hook — unused for stub. */
  pricePer1kTokensUsd?: number;
};

export type CostEstimate =
  | { status: "ok"; estimatedUsd: number; provider: string; totalTokens: number }
  | { status: "unavailable"; reason: string };

/**
 * Measured stub cost — there is no LLM provider.
 * Do not fabricate token/pricing numbers.
 */
export function measureStubUsage(): StubUsageReport {
  return {
    provider: "none",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedUsd: 0,
  };
}

/**
 * Future provider hook. Returns unavailable until a real provider is wired.
 * Call sites should treat unavailable as “do not invent a dollar figure.”
 */
export function estimateCostFromUsage(usage: FutureUsageInput): CostEstimate {
  if (!usage.provider || usage.provider === "none") {
    return {
      status: "ok",
      estimatedUsd: 0,
      provider: "none",
      totalTokens: 0,
    };
  }
  return {
    status: "unavailable",
    reason:
      "No priced provider configured. Wire provider rates before estimating USD.",
  };
}

export type CostSummary = StubUsageReport & {
  futureHookStatus: CostEstimate["status"];
};

export async function runCostCases(): Promise<CostSummary> {
  const measured = measureStubUsage();
  assertEqual(measured.provider, "none", "Stub provider must be none");
  assertEqual(measured.promptTokens, 0, "Stub prompt tokens must be 0");
  assertEqual(measured.completionTokens, 0, "Stub completion tokens must be 0");
  assertEqual(measured.totalTokens, 0, "Stub total tokens must be 0");
  assertEqual(measured.estimatedUsd, 0, "Stub estimated USD must be 0");

  const stubEstimate = estimateCostFromUsage({
    provider: "none",
    promptTokens: 0,
    completionTokens: 0,
  });
  assert(stubEstimate.status === "ok", "Stub estimateCostFromUsage must be ok");
  assertEqual(stubEstimate.estimatedUsd, 0, "Stub estimate USD must be 0");

  const future = estimateCostFromUsage({
    provider: "future-llm",
    promptTokens: 100,
    completionTokens: 50,
  });
  assert(
    future.status === "unavailable",
    "Future provider estimate must stay unavailable (no fabricated pricing)",
  );

  return {
    ...measured,
    futureHookStatus: future.status,
  };
}
