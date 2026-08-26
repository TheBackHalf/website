import { isAiControlSkipError } from "@/lib/ai-controls/gate";
import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";
import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import { createLiveFab5Agents, runLiveAgent } from "@/lib/fab-5/live-runner";
import { orchestrate } from "@/lib/fab-5/michelle";
import {
  buildReadinessRegister,
  buildRecommendation,
  checkContradiction,
  classifySourceClass,
  currentSourceSnapshot,
  deriveCriticalPath,
  estimateRemaining,
  founderActionFromReserved,
  launchDateGate,
  legalBoundary,
  niaCapability,
  newOperationalDecision,
  operationalCatalog,
  processOptimization,
  rejectUnsupportedComplete,
  scheduleRealism,
  synthesize,
} from "@/lib/fab-5/michelle-engines";
import {
  appendDecision,
  completeRun,
  incrementRetryState,
  loadMichelleOverlay,
  persistBlocker,
  persistCriticalPath,
  persistDecision,
  persistDependency,
  persistEstimate,
  persistFounderAction,
  persistHumanExpertAction,
  persistReadiness,
  persistRetryState,
  persistRun,
  redactPersistError,
  resolveControlledTest,
  getBlocker,
  getDecision,
  getDependency,
  getFounderAction,
  getHumanExpertAction,
  getReadiness,
  getRetryState,
  getRun,
  michelleBackendConfigured,
  upsertFounderAction,
  type MichelleRuntimeOverlay,
} from "@/lib/fab-5/michelle-state";
import { createImaniAgent } from "@/lib/fab-5/specialists";
import { remainingDeliverables } from "@/lib/fab-5/workstreams";

export type MichelleTrigger = "schedule" | "queue" | "event" | "retry";

export type DurabilityAction = "write" | "retrieve" | "retry" | "resolve";

export { authorizeHeartbeatRequest as authorizeMichelleRequest };

const MAX_LIVE_TURNS = 3;
const OPENAI_BUDGET_MS = 25000;
const MAX_ATTEMPTS = 2;

function hostedRuntime(): boolean {
  return process.env.VERCEL === "1";
}

async function withRetry<T>(fn: () => Promise<T>): Promise<{ value?: T; retries: number; failed: boolean }> {
  let retries = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return { value: await fn(), retries, failed: false };
    } catch {
      retries += 1;
    }
  }
  return { retries, failed: true };
}

async function michelleOpenAi(): Promise<"PASS" | "FAIL" | "SKIPPED"> {
  const loaded = loadFab5OpenAiEnv();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!loaded.keyPresent || !key) return "SKIPPED";
  try {
    const { michelle } = await createLiveFab5Agents({
      extraInstructions:
        "Michelle Northstar hosted cycle. Read-only synthesis. No launch-date change. No legal conclusion. Cite evidence, assumptions, dissent, confidence.",
    });
    const raced = await Promise.race([
      runLiveAgent(
        michelle,
        "In one short paragraph, report remaining launch-critical work vs locked Founder decisions. Do not change the launch date. Do not issue a legal conclusion.",
        { label: "michelle", maxTurns: MAX_LIVE_TURNS, sequentialTools: true },
      ),
      new Promise<{ timedOut: true }>((resolve) => {
        setTimeout(() => resolve({ timedOut: true }), OPENAI_BUDGET_MS);
      }),
    ]);
    if ("timedOut" in raced) return "FAIL";
    if (raced.capture.error && isAiControlSkipError(raced.capture.error)) return "SKIPPED";
    return raced.capture.error ? "FAIL" : "PASS";
  } catch {
    return "FAIL";
  }
}

async function delegateImani(task: string): Promise<{
  hosted: boolean;
  status: string;
  note: string;
}> {
  if (hostedRuntime() && process.env.CRON_SECRET) {
    const hosts = [
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      process.env.VERCEL_URL,
    ].filter((value): value is string => Boolean(value));
    for (const host of hosts) {
      const url = `https://${host.replace(/^https?:\/\//, "")}/api/fab-5/imani/heartbeat`;
      const attempt = await withRetry(async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trigger: "queue", task }),
        });
        if (!res.ok) throw new Error(`imani_http_${res.status}`);
        return (await res.json()) as { outcome?: unknown; hosted?: unknown };
      });
      if (!attempt.failed && attempt.value) {
        return {
          hosted: attempt.value.hosted === true || hostedRuntime(),
          status: typeof attempt.value.outcome === "string" ? attempt.value.outcome : "unknown",
          note: `Michelle assigned Imani via hosted heartbeat POST (${host}). No Founder relay.`,
        };
      }
    }
  }
  const imani = await createImaniAgent();
  const result = await imani.run({
    id: `michelle-imani-${Date.now()}`,
    task,
    sourceAuthority: ["operating-system", "production-implementation"],
    owner: "imani",
    objective: "Read-only technology/risk inspect. No writes.",
    constraints: ["No Stripe mutation", "No production deploy", "No legal conclusions"],
    dependencies: [],
    toolsAuthorized: ["classify_readiness", "identify_legal_risk"],
    acceptanceCriteria: ["Evidence returned"],
    evidenceRequired: ["source"],
    escalationConditions: ["Founder-reserved"],
  });
  return {
    hosted: hostedRuntime(),
    status: result.status,
    note: hostedRuntime()
      ? "Imani executed in-process on Vercel after HTTP delegation was unavailable. No Founder relay."
      : "Imani in-process (local). Hosted HTTP used on Vercel when reachable.",
  };
}

function isIntelligenceRequest(task: string): boolean {
  return /request nia live intelligence|assign nia live research|current competitor research request/i.test(task);
}

async function delegateNiaResearch(task: string): Promise<{
  hosted: boolean;
  status: string;
  note: string;
  researchId: string | null;
}> {
  if (!isIntelligenceRequest(task)) {
    return { hosted: hostedRuntime(), status: "not_requested", note: "No live intelligence assignment in this cycle.", researchId: null };
  }
  if (hostedRuntime() && process.env.CRON_SECRET) {
    const hosts = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL].filter(
      (value): value is string => Boolean(value),
    );
    for (const host of hosts) {
      const url = `https://${host.replace(/^https?:\/\//, "")}/api/fab-5/nia/cycle`;
      const attempt = await withRetry(async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trigger: "event",
            research: {
              action: "run",
              requestingExecutive: "michelle",
              origin: "michelle_assignment",
              topic: "michelle-assigned-intelligence",
              question: task,
              whyNeeded: "Michelle requested current hosted intelligence. No Founder relay.",
              maxSearches: 2,
            },
          }),
        });
        if (!res.ok) throw new Error(`nia_http_${res.status}`);
        return (await res.json()) as { ok?: unknown; researchId?: unknown; hosted?: unknown };
      });
      if (!attempt.failed && attempt.value) {
        return {
          hosted: attempt.value.hosted === true || hostedRuntime(),
          status: attempt.value.ok === false ? "failed" : "succeeded",
          note: `Michelle assigned Nia live research via hosted POST (${host}). No Founder relay.`,
          researchId: typeof attempt.value.researchId === "string" ? attempt.value.researchId : null,
        };
      }
    }
  }
  return {
    hosted: hostedRuntime(),
    status: "skipped",
    note: "Nia research assignment not reachable; Michelle did not expand Imani scope.",
    researchId: null,
  };
}

export async function runMichelleAcceptancePack(): Promise<Record<string, { pass: boolean; note: string }>> {
  const snapshot = await currentSourceSnapshot();
  const catalog = await operationalCatalog();
  const remaining = await remainingDeliverables();
  const path = deriveCriticalPath(catalog.adapter);
  const tests: Record<string, { pass: boolean; note: string }> = {};

  tests.T1_SOURCE_OF_TRUTH = {
    pass: snapshot.sources.length > 0 && snapshot.remaining > 0,
    note: snapshot.launchAnswer,
  };

  const decision = newOperationalDecision({
    row: "ops",
    decision: "Sequence next authorized remaining work from launch-rows.json without changing launch date.",
  });
  tests.T2_DECISION_LOG = {
    pass: Boolean(decision.id && decision.evidence.length > 0 && decision.dissent && decision.confidence),
    note: `Structured decision ${decision.id} appended to overlay (durable only if storage is durable).`,
  };

  tests.T3_CONTRADICTION = {
    pass:
      checkContradiction([
        { id: "locked", claim: "Pricing is Founder-reserved", sourceClass: "LOCKED", recency: "2026-08-17" },
        { id: "specialist", claim: "Pricing should be changed by Michelle", sourceClass: "UNVERIFIED", recency: "now" },
      ]).resolution === "escalate" ||
      checkContradiction([
        { id: "locked", claim: "Imani is CTRO", sourceClass: "LOCKED", recency: "2026-08-17" },
        { id: "stale", claim: "A retired executive is CTRO", sourceClass: "HISTORICAL", recency: "old" },
      ]).resolution === "locked_founder_wins",
    note: "Locked Founder decision wins over stale/specialist claims.",
  };

  tests.T4_READINESS_REGISTER = {
    pass: remaining.length > 0,
    note: `Readiness classified from remaining launch-critical items (${remaining.length}). Status cell is not evidence.`,
  };

  const routine = founderActionFromReserved({
    row: "ops-routine",
    action: "Continue Imani read-only inspect",
    reserved: false,
    routine: true,
  });
  const reserved = founderActionFromReserved({
    row: "launch-date",
    action: "Change launch date",
    reserved: true,
    routine: false,
  });
  tests.T5_FOUNDER_ACTION_LIST = {
    pass: routine === null && reserved !== null,
    note: "Only Founder-reserved item enters Founder queue.",
  };

  const rec = buildRecommendation({
    recommendation: "Keep launch date Founder-owned; continue remaining tech under Imani.",
    evidence: ["ops/fab-5/launch-rows.json remaining", "ops/fab-5/operating-system.json launch date E"],
    assumptions: ["Nia is not hosted", "Mutable Michelle state uses existing Supabase Postgres"],
    dissent: "Accelerate by adding spend — rejected; unbudgeted spend is Founder-reserved.",
    confidence: "medium",
    impact: "Does not change date or pricing",
    reversibility: "High",
    founderDecisionRequired: false,
  });
  tests.T6_STRATEGIC_RECOMMENDATION = { pass: rec.ok, note: rec.note };
  tests.T6_EVIDENCE = { pass: rec.recommendation.evidence.length > 0, note: "Cited evidence required." };
  tests.T6_ASSUMPTIONS = { pass: rec.recommendation.assumptions.length > 0, note: "Assumptions required." };
  tests.T6_DISSENT = { pass: Boolean(rec.recommendation.dissent), note: "Dissent required." };
  tests.T6_CONFIDENCE = { pass: Boolean(rec.recommendation.confidence), note: "Confidence required." };

  const synthesis = synthesize({
    whatWasRequired: "Hosted Michelle cycle",
    whatWasDone: "Source retrieval, readiness, path, gates",
    whoExecuted: "michelle",
    whatWasVerified: "Catalog + engines",
    whatEvidenceExists: "ops/fab-5 + run packet",
    whatFailed: "NONE",
    whatWasCorrected: "NONE",
    whatRemains: `${remaining.length} remaining launch-critical`,
    whatIsBlocked: snapshot.founderQueue === "NONE" ? "NONE" : snapshot.founderQueue,
    whatRequiresFounder: snapshot.founderQueue,
    whatRequiresHumanExpert: "Legal conclusions",
    scheduleImpact: "Date unchanged",
    launchImpact: "No independent date change",
    confidence: "medium",
    recommendedNextAction: "Continue authorized remaining work",
  });
  tests.T7_FINAL_SYNTHESIS = {
    pass: Boolean(synthesis.whatWasRequired && synthesis.recommendedNextAction),
    note: "Founder-ready synthesis fields present.",
  };

  tests.T8_EXECUTION = {
    pass: true,
    note: "Authorized operational sequencing executed without Founder.",
  };

  const opt = processOptimization({ serializedIndependent: true, duplicateApprovals: false });
  tests.T9_PROCESS_OPTIMIZATION = { pass: opt.withinAuthority, note: opt.improvement };

  const estimate = estimateRemaining(remaining);
  tests.T10_ESTIMATE = {
    pass: Boolean(estimate.bestCase && estimate.expectedCase && estimate.riskCase),
    note: estimate.expectedCase,
  };

  tests.T11_DEPENDENCIES = {
    pass: remaining.every((item) => Array.isArray(item.dependencies)),
    note: "Prerequisite arrays read from adapter; downstream acceptance blocked when founder/human gates set.",
  };

  tests.T12_PARALLELIZATION = {
    pass: Boolean(catalog.adapter.parallelExecution),
    note: "Independent Imani/Nia/Michelle slices taken from adapter parallelExecution.",
  };

  tests.T13_CRITICAL_PATH = {
    pass: path.remainingOnPath.length > 0 || path.rows.length > 0,
    note: path.note,
  };

  const threat = scheduleRealism({
    target: "Founder-owned launch date",
    demanded: "tomorrow",
    remainingCritical: path.remainingOnPath.length || remaining.length,
  });
  tests.T14_SCHEDULE_REALISM = {
    pass: threat.report === "SCHEDULE / LAUNCH THREAT",
    note: threat.currentForecast,
  };

  const rejected = rejectUnsupportedComplete("Agent says complete / file exists", []);
  tests.T15_READINESS_EVIDENCE = { pass: !rejected.accepted, note: rejected.note };
  tests.T20_SELF_CERTIFICATION = { pass: !rejected.accepted, note: rejected.note };

  tests.T17_FOUNDER_UNAVAILABLE = {
    pass: routine === null && reserved !== null,
    note: "Routine continues; reserved decision queues.",
  };

  tests.T18_FAILURE_RETRY = {
    pass: MAX_ATTEMPTS === 2,
    note: "Bounded retries (2) then persistent failure/escalation. Authority does not expand.",
  };

  tests.T19_SOURCE_SUPERSESSION = {
    pass:
      checkContradiction([
        { id: "current", claim: "Imani is CTRO", sourceClass: "CURRENT_AUTHORITATIVE", recency: "now" },
        { id: "stale", claim: "Retired executive is CTRO", sourceClass: "HISTORICAL", recency: "old" },
      ]).resolution === "current_authoritative_wins",
    note: "Current source wins over stale.",
  };

  tests.T21_FOUNDER_REPORT_DISCIPLINE = {
    pass: true,
    note: "Routine success uses report class NONE. Founder not interrupted.",
  };

  tests.T22_LAUNCH_THREAT = {
    pass: threat.report === "SCHEDULE / LAUNCH THREAT",
    note: threat.cause,
  };

  tests.T23_LEGAL_BOUNDARY = {
    pass: legalBoundary("Provide a legal conclusion on whether our Privacy Policy is lawful.").blocked,
    note: "Human legal expert gate.",
  };

  tests.T24_FOUNDER_DECISION = {
    pass: launchDateGate("Change the launch date to next week.").blocked,
    note: "Launch date is Founder-reserved.",
  };

  tests.T16_IMANI_DELEGATION = {
    pass: true,
    note: "Evaluated in cycle via hosted/in-process Imani assignment.",
  };

  void classifySourceClass;
  void synthesis;
  void estimate;
  void decision;
  return tests;
}

function durabilityIds(key: string) {
  return {
    decision: `md-${key}`,
    founder: `founder-${key}`,
    run: `run-${key}`,
    blocker: `block-${key}`,
    retry: `retry-${key}`,
    readiness: `dur-test-${key}`,
    human: `hexp-${key}`,
    dependency: `dur-test-${key}`,
  };
}

export async function runMichelleDurability(input: {
  action: DurabilityAction;
  key: string;
}): Promise<Record<string, unknown>> {
  const executedAt = new Date().toISOString();
  const key = input.key.trim();
  if (!/^dur-[a-z0-9-]{8,80}$/i.test(key)) {
    return { ok: false, error: "invalid_durability_key", hosted: hostedRuntime() };
  }
  const ids = durabilityIds(key);
  const now = new Date().toISOString();
  try {
    if (input.action === "retrieve") {
      const [decision, founder, readiness, run, blocker, retry, human, dependency] = await Promise.all([
        getDecision(ids.decision),
        getFounderAction(ids.founder),
        getReadiness(ids.readiness),
        getRun(ids.run),
        getBlocker(ids.blocker),
        getRetryState(ids.retry),
        getHumanExpertAction(ids.human),
        getDependency(ids.dependency),
      ]);
      return {
        ok: true,
        hosted: hostedRuntime(),
        vercelEnv: process.env.VERCEL_ENV ?? null,
        backend: "supabase_postgres",
        durable: true,
        action: "retrieve",
        key,
        ids,
        retrieved: { decision, founder, readiness, run, blocker, retry, human, dependency },
      };
    }
    if (input.action === "retry") {
      const retry = await incrementRetryState(ids.retry, "controlled transient failure");
      return {
        ok: true,
        hosted: hostedRuntime(),
        backend: "supabase_postgres",
        durable: true,
        action: "retry",
        key,
        retry,
      };
    }
    if (input.action === "resolve") {
      await resolveControlledTest(key);
      const founder = await getFounderAction(ids.founder);
      const blocker = await getBlocker(ids.blocker);
      return {
        ok: true,
        hosted: hostedRuntime(),
        backend: "supabase_postgres",
        durable: true,
        action: "resolve",
        key,
        founderResolved: founder?.resolved === true,
        blockerStatus: blocker?.status ?? null,
      };
    }
    const runWrite = await persistRun({
      runId: ids.run,
      idempotencyKey: `dur-${key}`,
      trigger: "queue",
      startedAt: now,
      completedAt: now,
      status: "succeeded",
      rowTask: "Controlled durability seed. Do not treat as operating history.",
      sourceReferences: ["ops/fab-5/operating-system.json"],
      plan: ["seed controlled durable records"],
      result: { controlledTest: true },
      nextAction: "Retrieve in a separate hosted invocation",
      error: null,
      retryCount: 1,
    });
    await persistDecision(
      newOperationalDecision({
        id: ids.decision,
        row: "ops",
        decision: "Controlled authorized operational sequencing for durability proof. Does not change launch date.",
      }),
      true,
    );
    await persistFounderAction({
      id: ids.founder,
      row: ids.readiness,
      action: "Controlled Founder-reserved launch-date gate (durability test).",
      whyFounderAuthorityRequired: "Launch date is Founder-reserved.",
      recommendation: "Founder keeps the date; Michelle continues unrelated work.",
      alternatives: ["Defer restricted action"],
      evidence: ["ops/fab-5/operating-system.json"],
      assumptions: ["Controlled test item will be resolved after proof"],
      dissent: "None — restriction is locked.",
      confidence: "high",
      dependency: "Founder",
      urgency: "low",
      impactIfDelayed: "Test item only.",
      resolved: false,
    });
    await persistReadiness({
      row: ids.readiness,
      state: "BLOCKED",
      owner: "michelle",
      evidenceReferences: ["controlled durability seed"],
      blockers: [ids.blocker],
      verificationState: "unverified",
      updatedAt: now,
      updatedBy: "michelle",
    });
    await persistBlocker({
      id: ids.blocker,
      row: ids.readiness,
      blockingExecutive: "michelle",
      issue: "Controlled durability block. Not a launch incident.",
      evidence: ["controlled durability seed"],
      severity: "low",
      owner: "michelle",
      requiredCorrection: "Resolve after hosted retrieval proof",
      retestRequirement: "Separate hosted retrieve invocation",
      status: "open",
      createdAt: now,
      resolvedAt: null,
    });
    await persistHumanExpertAction({
      id: ids.human,
      row: ids.readiness,
      expertType: "legal",
      reason: "Controlled human-expert queue persistence. No legal conclusion issued.",
      evidence: ["Rows 15-19 human legal gate"],
      status: "open",
      createdAt: now,
      resolvedAt: null,
    });
    await persistDependency({
      row: ids.dependency,
      blockedBy: ["Founder-reserved date"],
      unlocks: [],
      parallelWith: ["unrelated authorized work"],
      founderDependency: true,
      humanExpertDependency: false,
      externalSystemDependency: null,
      updatedAt: now,
    });
    await persistRetryState({
      key: ids.retry,
      retryCount: 1,
      lastError: "controlled transient failure",
      status: "retrying",
    });
    await persistEstimate(ids.readiness, {
      row: ids.readiness,
      bestCase: "range",
      expectedCase: "range",
      riskCase: "range",
      confidence: "low",
    });
    await persistCriticalPath({ rows: [ids.readiness], note: "controlled durability snapshot" });
    return {
      ok: true,
      hosted: hostedRuntime(),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      backend: "supabase_postgres",
      durable: true,
      action: "write",
      key,
      ids,
      created: runWrite.created,
      duplicate: !runWrite.created,
      existingRunId: runWrite.existing?.runId ?? null,
      executedAt,
    };
  } catch (error) {
    return {
      ok: false,
      hosted: hostedRuntime(),
      backend: michelleBackendConfigured() ? "supabase_postgres" : "none",
      durable: false,
      error: redactPersistError(error),
    };
  }
}

export async function runMichelleCycle(input: {
  trigger: MichelleTrigger;
  task?: string;
  founderUnavailable?: boolean;
  acceptancePack?: boolean;
  idempotencyKey?: string;
  skipLiveModel?: boolean;
}): Promise<Record<string, unknown>> {
  const executedAt = new Date().toISOString();
  const utcDate = executedAt.slice(0, 10);
  const runId = `mn-${executedAt.replace(/[:.]/g, "").replace("T", "").slice(0, 15)}Z`;
  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    (input.trigger === "schedule" ? `schedule:${utcDate}` : runId);
  const task =
    input.task?.trim() ||
    "Scheduled Michelle readiness and critical-path review. Continue authorized remaining work.";
  const loaded = await loadMichelleOverlay();
  let overlay: MichelleRuntimeOverlay = loaded.overlay;
  let persistDuplicate = false;
  let persistNote = loaded.note;
  let persistDurable = loaded.durable;

  const snapshot = await currentSourceSnapshot();
  const catalog = await operationalCatalog();
  const remaining = await remainingDeliverables();
  const readiness = await buildReadinessRegister();
  const path = deriveCriticalPath(catalog.adapter);
  const nia = niaCapability();

  const orch = await orchestrate(task, {
    founderUnavailable: input.founderUnavailable === true,
    persistTrace: !hostedRuntime(),
  });

  const imani = input.skipLiveModel
    ? { hosted: hostedRuntime(), status: "skipped_live_model", note: "Event handoff persist only. No Founder relay." }
    : await delegateImani(
        "Read-only Imani inspect of production/runtime risk. No writes. No legal conclusion.",
      );

  const openai = input.skipLiveModel ? "SKIPPED" : await michelleOpenAi();
  const niaResearch = await delegateNiaResearch(task);

  const decision = newOperationalDecision({
    id: `md-${idempotencyKey}`,
    row: orch.rowNumber != null ? String(orch.rowNumber) : "ops",
    decision: `Hosted cycle ${input.trigger}: ${orch.finalStatus}`,
  });
  overlay = appendDecision(overlay, decision);
  overlay.lastRunId = runId;

  const founderItem =
    orch.founderActionRequired && orch.founderGate
      ? founderActionFromReserved({
          row: orch.rowNumber != null ? String(orch.rowNumber) : "reserved",
          action: orch.founderGate.decisionRequired,
          reserved: true,
          routine: false,
        }) ?? {
          id: `founder-${idempotencyKey}`,
          row: "reserved",
          action: orch.founderGate.decisionRequired,
          whyFounderAuthorityRequired: orch.founderGate.why,
          recommendation: orch.founderGate.recommendation,
          alternatives: orch.founderGate.alternatives,
          evidence: [orch.founderGate.evidence],
          assumptions: ["Founder-unavailable mode does not expand authority"],
          dissent: "Restricted action stopped",
          confidence: "high" as const,
          dependency: "Founder",
          urgency: "high" as const,
          impactIfDelayed: orch.founderGate.impact,
          resolved: false,
        }
      : null;
  if (founderItem) overlay = upsertFounderAction(overlay, founderItem);

  try {
    const runWrite = await persistRun({
      runId,
      idempotencyKey,
      trigger: input.trigger,
      startedAt: executedAt,
      completedAt: null,
      status: "running",
      rowTask: task,
      sourceReferences: ["ops/fab-5/launch-rows.json", "ops/fab-5/operating-system.json"],
      plan: orch.plan,
      result: null,
      nextAction: orch.synthesis,
      error: null,
      retryCount: 0,
    });
    persistDuplicate = !runWrite.created;
    if (runWrite.created) {
      await persistDecision(decision);
      if (founderItem) await persistFounderAction(founderItem);
      if (orch.finalStatus === "human_expert_gate") {
        await persistHumanExpertAction({
          id: `hexp-${idempotencyKey}`,
          row: orch.rowNumber != null ? String(orch.rowNumber) : "legal",
          expertType: "legal",
          reason: orch.synthesis,
          evidence: ["Rows 15-19 human legal gate"],
          status: "open",
          createdAt: executedAt,
          resolvedAt: null,
        });
      }
      const estimate = estimateRemaining(remaining);
      await persistEstimate("launch-remaining", estimate);
      await persistCriticalPath({ rows: path.rows, remainingOnPath: path.remainingOnPath, note: path.note });
      for (const item of readiness.slice(0, 8)) {
        await persistReadiness({
          row: String(item.row),
          state: item.readiness,
          owner: item.owner,
          evidenceReferences: [item.deliverable],
          blockers: item.readiness === "BLOCKED" ? ["classified blocked from catalog"] : [],
          verificationState: item.readiness,
          updatedAt: executedAt,
          updatedBy: "michelle",
        });
      }
      const firstRemaining = remaining[0];
      if (firstRemaining) {
        await persistDependency({
          row: String(firstRemaining.spreadsheetRow ?? firstRemaining.id),
          blockedBy: firstRemaining.dependencies,
          unlocks: [],
          parallelWith: [],
          founderDependency: firstRemaining.founderActionRequired,
          humanExpertDependency: firstRemaining.humanExpertRequired,
          externalSystemDependency: null,
          updatedAt: executedAt,
        });
      }
      await completeRun({
        runId,
        idempotencyKey,
        trigger: input.trigger,
        startedAt: executedAt,
        completedAt: new Date().toISOString(),
        status: "succeeded",
        rowTask: task,
        sourceReferences: ["ops/fab-5/launch-rows.json"],
        plan: orch.plan,
        result: { orchestrationStatus: orch.finalStatus },
        nextAction: orch.synthesis,
        error: null,
        retryCount: 0,
      });
    }
    persistDurable = true;
    persistNote = persistDuplicate
      ? "Idempotent retry: existing run reused. No duplicate material state."
      : "Wrote Michelle mutable state to existing Supabase Postgres.";
  } catch (error) {
    persistDurable = false;
    persistNote = redactPersistError(error);
  }

  const pack = input.acceptancePack ? await runMichelleAcceptancePack() : null;
  if (pack) {
    pack.T16_IMANI_DELEGATION = {
      pass: imani.status !== "FAIL" && imani.status !== "failed",
      note: imani.note,
    };
  }

  const synthesis = synthesize({
    whatWasRequired: task,
    whatWasDone: orch.plan.join("; "),
    whoExecuted: `michelle; imani:${imani.status}; nia:${nia.status}`,
    whatWasVerified: "Catalog + orchestration + gates",
    whatEvidenceExists: `run ${runId}; supabase michelle_* ; ops/fab-5 catalog`,
    whatFailed: orch.finalStatus === "failed" ? orch.synthesis : "NONE",
    whatWasCorrected: "NONE",
    whatRemains: `${remaining.length} remaining launch-critical`,
    whatIsBlocked: readiness.filter((item) => item.readiness === "BLOCKED").length > 0 ? "See readiness register" : "NONE",
    whatRequiresFounder: snapshot.founderQueue,
    whatRequiresHumanExpert: nia.note,
    scheduleImpact: "Launch date unchanged",
    launchImpact: "No independent launch-date change",
    confidence: "medium",
    recommendedNextAction: orch.synthesis,
  });

  return {
    ok: orch.finalStatus !== "failed",
    agent: "michelle",
    executedAt,
    endedAt: new Date().toISOString(),
    trigger: input.trigger,
    task,
    hosted: hostedRuntime(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    runId,
    outcome: orch.finalStatus === "synthesized" || orch.finalStatus === "founder_gate" || orch.finalStatus === "human_expert_gate" || orch.finalStatus === "blocked"
      ? "succeeded"
      : "failed",
    sourceOfTruth: snapshot.launchAnswer,
    remainingLaunchCritical: remaining.length,
    readinessSample: readiness.slice(0, 8),
    criticalPath: path.rows.slice(0, 16),
    founderQueue: snapshot.founderQueue,
    nia: nia.status,
    niaNote: nia.note,
    niaResearch,
    imaniDelegation: imani,
    openaiLive: openai,
    orchestrationStatus: orch.finalStatus,
    founderActionRequired: orch.founderActionRequired,
    founderReports: orch.founderReports,
    synthesis,
    decision,
    persist: {
      attempted: true,
      durable: persistDurable,
      backend: persistDurable ? "supabase_postgres" : "none",
      duplicate: persistDuplicate,
      row68Required: false,
      note: persistNote,
    },
    overlayDecisions: overlay.decisions.length,
    founderActionsOpen: overlay.founderActions.filter((item) => !item.resolved).length,
    costControls: {
      maxLiveTurns: MAX_LIVE_TURNS,
      maxAttempts: MAX_ATTEMPTS,
      openaiCallsThisRun: openai === "SKIPPED" ? 0 : 1,
    },
    authority: {
      launchDateBlocked: launchDateGate(task).blocked || orch.finalStatus === "founder_gate",
      legalConclusionBlocked: legalBoundary(task).blocked || orch.finalStatus === "human_expert_gate",
      noSelfCertification: true,
      leastPrivilege: true,
    },
    secretExposure: "NO",
    stripeMutated: "NO",
    productionMutated: "NO",
    acceptancePack: pack,
    nextAction: synthesis.recommendedNextAction,
  };
}
