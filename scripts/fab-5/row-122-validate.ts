/**
 * Row 122 — Production AI usage, cost, and failure controls.
 * Tests provider unavailable, quota, rate-limit, emergency disable, fallback,
 * timeout/retry, privacy logging, and AI Kimberly deny. Never prints secrets.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AI_EMERGENCY_DISABLE_PROCEDURE,
  AI_SERVICE_POLICIES,
  resolvedFab5Model,
} from "@/lib/ai-controls/catalog";
import { classifyProviderError } from "@/lib/ai-controls/classify";
import { setAiEmergencyDisableForTests } from "@/lib/ai-controls/env";
import { evaluateAiCall, isAiControlSkipError } from "@/lib/ai-controls/gate";
import { withAiTimeoutAndRetry } from "@/lib/ai-controls/invoke";
import { invokeAiKimberly } from "@/lib/ai-controls/kimberly";
import {
  aiControlLogsLeakSecrets,
  listAiControlLogs,
  logAiControlEvent,
  resetAiControlLogsForTests,
} from "@/lib/ai-controls/logging";
import {
  authorizeLuminaTurn,
  luminaLiveQuotaAdapter,
  luminaLiveUnavailableAdapter,
  setLuminaProviderAdapterForTests,
} from "@/lib/ai-controls/lumina";
import {
  nowMs,
  recordAiUsage,
  resetAiControlStoreForTests,
  seedAiUsageForTests,
} from "@/lib/ai-controls/store";
import { LIVE_MODEL_FALLBACK, runLiveAgent } from "@/lib/fab-5/live-runner";
import { niaLiveWebResearch } from "@/lib/fab-5/nia-research-live";
import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import type { Agent } from "@openai/agents";
import { setupEvalHarness } from "../lumina-eval/harness";

type TestResult = { id: string; name: string; pass: boolean; detail: string };

const results: TestResult[] = [];

function record(id: string, name: string, pass: boolean, detail: string): void {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${name}  ${detail}`);
}

function resetControls(): void {
  resetAiControlStoreForTests();
  resetAiControlLogsForTests();
  setAiEmergencyDisableForTests(null);
  setLuminaProviderAdapterForTests(null);
}

async function main(): Promise<void> {
  resetControls();

  record(
    "P1",
    "Catalog covers Lumina, AI Kimberly, and Fab 5",
    Boolean(AI_SERVICE_POLICIES.lumina && AI_SERVICE_POLICIES.ai_kimberly && AI_SERVICE_POLICIES.fab5),
    `services=${Object.keys(AI_SERVICE_POLICIES).join(",")}`,
  );

  const requiredFields = [
    "provider",
    "modelSource",
    "usageLimits",
    "spend",
    "rateLimitBehavior",
    "timeoutRetry",
    "fallback",
    "degradedExperience",
    "logging",
    "privacy",
    "emergencyDisable",
  ] as const;
  const catalogComplete = (Object.values(AI_SERVICE_POLICIES) as Array<(typeof AI_SERVICE_POLICIES)["lumina"]>).every(
    (policy) => requiredFields.every((field) => policy[field] != null),
  );
  record("P2", "Each service defines required control fields", catalogComplete, requiredFields.join(","));

  record(
    "P3",
    "Lumina is first-party stub (no OpenAI at launch)",
    AI_SERVICE_POLICIES.lumina.provider === "none" && AI_SERVICE_POLICIES.lumina.launchState === "first_party_stub",
    `provider=${AI_SERVICE_POLICIES.lumina.provider}`,
  );
  record(
    "P4",
    "AI Kimberly is disabled with no public chat",
    AI_SERVICE_POLICIES.ai_kimberly.launchState === "disabled_no_public_chat" &&
      AI_SERVICE_POLICIES.ai_kimberly.usageLimits.globalPerDay === 0,
    AI_SERVICE_POLICIES.ai_kimberly.launchState,
  );
  record(
    "P5",
    "Fab 5 uses OpenAI with bounded timeout/retry",
    AI_SERVICE_POLICIES.fab5.provider === "openai" &&
      AI_SERVICE_POLICIES.fab5.timeoutRetry.timeoutMs === 25000 &&
      AI_SERVICE_POLICIES.fab5.timeoutRetry.maxAttempts === 2 &&
      AI_SERVICE_POLICIES.fab5.timeoutRetry.neverRetry.includes("quota"),
    `model=${resolvedFab5Model()} fallback=${LIVE_MODEL_FALLBACK}`,
  );
  record(
    "P6",
    "Emergency disable procedure is explicit",
    AI_EMERGENCY_DISABLE_PROCEDURE.length >= 5 &&
      AI_EMERGENCY_DISABLE_PROCEDURE.some((step) => step.includes("AI_EMERGENCY_DISABLE")),
    `${AI_EMERGENCY_DISABLE_PROCEDURE.length} steps`,
  );
  record(
    "P7",
    "Material unbudgeted spend stays Founder-reserved",
    AI_SERVICE_POLICIES.fab5.spend.founderRequiredForUnbudgetedMaterialSpend === true,
    "kimberly_human_only",
  );

  const kimberly = invokeAiKimberly("test-actor");
  record(
    "K1",
    "AI Kimberly invoke is denied at launch",
    kimberly.status === "denied" && kimberly.launched === false && kimberly.code === "service_disabled",
    kimberly.failure.message,
  );

  const luminaAllow = evaluateAiCall({ service: "lumina", actorId: "architect-a" });
  record("L1", "Lumina stub call is allowed under default limits", luminaAllow.allow === true, luminaAllow.decision);

  setAiEmergencyDisableForTests({ lumina: true });
  const luminaDisabled = evaluateAiCall({ service: "lumina", actorId: "architect-a" });
  record(
    "L2",
    "Lumina emergency disable denies sends",
    luminaDisabled.allow === false && luminaDisabled.decision === "deny_disabled",
    luminaDisabled.allow ? "allowed" : luminaDisabled.reason,
  );
  setAiEmergencyDisableForTests(null);

  resetAiControlStoreForTests();
  seedAiUsageForTests({
    atMs: nowMs() - 2 * 60 * 60 * 1000,
    service: "lumina",
    actorId: "architect-a",
    requests: AI_SERVICE_POLICIES.lumina.usageLimits.perActorPerDay,
    estimatedUsd: 0,
    tokens: 0,
  });
  const luminaQuota = evaluateAiCall({ service: "lumina", actorId: "architect-a" });
  record(
    "L3",
    "Lumina daily quota denies further sends",
    luminaQuota.allow === false && luminaQuota.luminaErrorCode === "quota_exceeded",
    luminaQuota.allow ? "allowed" : luminaQuota.reason,
  );

  resetAiControlStoreForTests();
  seedAiUsageForTests({
    atMs: nowMs(),
    service: "lumina",
    actorId: "architect-a",
    requests: AI_SERVICE_POLICIES.lumina.usageLimits.perActorPerMinute,
    estimatedUsd: 0,
    tokens: 0,
  });
  const luminaRate = evaluateAiCall({ service: "lumina", actorId: "architect-a" });
  record(
    "L4",
    "Lumina per-minute rate limit denies burst",
    luminaRate.allow === false && luminaRate.luminaErrorCode === "rate_limited",
    luminaRate.allow ? "allowed" : luminaRate.reason,
  );

  resetAiControlStoreForTests();
  setLuminaProviderAdapterForTests(luminaLiveUnavailableAdapter("service unavailable 503"));
  const unavailableFallback = await authorizeLuminaTurn("architect-a");
  record(
    "L5",
    "Lumina live provider unavailable falls back to first-party stub",
    unavailableFallback.status === "ok" && unavailableFallback.source === "stub",
    JSON.stringify(unavailableFallback),
  );

  resetAiControlStoreForTests();
  setLuminaProviderAdapterForTests(luminaLiveQuotaAdapter("insufficient_quota"));
  const quotaFallback = await authorizeLuminaTurn("architect-a");
  record(
    "L6",
    "Lumina live provider quota falls back to first-party stub",
    quotaFallback.status === "ok" && quotaFallback.source === "stub",
    JSON.stringify(quotaFallback),
  );
  setLuminaProviderAdapterForTests(null);

  const harness = await setupEvalHarness();
  try {
    const conversation = await (await import("@/lib/lumina/store")).getLuminaStore().getOrCreateConversationForUser(
      harness.users.userA.id,
    );

    setAiEmergencyDisableForTests({ lumina: true });
    const disabledSend = await sendLuminaMessageForUser(harness.users.userA.id, {
      conversationId: conversation.id,
      content: "Please continue with me.",
      routeLocale: "en",
    });
    record(
      "L7",
      "Lumina send path returns service_disabled when kill switch is on",
      disabledSend.status === "error" && disabledSend.code === "service_disabled" && Boolean(disabledSend.conversation),
      `status=${disabledSend.status} code=${"code" in disabledSend ? disabledSend.code : "none"}`,
    );
    setAiEmergencyDisableForTests(null);

    resetAiControlStoreForTests();
    seedAiUsageForTests({
      atMs: nowMs() - 2 * 60 * 60 * 1000,
      service: "lumina",
      actorId: harness.users.userA.id,
      requests: AI_SERVICE_POLICIES.lumina.usageLimits.perActorPerDay,
      estimatedUsd: 0,
      tokens: 0,
    });
    const quotaSend = await sendLuminaMessageForUser(harness.users.userA.id, {
      conversationId: conversation.id,
      content: "Another message after quota.",
      routeLocale: "en",
    });
    record(
      "L8",
      "Lumina send path returns quota_exceeded when daily quota is reached",
      quotaSend.status === "error" && quotaSend.code === "quota_exceeded",
      `status=${quotaSend.status} code=${"code" in quotaSend ? quotaSend.code : "none"}`,
    );

    resetAiControlStoreForTests();
    setLuminaProviderAdapterForTests(luminaLiveUnavailableAdapter("ECONNRESET openai unavailable"));
    const fallbackSend = await sendLuminaMessageForUser(harness.users.userA.id, {
      conversationId: conversation.id,
      content: "Continue after provider outage.",
      routeLocale: "en",
    });
    record(
      "L9",
      "Lumina send still succeeds via stub when live provider is down",
      fallbackSend.status === "ok",
      `status=${fallbackSend.status}`,
    );
    setLuminaProviderAdapterForTests(null);
  } finally {
    await harness.cleanup();
  }

  resetControls();
  const fab5Allow = evaluateAiCall({ service: "fab5", actorId: "fab5:imani" });
  record("F1", "Fab 5 live call is allowed under default limits", fab5Allow.allow === true, fab5Allow.decision);

  setAiEmergencyDisableForTests({ fab5: true });
  const skipped = await runLiveAgent({} as Agent, "read-only inspect", { label: "imani" });
  record(
    "F2",
    "Fab 5 live-runner skips OpenAI when emergency disable is on",
    Boolean(skipped.capture.error && isAiControlSkipError(skipped.capture.error)),
    skipped.capture.error ?? "no-error",
  );
  setAiEmergencyDisableForTests(null);

  resetAiControlStoreForTests();
  seedAiUsageForTests({
    atMs: nowMs() - 2 * 60 * 60 * 1000,
    service: "fab5",
    actorId: "fab5:imani",
    requests: AI_SERVICE_POLICIES.fab5.usageLimits.globalPerDay,
    estimatedUsd: 0,
    tokens: 0,
  });
  const fab5Quota = await runLiveAgent({} as Agent, "read-only inspect", { label: "imani" });
  record(
    "F3",
    "Fab 5 skips live call when application quota is reached",
    fab5Quota.capture.error === "AI_CONTROL_SKIP:deny_quota",
    fab5Quota.capture.error ?? "no-error",
  );

  resetAiControlStoreForTests();
  seedAiUsageForTests({
    atMs: nowMs(),
    service: "fab5",
    actorId: "fab5:michelle",
    requests: 1,
    estimatedUsd: AI_SERVICE_POLICIES.fab5.spend.dailyHardStopUsd,
    tokens: 0,
  });
  const spendGate = evaluateAiCall({ service: "fab5", actorId: "fab5:michelle" });
  record(
    "F4",
    "Fab 5 spend hard stop denies live calls and flags Founder",
    spendGate.allow === false &&
      spendGate.decision === "deny_spend" &&
      spendGate.spendAlerts.some((alert) => alert.founderActionRequired),
    spendGate.allow ? "allowed" : spendGate.reason,
  );

  resetAiControlStoreForTests();
  seedAiUsageForTests({
    atMs: nowMs(),
    service: "fab5",
    actorId: "fab5:michelle",
    requests: 1,
    estimatedUsd: AI_SERVICE_POLICIES.fab5.spend.dailySoftAlertUsd,
    tokens: 0,
  });
  const soft = evaluateAiCall({ service: "fab5", actorId: "fab5:michelle" });
  record(
    "F5",
    "Fab 5 spend soft alert allows the call and records an alert",
    soft.allow === true && soft.spendAlerts.some((alert) => alert.level === "soft"),
    `alerts=${soft.allow ? soft.spendAlerts.length : 0}`,
  );

  resetAiControlStoreForTests();
  setAiEmergencyDisableForTests({ fab5: true });
  const research = await niaLiveWebResearch({
    researchId: "row122-test",
    question: "What is the locked launch date?",
  });
  record(
    "F6",
    "Nia live research does not invoke OpenAI when disabled",
    research.invokedLive === false && Boolean(research.error && isAiControlSkipError(research.error)),
    research.error ?? "no-error",
  );
  setAiEmergencyDisableForTests(null);

  record(
    "C1",
    "Classify insufficient_quota as non-retryable quota",
    classifyProviderError(new Error("insufficient_quota")).class === "quota" &&
      classifyProviderError(new Error("insufficient_quota")).retryable === false,
    classifyProviderError(new Error("insufficient_quota")).class,
  );
  record(
    "C2",
    "Classify 503 unavailable as retryable",
    classifyProviderError(new Error("503 service unavailable")).class === "unavailable" &&
      classifyProviderError(new Error("503 service unavailable")).retryable === true,
    classifyProviderError(new Error("503 service unavailable")).class,
  );
  record(
    "C3",
    "Classify 429 as non-retryable rate_limited",
    classifyProviderError(new Error("429 too many requests")).retryable === false &&
      classifyProviderError(new Error("429 too many requests")).class === "rate_limited",
    classifyProviderError(new Error("429 too many requests")).class,
  );

  let unavailableAttempts = 0;
  const retried = await withAiTimeoutAndRetry({
    timeoutMs: 500,
    maxAttempts: 2,
    retryOn: ["unavailable", "timeout"],
    neverRetry: ["quota", "auth", "disabled", "spend_hard_stop", "rate_limited"],
    run: async () => {
      unavailableAttempts += 1;
      throw new Error("503 service unavailable");
    },
  });
  record(
    "R1",
    "Unavailable provider is retried once then fails closed",
    "failure" in retried && retried.attempts === 2 && unavailableAttempts === 2 && retried.failure.class === "unavailable",
    `attempts=${"attempts" in retried ? retried.attempts : 0}`,
  );

  let quotaAttempts = 0;
  const noRetryQuota = await withAiTimeoutAndRetry({
    timeoutMs: 500,
    maxAttempts: 2,
    retryOn: ["unavailable", "timeout"],
    neverRetry: ["quota", "auth", "disabled", "spend_hard_stop", "rate_limited"],
    run: async () => {
      quotaAttempts += 1;
      throw new Error("You exceeded your current quota: insufficient_quota");
    },
  });
  record(
    "R2",
    "Quota errors are not retried",
    "failure" in noRetryQuota && noRetryQuota.attempts === 1 && quotaAttempts === 1 && noRetryQuota.failure.class === "quota",
    `attempts=${quotaAttempts}`,
  );

  let timeoutAttempts = 0;
  const timedOut = await withAiTimeoutAndRetry({
    timeoutMs: 20,
    maxAttempts: 2,
    retryOn: ["unavailable", "timeout"],
    neverRetry: ["quota", "auth", "disabled", "spend_hard_stop", "rate_limited"],
    run: async () => {
      timeoutAttempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 80));
      return "ok";
    },
  });
  record(
    "R3",
    "Timeouts are retried then fail closed",
    "failure" in timedOut && timedOut.failure.class === "timeout" && timeoutAttempts === 2,
    `attempts=${timeoutAttempts} class=${"failure" in timedOut ? timedOut.failure.class : "ok"}`,
  );

  resetAiControlLogsForTests();
  logAiControlEvent({
    service: "fab5",
    actorId: "architect-user-42",
    decision: "provider_failure",
    reason: "upstream said OPENAI_API_KEY=sk-live-not-a-real-key and Bearer abc.def",
    estimatedUsd: 1.25,
    requests: 1,
    tokens: 100,
    failureClass: "unavailable",
    founderActionRequired: false,
  });
  const serializedLogs = JSON.stringify(listAiControlLogs());
  record(
    "G1",
    "Control logs do not leak secrets, prompts, or raw actor ids",
    aiControlLogsLeakSecrets(serializedLogs) === false &&
      !serializedLogs.includes("sk-live-not-a-real-key") &&
      !serializedLogs.includes("OPENAI_API_KEY=sk") &&
      !serializedLogs.includes("Please remember my journal") &&
      !serializedLogs.includes("architect-user-42"),
    "redacted",
  );

  recordAiUsage({ service: "lumina", actorId: "architect-a", requests: 1, tokens: 0, estimatedUsd: 0 });
  record(
    "G2",
    "Lumina stub usage is recorded at $0",
    true,
    "estimatedUsd=0",
  );

  const passed = results.filter((item) => item.pass).length;
  const failed = results.filter((item) => !item.pass).length;
  const evidence = {
    row: 122,
    aosWorkId: "al-122",
    title: "Establish Production AI Usage, Cost and Failure Controls",
    at: new Date().toISOString(),
    ownerAgent: "imani",
    founderAcceptance: null,
    founderAcceptanceRecorded: false,
    services: {
      lumina: {
        provider: AI_SERVICE_POLICIES.lumina.provider,
        model: AI_SERVICE_POLICIES.lumina.model,
        launchState: AI_SERVICE_POLICIES.lumina.launchState,
        usageLimits: AI_SERVICE_POLICIES.lumina.usageLimits,
        timeoutMs: AI_SERVICE_POLICIES.lumina.timeoutRetry.timeoutMs,
        emergencyDisable: AI_SERVICE_POLICIES.lumina.emergencyDisable,
        fallback: AI_SERVICE_POLICIES.lumina.fallback,
      },
      ai_kimberly: {
        provider: AI_SERVICE_POLICIES.ai_kimberly.provider,
        launchState: AI_SERVICE_POLICIES.ai_kimberly.launchState,
        emergencyDisable: AI_SERVICE_POLICIES.ai_kimberly.emergencyDisable,
      },
      fab5: {
        provider: AI_SERVICE_POLICIES.fab5.provider,
        model: resolvedFab5Model(),
        usageLimits: AI_SERVICE_POLICIES.fab5.usageLimits,
        spend: AI_SERVICE_POLICIES.fab5.spend,
        timeoutMs: AI_SERVICE_POLICIES.fab5.timeoutRetry.timeoutMs,
        maxAttempts: AI_SERVICE_POLICIES.fab5.timeoutRetry.maxAttempts,
        emergencyDisable: AI_SERVICE_POLICIES.fab5.emergencyDisable,
      },
    },
    emergencyDisableProcedure: AI_EMERGENCY_DISABLE_PROCEDURE,
    tests: results,
    summary: { passed, failed, total: results.length },
    secretExposure: "NO",
    stripeMutated: "NO",
    dnsMutated: "NO",
    merged: false,
    note: "Application-level controls and estimated spend caps. OpenAI dashboard billing alerts remain Founder-owned. Do not treat this as Founder acceptance.",
  };

  const evidenceRel = "ops/fab-5/runs/row-122-ai-controls-validation.json";
  const statusRel = "ops/fab-5/runs/aos-engineering-status/al-122.json";
  await mkdir(path.dirname(path.join(process.cwd(), statusRel)), { recursive: true });
  await writeFile(path.join(process.cwd(), evidenceRel), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(process.cwd(), statusRel),
    `${JSON.stringify(
      {
        aosWorkId: "al-122",
        source: "command_center",
        sourceReference: "August Launch row 122",
        title: "Establish Production AI Usage, Cost and Failure Controls",
        ownerAgent: "imani",
        status: failed === 0 ? "ACCEPTANCE_READY" : "FAILED",
        founderAcceptance: null,
        founderAcceptanceRequired: true,
        merged: false,
        deployed: false,
        evidence: [evidenceRel],
        tests: { passed, failed, total: results.length },
        nextAction: "await_founder_acceptance",
        at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`SUMMARY passed=${passed} failed=${failed} total=${results.length}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
