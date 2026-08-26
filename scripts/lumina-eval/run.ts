/**
 * Lumina Evaluation Suite — Launch Readiness Rows 80–81
 * Evaluates the stub pipeline honestly (no LLM provider).
 * Row 81: acceptance threshold + named journey/privacy categories.
 */
import { loadLuminaConversationForUser } from "@/lib/lumina/actions/load-conversation";
import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import { assembleLuminaJourneyContextForUser } from "@/lib/lumina/context/assemble";
import { resolveLuminaLocale } from "@/lib/lumina/language/resolve-locale";
import {
  clearLuminaMemoryForUserResult,
  setLuminaMemoryEnabledForUser,
} from "@/lib/lumina/memory/service";
import { EvalAssertionError } from "./assert";
import { runAccuracyCases } from "./cases/accuracy";
import { runBilingualCases } from "./cases/bilingual";
import { runConsistencyCases } from "./cases/consistency";
import { runCostCases, type CostSummary } from "./cases/cost";
import { runJourneyContextCases } from "./cases/journey-context";
import { runLatencyCases, type LatencySummary } from "./cases/latency";
import { runMemoryCases } from "./cases/memory";
import { runPrivacyConsentCases } from "./cases/privacy-consent";
import { runSafetyCases } from "./cases/safety";
import { runUsefulnessCases } from "./cases/usefulness";
import { runVoiceCases } from "./cases/voice";
import { setupEvalHarness, withFreshConversation, type EvalUsers } from "./harness";
import { resetAiControlStoreForTests } from "@/lib/ai-controls/store";
import { setAiEmergencyDisableForTests } from "@/lib/ai-controls/env";
import { setLuminaProviderAdapterForTests } from "@/lib/ai-controls/lumina";

type CategoryKey =
  | "VOICE"
  | "MEMORY"
  | "CONSISTENCY"
  | "ACCURACY"
  | "SAFETY"
  | "USEFULNESS"
  | "BILINGUAL QUALITY"
  | "JOURNEY-AWARE CONTEXT"
  | "PRIVACY/CONSENT BOUNDARIES"
  | "LATENCY"
  | "COST"
  | "LUMINA REGRESSIONS";

type CategoryResult = {
  category: CategoryKey;
  status: "PASS" | "FAIL";
  error?: string;
  detail?: string;
};

async function runCategory(
  category: CategoryKey,
  fn: () => Promise<void>,
): Promise<CategoryResult> {
  resetAiControlStoreForTests();
  setAiEmergencyDisableForTests(null);
  setLuminaProviderAdapterForTests(null);
  try {
    await fn();
    return { category, status: "PASS" };
  } catch (error) {
    if (error instanceof EvalAssertionError) {
      return {
        category,
        status: "FAIL",
        error: error.message,
        detail: error.detail,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { category, status: "FAIL", error: message };
  }
}

async function runLuminaRegressions(users: EvalUsers): Promise<void> {
  const { userA } = users;
  const loaded = await loadLuminaConversationForUser(userA.id);
  if (loaded.status !== "ok") {
    throw new EvalAssertionError("load conversation regression failed");
  }
  const sent = await sendLuminaMessageForUser(userA.id, {
    conversationId: loaded.conversation.id,
    content: "Regression smoke send",
    routeLocale: "en",
  });
  if (sent.status !== "ok") {
    throw new EvalAssertionError("send conversation regression failed");
  }

  const enable = await setLuminaMemoryEnabledForUser(userA.id, true);
  if (enable.status !== "ok") {
    throw new EvalAssertionError("memory enable regression failed");
  }
  const clear = await clearLuminaMemoryForUserResult(userA.id);
  if (clear.status !== "ok") {
    throw new EvalAssertionError("memory clear regression failed");
  }

  const assembled = await assembleLuminaJourneyContextForUser(userA.id);
  if (!assembled?.currentJourney) {
    throw new EvalAssertionError("assemble context regression failed");
  }

  if (resolveLuminaLocale({ routeLocale: "es", profileLocale: "en" }) !== "es") {
    throw new EvalAssertionError("resolve locale regression failed");
  }

  // Ensure conversation helper still works after suite mutations
  await withFreshConversation(userA.id);
}

async function main(): Promise<number> {
  const harness = await setupEvalHarness();
  const results: CategoryResult[] = [];
  let latency: LatencySummary | undefined;
  let cost: CostSummary | undefined;

  try {
    results.push(
      await runCategory("VOICE", () => runVoiceCases(harness.users)),
    );
    results.push(
      await runCategory("MEMORY", () => runMemoryCases(harness.users)),
    );
    results.push(
      await runCategory("CONSISTENCY", () => runConsistencyCases(harness.users)),
    );
    results.push(
      await runCategory("ACCURACY", () => runAccuracyCases(harness.users)),
    );
    results.push(
      await runCategory("SAFETY", () => runSafetyCases(harness.users)),
    );
    results.push(
      await runCategory("USEFULNESS", () => runUsefulnessCases(harness.users)),
    );
    results.push(
      await runCategory("BILINGUAL QUALITY", () =>
        runBilingualCases(harness.users),
      ),
    );
    results.push(
      await runCategory("JOURNEY-AWARE CONTEXT", () =>
        runJourneyContextCases(harness.users),
      ),
    );
    results.push(
      await runCategory("PRIVACY/CONSENT BOUNDARIES", () =>
        runPrivacyConsentCases(harness.users),
      ),
    );
    results.push(
      await runCategory("LATENCY", async () => {
        latency = await runLatencyCases(harness.users);
      }),
    );
    results.push(
      await runCategory("COST", async () => {
        cost = await runCostCases();
      }),
    );
    results.push(
      await runCategory("LUMINA REGRESSIONS", () =>
        runLuminaRegressions(harness.users),
      ),
    );
  } finally {
    await harness.cleanup();
  }

  for (const result of results) {
    const suffix =
      result.status === "FAIL"
        ? ` — ${result.error ?? "unknown"}${result.detail ? ` (${result.detail})` : ""}`
        : "";
    console.log(`${result.category}: ${result.status}${suffix}`);
  }

  if (latency) {
    console.log(
      `LATENCY_SUMMARY: runs=${latency.runs} p50Ms=${latency.p50Ms} p95Ms=${latency.p95Ms} maxMs=${latency.maxMs}`,
    );
  }
  if (cost) {
    console.log(
      `COST_SUMMARY: provider=${cost.provider} tokens=${cost.totalTokens} estimatedUsd=${cost.estimatedUsd} futureHook=${cost.futureHookStatus}`,
    );
  }

  const summary = {
    suite: "lumina-eval",
    row: 81,
    provider: "none",
    results: results.map((entry) => ({
      category: entry.category,
      status: entry.status,
      ...(entry.error ? { error: entry.error } : {}),
      ...(entry.detail ? { detail: entry.detail } : {}),
    })),
    latency: latency
      ? {
          runs: latency.runs,
          p50Ms: latency.p50Ms,
          p95Ms: latency.p95Ms,
          maxMs: latency.maxMs,
        }
      : null,
    cost: cost
      ? {
          provider: cost.provider,
          promptTokens: cost.promptTokens,
          completionTokens: cost.completionTokens,
          totalTokens: cost.totalTokens,
          estimatedUsd: cost.estimatedUsd,
          futureHookStatus: cost.futureHookStatus,
        }
      : null,
    allPassed: results.every((entry) => entry.status === "PASS"),
  };

  console.log("JSON_SUMMARY:" + JSON.stringify(summary));

  return summary.allPassed ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Lumina eval suite crashed: ${message}`);
    process.exitCode = 1;
  });
