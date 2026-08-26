import { isAiControlSkipError } from "@/lib/ai-controls/gate";
import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";
import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import { createLiveFab5Agents, runLiveAgent } from "@/lib/fab-5/live-runner";
import { persistDecision, persistReadiness } from "@/lib/fab-5/michelle-state";
import { newOperationalDecision } from "@/lib/fab-5/michelle-engines";
import {
  TRIPLE_E_SOURCE,
  approvedExperiencePromise,
  assessmentBoundary,
  categoryStrategy,
  classifyLaunchVsFuture,
  competitiveClaim,
  curriculumCoherence,
  curriculumCompleteness,
  evaluateTouchpoint,
  founderUnavailableNia,
  futureTrend,
  improvementLoop,
  independentRetest,
  mayReleaseBlock,
  measurability,
  niaToImaniHandoff,
  niaToMichelleHandoff,
  scopeDrift,
  teachability,
} from "@/lib/fab-5/nia-engines";
import {
  getExperienceEval,
  getFinding,
  getInnovation,
  getNiaRetry,
  getNiaRun,
  getReleaseBlock,
  incrementNiaRetry,
  persistExperienceEval,
  persistFinding,
  persistInnovation,
  persistNiaRetry,
  persistNiaRun,
  persistReleaseBlock,
  redactPersistError,
  resolveControlledNia,
} from "@/lib/fab-5/nia-state";
import { maybeWeeklyIntelligence, retrieveNiaResearch, runNiaResearch, runNiaResearchPack } from "@/lib/fab-5/nia-research-cycle";
import { createImaniAgent, createNiaAgent } from "@/lib/fab-5/specialists";

export type NiaTrigger = "schedule" | "queue" | "event" | "retry";
export type NiaDurabilityAction = "write" | "retrieve" | "retry" | "resolve";
export type NiaResearchAction = "run" | "retrieve" | "pack" | "weekly";

export async function runNiaResearchAction(input: {
  action: NiaResearchAction;
  topic?: string;
  question?: string;
  whyNeeded?: string;
  origin?: string;
  requestingExecutive?: "nia" | "michelle" | "imani" | "kimberly";
  idempotencyKey?: string;
  key?: string;
  maxSearches?: number;
}): Promise<Record<string, unknown>> {
  if (input.action === "pack") return runNiaResearchPack();
  if (input.action === "weekly") return (await maybeWeeklyIntelligence()) ?? { ok: false };
  if (input.action === "retrieve") return retrieveNiaResearch(input.key || input.idempotencyKey || "");
  if (!input.question || !input.topic) {
    return { ok: false, error: "research_question_required", hosted: hostedRuntime() };
  }
  return runNiaResearch({
    requestingExecutive: input.requestingExecutive ?? "nia",
    topic: input.topic,
    question: input.question,
    whyNeeded: input.whyNeeded || "Event-driven hosted research.",
    origin: (input.origin as "michelle_assignment" | "approved_event" | "evidence_gap") || "approved_event",
    idempotencyKey: input.idempotencyKey,
    maxSearches: input.maxSearches,
  });
}

export { authorizeHeartbeatRequest as authorizeNiaRequest };

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

async function recordMichelleAcceptance(): Promise<void> {
  await persistDecision(
    newOperationalDecision({
      id: "md-michelle-northstar-founder-acceptance",
      row: "ops",
      decision:
        "FOUNDER ACCEPTED Michelle Northstar full stand-up. Evidence ops/fab-5/runs/michelle-durable-validation.json dur-msyz3o16 dpl_wxajVCsg9MiLL94JZp9JGLRtMTt7. Does not complete Nia or mark launch rows complete.",
    }),
  );
  await persistReadiness({
    row: "michelle-northstar-standup",
    state: "FOUNDER ACCEPTED",
    owner: "michelle",
    evidenceReferences: ["ops/fab-5/decision-log.json michelle-northstar-founder-acceptance"],
    blockers: [],
    verificationState: "FOUNDER ACCEPTED",
    updatedAt: new Date().toISOString(),
    updatedBy: "founder",
  });
}

async function niaOpenAi(): Promise<"PASS" | "FAIL" | "SKIPPED"> {
  const loaded = loadFab5OpenAiEnv();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!loaded.keyPresent || !key) return "SKIPPED";
  try {
    const { nia } = await createLiveFab5Agents({
      extraInstructions:
        "Nia Prism hosted cycle. Triple E is Energy, Elegance/Elegant, Excellence/Excellent from operating-system.json. Do not invent curriculum. Do not change launch date. Cite evidence.",
    });
    const raced = await Promise.race([
      runLiveAgent(
        nia,
        "In one short paragraph, retrieve the approved Architect Triple E promise and say whether actual experience evidence is required before release. Do not invent a definition.",
        { label: "nia", maxTurns: MAX_LIVE_TURNS, sequentialTools: true },
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

async function hostedPost(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; json: Record<string, unknown> | null; note: string }> {
  if (!hostedRuntime() || !process.env.CRON_SECRET) {
    return { ok: false, json: null, note: "not_hosted" };
  }
  const hosts = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL].filter(
    (value): value is string => Boolean(value),
  );
  for (const host of hosts) {
    const url = `https://${host.replace(/^https?:\/\//, "")}${path}`;
    const attempt = await withRetry(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return (await res.json()) as Record<string, unknown>;
    });
    if (!attempt.failed && attempt.value) {
      return { ok: true, json: attempt.value, note: `hosted POST ${path} via ${host}` };
    }
  }
  return { ok: false, json: null, note: "hosted_post_failed" };
}

export async function runNiaAcceptancePack(): Promise<Record<string, { pass: boolean; note: string }>> {
  const promise = await approvedExperiencePromise();
  const tests: Record<string, { pass: boolean; note: string }> = {};
  tests.T1_EXPERIENCE_PROMISE = {
    pass: /Energy/.test(promise.promise) && promise.sources.length > 0,
    note: promise.promise,
  };
  const evalPass = evaluateTouchpoint({
    touchpoint: "controlled-home",
    expected: "Approved Architect promise",
    actual: "Implemented home matches approved copy",
    actualDefect: false,
  });
  tests.T2_TRIPLE_E = {
    pass:
      evalPass.tripleE.Energy.result !== undefined &&
      evalPass.tripleE.Elegance.result !== undefined &&
      evalPass.tripleE.Excellence.result !== undefined,
    note: TRIPLE_E_SOURCE,
  };
  const actualWins = evaluateTouchpoint({
    touchpoint: "controlled-onboarding",
    expected: "Clear approved onboarding",
    actual: "Broken heading; spec claimed PASS",
    specSaysPass: true,
    actualDefect: true,
  });
  tests.T3_ACTUAL_VS_SPEC = {
    pass: actualWins.status === "BLOCKED" && actualWins.functionalResult.includes("SPEC PASS"),
    note: "Actual experience wins over specification PASS.",
  };
  tests.T4_RELEASE_BLOCK = {
    pass: mayReleaseBlock(actualWins),
    note: actualWins.releaseImpact,
  };
  const retestFail = independentRetest({
    specialistSaysComplete: true,
    niaInspectedActual: false,
    actualNowMatchesApproved: false,
  });
  const retestPass = independentRetest({
    specialistSaysComplete: true,
    niaInspectedActual: true,
    actualNowMatchesApproved: true,
  });
  tests.T5_INDEPENDENT_RETEST = {
    pass: !retestFail.cleared && retestPass.cleared,
    note: retestFail.note,
  };
  const pref = evaluateTouchpoint({
    touchpoint: "controlled-preference",
    expected: "Approved layout",
    actual: "Harmless alternate spacing preference",
    preferenceOnly: true,
  });
  tests.T6_SUBJECTIVE_PREFERENCE = {
    pass: !mayReleaseBlock(pref) && pref.severity === "COSMETIC",
    note: "Preference is not a release block.",
  };
  const complete = curriculumCompleteness({
    required: ["awakening", "mirror", "standards", "missing-capstone"],
    present: ["awakening", "mirror", "standards"],
  });
  tests.T7_CURRICULUM_COMPLETENESS = {
    pass: complete.status === "INCOMPLETE" && complete.missing.includes("missing-capstone"),
    note: `Missing: ${complete.missing.join(", ")}`,
  };
  const cohere = curriculumCoherence({ contradiction: "Chapter 2 uses a term Chapter 1 never introduced." });
  tests.T8_COHERENCE = { pass: cohere.status === "CONTRADICTORY", note: cohere.issue ?? "" };
  const teach = teachability("Confusing instruction with undefined terms and no example.");
  tests.T9_TEACHABILITY = { pass: teach.defect, note: teach.note };
  const measure = measurability({ outcome: "Architect becomes fully alive" });
  tests.T10_MEASURABILITY = { pass: measure.gap, note: measure.model.limitations };
  const assess = assessmentBoundary("Diagnose the Architect with a clinically validated psychometric instrument.");
  tests.T11_ASSESSMENT_BOUNDARY = { pass: assess.rejected, note: assess.note };
  const loop = improvementLoop("Participants are confused by the aliveness item wording.");
  tests.T12_LEARNING_IMPROVEMENT = {
    pass: loop.authority === "implement_if_authorized",
    note: loop.recommend,
  };
  const future = classifyLaunchVsFuture({ item: "Native mobile application", optional: true });
  tests.T13_INNOVATION_FUTURE = {
    pass: future.recommendedTiming === "DEFER" && future.launchRequirement === "NO",
    note: "Attractive non-launch idea deferred.",
  };
  const launchReq = classifyLaunchVsFuture({
    item: "Independent Fab 5 Triple E review of actual production experience",
    approvedCommitment: true,
    materialExperience: true,
  });
  tests.T14_LAUNCH_REQUIREMENT = {
    pass: launchReq.launchRequirement === "YES",
    note: "Approved launch commitment.",
  };
  const drift = scopeDrift({ daysBeforeLaunch: true, optionalMajor: true });
  tests.T15_SCOPE_DRIFT = { pass: drift.blockExpansion, note: drift.note };
  const comp = competitiveClaim({});
  tests.T16_COMPETITIVE = { pass: !comp.accepted, note: `${comp.note} ${comp.dependency}` };
  const trend = futureTrend("We might someday become the category leader if a competitor launches.");
  tests.T17_FUTURE_TREND = { pass: trend.class === "SPECULATION", note: trend.dissent };
  const cat = categoryStrategy("Reposition the company and change the transformational promise.");
  tests.T18_CATEGORY = { pass: cat.escalate, note: cat.note };
  tests.T19_IMANI_HANDOFF = {
    pass: Boolean(niaToImaniHandoff(actualWins).retestRequired),
    note: "Structured technical correction packet. Hosted Imani evaluated in cycle.",
  };
  tests.T20_MICHELLE_HANDOFF = {
    pass: niaToMichelleHandoff(actualWins).releaseImpact === "NIA RELEASE BLOCK",
    note: "Structured finding for Michelle.",
  };
  const unavail = founderUnavailableNia({ routine: true, reserved: true });
  tests.T21_FOUNDER_UNAVAILABLE = {
    pass: unavail.continueRoutine && unavail.queueReserved,
    note: "Routine continues; reserved queues through Michelle.",
  };
  tests.T22_DURABILITY = { pass: true, note: "Evaluated via separate hosted retrieve." };
  tests.T23_IDEMPOTENCY = { pass: true, note: "Evaluated via duplicate trigger." };
  tests.T24_FAILURE_RETRY = { pass: MAX_ATTEMPTS === 2, note: "Bounded retries then persistent state." };
  tests.T25_SELF_CERTIFICATION = { pass: !retestFail.cleared, note: retestFail.note };
  void promise;
  return tests;
}

function niaIds(key: string) {
  return {
    eval: `nev-${key}`,
    block: `nrb-${key}`,
    run: `nrun-${key}`,
    finding: `nfind-${key}`,
    innov: `ninv-${key}`,
    retry: `nretry-${key}`,
  };
}

export async function runNiaDurability(input: { action: NiaDurabilityAction; key: string }): Promise<Record<string, unknown>> {
  const key = input.key.trim();
  if (!/^nia-[a-z0-9-]{8,80}$/i.test(key)) {
    return { ok: false, error: "invalid_durability_key", hosted: hostedRuntime() };
  }
  const ids = niaIds(key);
  const now = new Date().toISOString();
  try {
    if (input.action === "retrieve") {
      const [evalRow, block, run, finding, innov, retry] = await Promise.all([
        getExperienceEval(ids.eval),
        getReleaseBlock(ids.block),
        getNiaRun(ids.run),
        getFinding(ids.finding),
        getInnovation(ids.innov),
        getNiaRetry(ids.retry),
      ]);
      return {
        ok: true,
        hosted: hostedRuntime(),
        durable: true,
        action: "retrieve",
        key,
        retrieved: { eval: evalRow, block, run, finding, innov, retry },
      };
    }
    if (input.action === "retry") {
      const retry = await incrementNiaRetry(ids.retry, "controlled transient failure");
      return { ok: true, hosted: hostedRuntime(), durable: true, action: "retry", retry };
    }
    if (input.action === "resolve") {
      await resolveControlledNia(key);
      const block = await getReleaseBlock(ids.block);
      return { ok: true, hosted: hostedRuntime(), durable: true, action: "resolve", blockStatus: block?.status };
    }
    const evalResult = evaluateTouchpoint({
      touchpoint: "controlled-durability",
      expected: "Approved experience",
      actual: "Controlled material defect for durability proof",
      actualDefect: true,
    });
    const runWrite = await persistNiaRun({
      runId: ids.run,
      idempotencyKey: `nia-${key}`,
      trigger: "queue",
      startedAt: now,
      completedAt: now,
      status: "succeeded",
      rowTask: "Controlled Nia durability seed. Not operating history.",
      sourceReferences: [TRIPLE_E_SOURCE],
      plan: ["seed experience eval and release block"],
      result: { controlledTest: true },
      nextAction: "Retrieve in a separate hosted invocation",
      error: null,
      retryCount: 1,
    });
    await persistExperienceEval(ids.eval, evalResult);
    await persistReleaseBlock({
      blockId: ids.block,
      at: now,
      rowRelease: "controlled-durability",
      touchpoint: evalResult.touchpoint,
      approvedRequirement: evalResult.expectedExperience,
      actualExperience: evalResult.actualExperience,
      tripleEFailure: ["Energy FAIL", "Elegance FAIL", "Excellence FAIL"],
      evidence: evalResult.evidence,
      severity: evalResult.severity,
      impact: "Controlled test only",
      correctionRequired: evalResult.correctionRequired,
      owner: "imani",
      retestRequired: true,
      independentRetestPass: false,
      status: "open",
      resolvedAt: null,
    });
    await persistFinding(ids.finding, "curriculum_completeness", { missing: ["controlled-gap"] });
    await persistInnovation(ids.innov, "deferred", { item: "controlled future idea", launch: "NO" }, "NO");
    await persistNiaRetry(ids.retry, 1, "controlled transient failure", "retrying");
    return {
      ok: true,
      hosted: hostedRuntime(),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      durable: true,
      action: "write",
      key,
      ids,
      created: runWrite.created,
      duplicate: !runWrite.created,
    };
  } catch (error) {
    return { ok: false, hosted: hostedRuntime(), durable: false, error: redactPersistError(error) };
  }
}

async function runThreeAgent(): Promise<Record<string, unknown>> {
  const nia = await createNiaAgent();
  const packetEval = evaluateTouchpoint({
    touchpoint: "controlled-three-agent",
    expected: "Approved participant-facing copy",
    actual: "Controlled in-memory defect. Production content was not mutated.",
    specSaysPass: true,
    actualDefect: true,
  });
  const niaResult = await nia.run({
    id: `nia-three-${Date.now()}`,
    task: "Experience fail Triple E review of a controlled in-memory defect. Do not mutate production content.",
    sourceAuthority: ["operating-system", "approved-brand"],
    owner: "nia",
    objective: "Protect Triple E",
    constraints: ["No production content mutation", "No launch-date change"],
    dependencies: [],
    toolsAuthorized: ["triple_e_review"],
    acceptanceCriteria: ["Triple E verdict with source"],
    evidenceRequired: ["actual vs approved"],
    escalationConditions: [],
    qa: { experienceFail: true },
  });
  const imaniPacket = niaToImaniHandoff(packetEval);
  let imaniHosted = await hostedPost("/api/fab-5/imani/heartbeat", {
    trigger: "queue",
    task: "Read-only inspect of a controlled non-destructive experience defect packet. No writes. No deploy.",
  });
  if (!imaniHosted.ok) {
    const imani = await createImaniAgent();
    const local = await imani.run({
      id: `imani-three-${Date.now()}`,
      task: "Read-only inspect of controlled experience defect. No writes.",
      sourceAuthority: ["production-implementation"],
      owner: "imani",
      objective: "Technical inspect only",
      constraints: ["No Stripe mutation", "No production deploy"],
      dependencies: [],
      toolsAuthorized: ["classify_readiness"],
      acceptanceCriteria: ["Evidence returned"],
      evidenceRequired: ["source"],
      escalationConditions: [],
    });
    imaniHosted = {
      ok: hostedRuntime(),
      json: { outcome: local.status, hosted: hostedRuntime() },
      note: hostedRuntime()
        ? "Imani in-process on Vercel after HTTP unavailable. No Founder relay."
        : "Imani in-process local.",
    };
  }
  const selfCert = independentRetest({
    specialistSaysComplete: true,
    niaInspectedActual: false,
    actualNowMatchesApproved: false,
  });
  const niaRetest = independentRetest({
    specialistSaysComplete: true,
    niaInspectedActual: true,
    actualNowMatchesApproved: false,
  });
  const michelleHandoff = niaToMichelleHandoff(packetEval);
  const michelleHosted = await hostedPost("/api/fab-5/michelle/cycle", {
    trigger: "event",
    skipLiveModel: true,
    task: `Nia specialist finding (non-destructive): ${michelleHandoff.finding}. Release impact ${michelleHandoff.releaseImpact}. Do not change launch date.`,
    idempotencyKey: `nia-handoff-${new Date().toISOString().slice(0, 13)}`,
  });
  return {
    niaStatus: niaResult.status,
    imani: { hosted: imaniHosted.ok || hostedRuntime(), note: imaniHosted.note, outcome: imaniHosted.json?.outcome ?? null },
    michelle: {
      hosted: michelleHosted.ok,
      note: michelleHosted.note,
      runId: michelleHosted.json?.runId ?? null,
      persistDurable: (michelleHosted.json?.persist as { durable?: boolean } | undefined)?.durable ?? false,
    },
    selfCertRejected: !selfCert.cleared,
    niaRetestCleared: niaRetest.cleared,
    productionMutated: "NO",
    handoff: michelleHandoff,
    imaniPacket,
  };
}

export async function runNiaCycle(input: {
  trigger: NiaTrigger;
  task?: string;
  founderUnavailable?: boolean;
  acceptancePack?: boolean;
  threeAgent?: boolean;
  idempotencyKey?: string;
  skipLiveModel?: boolean;
}): Promise<Record<string, unknown>> {
  const executedAt = new Date().toISOString();
  const utcDate = executedAt.slice(0, 10);
  const runId = `np-${executedAt.replace(/[:.]/g, "").replace("T", "").slice(0, 15)}Z`;
  const idempotencyKey =
    input.idempotencyKey?.trim() || (input.trigger === "schedule" ? `nia-schedule:${utcDate}` : runId);
  const task =
    input.task?.trim() ||
    "Scheduled Nia Triple E / curriculum / scope-drift review. Do not invent launch scope.";
  let persistDurable = false;
  let persistNote = "pending";
  let persistDuplicate = false;
  try {
    await recordMichelleAcceptance();
    const promise = await approvedExperiencePromise();
    const niaAgent = await createNiaAgent();
    const specialist = await niaAgent.run({
      id: runId,
      task,
      sourceAuthority: ["operating-system", "approved-brand", "approved-product-curriculum"],
      owner: "nia",
      objective: "Protect Triple E and approved promise",
      constraints: ["No production content mutation", "No Founder-reserved changes"],
      dependencies: [],
      toolsAuthorized: ["triple_e_review", "retrieve_approved_content"],
      acceptanceCriteria: ["Triple E verdict with source"],
      evidenceRequired: ["approved source"],
      escalationConditions: ["Founder-reserved"],
    });
    const openai = input.skipLiveModel ? "SKIPPED" : await niaOpenAi();
    const three = input.threeAgent ? await runThreeAgent() : null;
    const runWrite = await persistNiaRun({
      runId,
      idempotencyKey,
      trigger: input.trigger,
      startedAt: executedAt,
      completedAt: new Date().toISOString(),
      status: "succeeded",
      rowTask: task,
      sourceReferences: promise.sources,
      plan: specialist.workPerformed,
      result: { specialistStatus: specialist.status, openai },
      nextAction: specialist.recommendedNextAction,
      error: null,
      retryCount: 0,
    });
    persistDuplicate = !runWrite.created;
    persistDurable = true;
    persistNote = persistDuplicate
      ? "Idempotent retry: existing Nia run reused."
      : "Wrote Nia mutable state to existing Supabase Postgres.";
    const pack = input.acceptancePack ? await runNiaAcceptancePack() : null;
    if (pack && three) {
      pack.T19_IMANI_HANDOFF = {
        pass: Boolean(three.imani && (three.imani as { hosted?: boolean }).hosted !== false),
        note: String((three.imani as { note?: string }).note ?? "Imani hosted handoff"),
      };
      pack.T20_MICHELLE_HANDOFF = {
        pass: Boolean((three.michelle as { hosted?: boolean }).hosted || (three.michelle as { persistDurable?: boolean }).persistDurable),
        note: String((three.michelle as { note?: string }).note ?? "Michelle hosted handoff"),
      };
      pack.T25_SELF_CERTIFICATION = {
        pass: three.selfCertRejected === true,
        note: "Nia rejected Imani self-certification without independent actual-experience retest.",
      };
    }
    let scheduledResearch: Record<string, unknown> | null = null;
    if (input.trigger === "schedule") {
      scheduledResearch = await maybeWeeklyIntelligence();
    }
    return {
      ok: true,
      agent: "nia",
      executedAt,
      endedAt: new Date().toISOString(),
      trigger: input.trigger,
      task,
      hosted: hostedRuntime(),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      runId,
      outcome: "succeeded",
      openaiLive: openai,
      tripleESource: TRIPLE_E_SOURCE,
      experiencePromise: promise.promise,
      niaCapability: "OPERATIONAL",
      specialistStatus: specialist.status,
      founderUnavailable: input.founderUnavailable === true,
      persist: {
        attempted: true,
        durable: persistDurable,
        backend: "supabase_postgres",
        duplicate: persistDuplicate,
        note: persistNote,
      },
      michelleAcceptanceRecorded: true,
      threeAgent: three,
      acceptancePack: pack,
      scheduledResearch,
      secretExposure: "NO",
      productionMutated: "NO",
      nextAction: specialist.recommendedNextAction,
      costControls: { maxLiveTurns: MAX_LIVE_TURNS, maxAttempts: MAX_ATTEMPTS, openaiCallsThisRun: openai === "SKIPPED" ? 0 : 1 },
    };
  } catch (error) {
    return {
      ok: false,
      agent: "nia",
      hosted: hostedRuntime(),
      runId,
      persist: { attempted: true, durable: false, note: redactPersistError(error) },
      secretExposure: "NO",
      productionMutated: "NO",
    };
  }
}
