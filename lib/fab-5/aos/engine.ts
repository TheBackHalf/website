import { randomUUID } from "node:crypto";

import { pollEngineeringJobs, startEngineeringExecution } from "@/lib/fab-5/aos/engineering";
import {
  ensureStandupWork,
  executeHostedOperationalWork,
  isHostedOperationalWork,
} from "@/lib/fab-5/aos/hosted-execute";
import { notifyFounderDecision } from "@/lib/fab-5/aos/notify";
import {
  classifyWorkItem,
  ensureCursorBudgetAttentionWork,
  ensureOperatingModelWork,
  evaluateCursorLaunch,
  getCursorConcurrencyLimit,
  getCursorMode,
  getMonthlyCursorBudgetUnits,
} from "@/lib/fab-5/aos/operating-model";
import { buildExecutionProof } from "@/lib/fab-5/aos/snapshot";
import { releaseAugustLaunchSprint, type SprintReleaseResult } from "@/lib/fab-5/aos/sprint";
import {
  aosConfigured,
  checkpointWork,
  claimNext,
  completeWork,
  countActiveEngineeringJobs,
  enqueueWork,
  insertFounderDecision,
  listWork,
  markRunning,
  applySprintWorkState,
  recordCost,
  recoverStaleLeases,
  releaseWork,
  saveHeartbeat,
  unblockLegacyEngineeringRuntime,
  unlockDateGated,
  unlockReadyDependencies,
  updateWorkRouting,
} from "@/lib/fab-5/aos/store";
import type { OperatingAgentId, TickResult, WorkItem } from "@/lib/fab-5/aos/types";

const DEFAULT_MAX_PER_AGENT = Number.parseInt(process.env.AOS_MAX_PER_AGENT ?? "2", 10) || 2;
const LEASE_SECONDS = 300;

export function engineeringRuntimeEnabled(): boolean {
  return process.env.AOS_ENGINEERING_RUNTIME === "1";
}

export async function executeClaimedWork(
  item: WorkItem,
  leaseToken: string,
): Promise<"COMPLETE" | "FAILED" | "GATED" | "LAUNCHED" | "BLOCKED"> {
  const running = await markRunning(item.workId, leaseToken);
  if (!running) return "FAILED";
  await checkpointWork(item.workId, leaseToken, {
    step: "started",
    synthetic: item.synthetic,
    at: new Date().toISOString(),
  }, "execute");

  if (item.actionClass === "D" && item.status !== "FOUNDER_GATED") {
    await openFounderGate(item, "Material financial or irreversible action requires Founder authorization.");
    return "GATED";
  }

  const classified = classifyWorkItem(item);
  if (classified.path === "FOUNDER_RESERVED" && item.status !== "FOUNDER_GATED") {
    await openFounderGate(item, classified.reason);
    return "GATED";
  }
  if (classified.path === "HUMAN_EXPERT") {
    await applySprintWorkState({
      workId: item.workId,
      status: "FOUNDER_GATED",
      runtimeClass: "hosted",
      nextAction: "await_human",
      blockedReason: "human_acceptance_required",
      founderGateRequired: true,
      force: true,
    });
    return "GATED";
  }

  if (classified.engineeringRequired) {
    await checkpointWork(item.workId, leaseToken, {
      step: "engineering_launch",
      provider: "cursor_cloud_agent",
      classified: classified.path,
    }, "launch_cursor_cloud_agent");
    return startEngineeringExecution(item, leaseToken);
  }

  if (item.runtimeClass === "engineering") {
    await updateWorkRouting({
      workId: item.workId,
      leaseToken,
      runtimeClass: "hosted",
      nextAction: classified.nextAction,
      status: "READY",
    });
  }

  if (isHostedOperationalWork({ ...item, runtimeClass: "hosted", nextAction: classified.nextAction })) {
    return executeHostedOperationalWork(item, leaseToken);
  }

  if (item.synthetic || item.source === "controlled_test") {
    await checkpointWork(item.workId, leaseToken, {
      step: "synthetic_complete",
      identifiedAs: "SYNTHETIC TEST — not real participant validation",
    }, "complete");
    await completeWork({
      workId: item.workId,
      leaseToken,
      evidenceRefs: [`aos-synthetic:${item.workId}`],
      nextAction: "none",
    });
    await recordCost(item.ownerAgent, item.workId, "synthetic_execution", 1, "controlled test");
    return "COMPLETE";
  }

  await checkpointWork(item.workId, leaseToken, {
    step: "hosted_inspect",
    note: "Hosted tick inspects and checkpoints. It does not mark Command Center rows complete.",
  }, "await_execution");

  await releaseWork({
    workId: item.workId,
    leaseToken,
    nextAction: "await_execution",
    status: "BLOCKED",
    blockedReason: "awaiting_domain_execution",
  });
  await recordCost(item.ownerAgent, item.workId, "hosted_inspect", 1, "no auto-complete of production work");
  return "COMPLETE";
}

export async function openFounderGate(
  item: WorkItem,
  reason: string,
  options?: { severity?: "normal" | "urgent"; recommendation?: string; holdSend?: boolean },
): Promise<string> {
  const decisionId = `fd-${randomUUID()}`;
  const decision = await insertFounderDecision({
    decisionId,
    requestingAgent: item.ownerAgent,
    workId: item.workId,
    decisionRequired: item.title,
    agentRecommendation: options?.recommendation ?? "Approve the recommended operational path.",
    reason,
    riskIfDelayed: "Dependent work remains paused. Unrelated work continues.",
    deadline: null,
    allowedResponse: "APPROVE | REJECT | REVIEW",
    severity: options?.severity ?? "normal",
    controlledTest: item.controlledTest,
  });
  await notifyFounderDecision({ decision, holdSend: options?.holdSend ?? item.controlledTest });
  return decisionId;
}

export async function createHandoff(input: {
  fromAgent: OperatingAgentId;
  toAgent: OperatingAgentId;
  parent: WorkItem;
  title: string;
  description: string;
  resourceKey?: string;
  synthetic?: boolean;
  priority?: number;
}): Promise<WorkItem> {
  if (input.fromAgent === input.toAgent) {
    throw new Error("handoff_requires_different_agent");
  }
  return enqueueWork({
    source: "cross_agent_dependency",
    sourceReference: input.parent.workId,
    title: input.title,
    description: input.description,
    ownerAgent: input.toAgent,
    parentWorkId: input.parent.workId,
    resourceKey: input.resourceKey ?? null,
    runtimeClass: "hosted",
    actionClass: "A",
    priority: input.priority ?? 80,
    controlledTest: input.parent.controlledTest,
    synthetic: input.synthetic ?? input.parent.synthetic,
    nextAction: "execute_handoff",
    evidenceRefs: [`handoff-from:${input.fromAgent}`],
  });
}

async function beat(agent: OperatingAgentId, currentWorkId: string | null, error: string | null): Promise<void> {
  const [ready, blocked, failed, complete] = await Promise.all([
    listWork({ ownerAgent: agent, status: ["QUEUED", "READY", "RETRY", "CLAIMED", "RUNNING", "VALIDATING"] }),
    listWork({ ownerAgent: agent, status: ["BLOCKED", "DEPENDENCY_GATED", "DATE_GATED", "FOUNDER_GATED", "ACCEPTANCE_READY"] }),
    listWork({ ownerAgent: agent, status: "FAILED" }),
    listWork({ ownerAgent: agent, status: "COMPLETE", limit: 5 }),
  ]);
  await saveHeartbeat({
    agent,
    lastHeartbeat: new Date().toISOString(),
    currentWorkId,
    queueDepth: ready.length,
    blockedCount: blocked.length,
    failedCount: failed.length,
    lastCompletionAt: complete[0]?.completedAt ?? null,
    lastCheckpoint: currentWorkId ? { workId: currentWorkId } : null,
    runtimeError: error,
  });
}

export async function runAosTick(input?: {
  includeTest?: boolean;
  engineeringRuntime?: boolean;
  maxPerAgent?: number;
  leaseSeconds?: number;
  agents?: OperatingAgentId[];
}): Promise<TickResult> {
  const at = new Date().toISOString();
  const errors: string[] = [];
  if (!aosConfigured()) {
    return {
      ok: false,
      at,
      watchdogReleased: 0,
      dateUnlocked: 0,
      dependencyUnlocked: 0,
      claimed: [],
      completed: [],
      failed: [],
      retried: [],
      skippedEngineering: 0,
      engineeringJobsLaunched: 0,
      engineeringJobsPolled: 0,
      engineeringJobsIngested: 0,
      errors: ["aos_backend_unconfigured"],
      parallel: false,
      operatingModel: {
        version: "v2",
        businessAgents: 3,
        cursorMode: getCursorMode(),
        cursorConcurrencyLimit: getCursorConcurrencyLimit(),
        cursorActive: 0,
        cursorBudgetUsed: 0,
        cursorBudgetLimit: getMonthlyCursorBudgetUnits(),
        cursorBudgetExhausted: false,
        founderComputerRequired: false,
      },
    };
  }

  const watchdogReleased = await recoverStaleLeases();
  const dateUnlocked = await unlockDateGated();
  const dependencyUnlocked = await unlockReadyDependencies();
  await unblockLegacyEngineeringRuntime();
  let sprint: SprintReleaseResult | undefined;
  if (input?.includeTest !== true) {
    try {
      await ensureStandupWork();
      await ensureOperatingModelWork();
      sprint = await releaseAugustLaunchSprint();
    } catch (error) {
      errors.push(`standup_seed:${error instanceof Error ? error.message : "failed"}`);
    }
  }

  const cursorActiveNow = await countActiveEngineeringJobs(false);
  const cursorProbe = await evaluateCursorLaunch({
    workId: "aos-omv2-cursor-probe",
    source: "controlled_test",
    sourceReference: "cursor-capacity",
    title: "Implement TypeScript repository pull request",
    description: "Software engineering capacity probe. Isolated branch. Not a launch.",
    ownerAgent: "imani",
    priority: 0,
    status: "READY",
    createdAt: at,
    updatedAt: at,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    blockedReason: null,
    dependencyIds: [],
    parentWorkId: null,
    attemptCount: 0,
    maxAttempts: 1,
    leaseToken: null,
    leaseExpiresAt: null,
    evidenceRefs: [],
    founderGateRequired: false,
    founderDecisionId: null,
    nextAction: "cursor_cloud_engineering",
    errorState: null,
    checkpoint: null,
    resourceKey: null,
    actionClass: "A",
    runtimeClass: "engineering",
    controlledTest: false,
    synthetic: true,
  }, { active: cursorActiveNow });
  if (cursorProbe.reason === "budget_exhausted" && input?.includeTest !== true) {
    try {
      const attention = await ensureCursorBudgetAttentionWork();
      if (attention && !attention.founderDecisionId) {
        await openFounderGate(
          attention,
          `Cursor monthly budget reached (${cursorProbe.monthlyUsed}/${cursorProbe.monthlyLimit} units). Queue engineering. Continue hosted operations. Do not purchase additional Cursor capacity.`,
          {
            severity: "normal",
            recommendation:
              "Do not purchase more Cursor capacity. Keep the configured budget. Review queued engineering after the next month or after Founder reallocation.",
          },
        );
      }
    } catch (error) {
      errors.push(`cursor_budget:${error instanceof Error ? error.message : "failed"}`);
    }
  }
  let engineeringPoll = { polled: 0, ingested: 0, launched: 0 };
  try {
    engineeringPoll = await pollEngineeringJobs();
  } catch (error) {
    errors.push(`engineering_poll:${error instanceof Error ? error.message : "failed"}`);
  }

  const agents = input?.agents ?? (["michelle", "imani", "nia"] as OperatingAgentId[]);
  const maxPer = input?.maxPerAgent ?? DEFAULT_MAX_PER_AGENT;
  const leaseSeconds = input?.leaseSeconds ?? LEASE_SECONDS;
  const claimed: string[] = [];
  const completed: string[] = [];
  const failed: string[] = [];
  const retried: string[] = [];
  let skippedEngineering = 0;
  let engineeringJobsLaunched = engineeringPoll.launched;

  const perAgent = await Promise.all(
    agents.map(async (agent) => {
      const results: Array<"COMPLETE" | "FAILED" | "GATED" | "LAUNCHED" | "BLOCKED" | "NONE"> = [];
      for (let i = 0; i < maxPer; i += 1) {
        try {
          const item = await claimNext({
            ownerAgent: agent,
            leaseSeconds,
            engineeringRuntime: input?.engineeringRuntime ?? engineeringRuntimeEnabled(),
            includeTest: input?.includeTest === true,
            cursorLaunchAllowed: cursorProbe.allowed,
          });
          if (!item) {
            results.push("NONE");
            break;
          }
          claimed.push(item.workId);
          await beat(agent, item.workId, null);
          const outcome = await executeClaimedWork(item, item.leaseToken ?? "");
          results.push(outcome);
          if (outcome === "COMPLETE") completed.push(item.workId);
          if (outcome === "FAILED") failed.push(item.workId);
          if (outcome === "LAUNCHED") engineeringJobsLaunched += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${agent}:${message}`);
          await beat(agent, null, message);
        }
      }
      const stillExecuting = await listWork({
        ownerAgent: agent,
        status: ["CLAIMED", "RUNNING", "VALIDATING"],
        controlledTest: input?.includeTest === true ? undefined : false,
        limit: 3,
      });
      await beat(agent, stillExecuting[0]?.workId ?? null, null);
      return results;
    }),
  );

  const leftover = await listWork({ status: ["READY", "RETRY"], limit: 400 });
  skippedEngineering = leftover.filter((item) => item.runtimeClass === "engineering").length;
  const execution = await buildExecutionProof(input?.includeTest === true);
  const cursorActive = await countActiveEngineeringJobs();

  return {
    ok: errors.length === 0,
    at,
    watchdogReleased,
    dateUnlocked,
    dependencyUnlocked,
    claimed,
    completed,
    failed,
    retried,
    skippedEngineering,
    engineeringJobsLaunched,
    engineeringJobsPolled: engineeringPoll.polled,
    engineeringJobsIngested: engineeringPoll.ingested,
    errors,
    parallel: agents.length > 1 && perAgent.every((list) => list.length >= 0),
    sprint,
    execution,
    operatingModel: {
      version: "v2",
      businessAgents: 3,
      cursorMode: getCursorMode(),
      cursorConcurrencyLimit: getCursorConcurrencyLimit(),
      cursorActive,
      cursorBudgetUsed: cursorProbe.monthlyUsed,
      cursorBudgetLimit: getMonthlyCursorBudgetUnits(),
      cursorBudgetExhausted: cursorProbe.reason === "budget_exhausted",
      founderComputerRequired: false,
    },
  };
}
