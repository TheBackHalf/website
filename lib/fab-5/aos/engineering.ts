import { randomUUID } from "node:crypto";

import {
  createCursorCloudAgent,
  cursorCloudConfigured,
  engineeringRepoUrl,
  getCursorCloudAgent,
  getCursorCloudRun,
  isSuccessfulCursorRunStatus,
  isTerminalCursorRunStatus,
} from "@/lib/fab-5/aos/cursor-cloud";
import {
  completeWork,
  failWork,
  getEngineeringJobByWorkId,
  getWork,
  insertEngineeringJob,
  listOpenEngineeringJobs,
  parkWork,
  recordCost,
  releaseWork,
  updateEngineeringJob,
  updateWorkRouting,
} from "@/lib/fab-5/aos/store";
import {
  classifyWorkItem,
  cursorModelPreference,
  evaluateCursorLaunch,
} from "@/lib/fab-5/aos/operating-model";
import type { EngineeringJob, WorkItem } from "@/lib/fab-5/aos/types";

const STALE_JOB_MS = 4 * 60 * 60 * 1000;

const REQUIRED_VALIDATION_COMMANDS = [
  "npm run typecheck or npx tsc --noEmit if present",
  "npm test or the nearest package test script if present",
  "npm run build if the change can affect production",
];

export type EngineeringExecutionOutcome = "LAUNCHED" | "BLOCKED" | "FAILED";

function agentScope(owner: WorkItem["ownerAgent"]): string {
  if (owner === "michelle") {
    return "Michelle Northstar: operations, orchestration, Launch Readiness coordination. Do not take Imani security/infra ownership or Nia curriculum/brand ownership.";
  }
  if (owner === "imani") {
    return "Imani Heartbeat: technology, security, risk, repository/engineering. Do not change curriculum/brand voice or Founder-facing marketing copy unless this deliverable explicitly requires it.";
  }
  return "Nia Prism: experience, curriculum, brand, transformation. Do not change infrastructure, auth, or payment systems.";
}

export function buildEngineeringPrompt(item: WorkItem): string {
  const proofPath = `ops/fab-5/runs/aos-engineering-loop-proof.${item.workId}.json`;
  const common = [
    "You are executing work for The Back Half Agent Operating System (AOS).",
    `AOS work ID: ${item.workId}`,
    `Launch Readiness / source: ${item.source} ${item.sourceReference}`,
    `Assigned operating agent: ${item.ownerAgent}`,
    agentScope(item.ownerAgent),
    "Kimberly Walker (AI) is not an operating agent and must not be treated as execution capacity.",
    "Kimberly Walker (human) is the sole Founder acceptance authority. Do not fabricate Founder approval. Do not mark Founder-acceptance deliverables complete.",
    "Work on an isolated Cursor-generated branch. Do not push to main. Do not merge. Do not force-push.",
    "Do not modify Stripe configuration, Cloudflare DNS, Vercel custom-domain settings, or thebackhalf.org nameservers.",
    "Do not print, commit, or expose secrets, API keys, or credentials.",
    "Do not weaken authentication or security controls.",
    `Required validation before finishing: ${REQUIRED_VALIDATION_COMMANDS.join("; ")}.`,
    "If validation fails, do not present the work as successful. Leave the branch unmerged and report the failure.",
  ];

  if (item.synthetic || item.controlledTest) {
    return [
      ...common,
      "SYNTHETIC TEST — not real participant validation.",
      `Make one controlled, non-destructive change: create only ${proofPath}.`,
      `File contents must be JSON: {"synthetic":true,"aosWorkId":"${item.workId}","note":"AOS controlled engineering loop","provider":"cursor_cloud_agent"}.`,
      "Do not modify any other file. Do not change Founder-facing website copy, legal, Journey, Blueprint, or Lumina content.",
      "Open a pull request for this single file if autoCreatePR is enabled.",
    ].join("\n");
  }

  return [
    ...common,
    `Deliverable title: ${item.title}`,
    `Instructions:\n${item.description}`,
    "If this deliverable is not a repository software change, write status only to ops/fab-5/runs/aos-engineering-status/" +
      item.workId +
      ".json and do not change product, marketing, or legal files.",
    "Open a pull request. Never merge. Never deploy failed work.",
    "This result returns to AOS. Founder acceptance, if required, stays with Kimberly Walker (human).",
    "Use the most economical model that can complete this software change without sacrificing required engineering quality.",
  ].join("\n");
}

async function parkForCursorGate(
  item: WorkItem,
  leaseToken: string,
  reason: "at_capacity" | "budget_exhausted" | "not_engineering",
): Promise<EngineeringExecutionOutcome> {
  if (reason === "not_engineering") {
    await updateWorkRouting({
      workId: item.workId,
      leaseToken,
      runtimeClass: "hosted",
      nextAction: item.source === "command_center" ? "await_domain_execution" : "hosted_operational_execute",
      status: "READY",
    });
    return "BLOCKED";
  }
  await releaseWork({
    workId: item.workId,
    leaseToken,
    status: "READY",
    nextAction: reason === "budget_exhausted" ? "wait_cursor_budget" : "wait_engineering_capacity",
    blockedReason: reason === "budget_exhausted" ? "cursor_monthly_budget_reached" : null,
  });
  return "BLOCKED";
}

async function ingestSuccessfulJob(job: EngineeringJob, item: WorkItem, runResult: string | null): Promise<void> {
  const evidence = [
    `cursor-cloud-agent:${job.providerAgentId ?? job.jobId}`,
    job.providerRunId ? `cursor-cloud-run:${job.providerRunId}` : null,
    job.branch ? `branch:${job.branch}` : null,
    job.prUrl ? `pr:${job.prUrl}` : null,
  ].filter((value): value is string => Boolean(value));

  const founderRequired =
    item.founderGateRequired || item.actionClass === "D" || item.source === "command_center";

  await updateEngineeringJob(job.jobId, {
    status: "succeeded",
    validation: {
      ...job.validation,
      runResult: (runResult ?? "").slice(0, 4000),
      gatesRequired: REQUIRED_VALIDATION_COMMANDS,
      merged: false,
    },
    completed: true,
    detail: { ingestedAt: new Date().toISOString(), founderRequired },
  });

  if (item.synthetic || item.controlledTest) {
    await completeWork({
      workId: item.workId,
      evidenceRefs: evidence,
      nextAction: "none",
    });
    return;
  }

  await parkWork({
    workId: item.workId,
    status: "ACCEPTANCE_READY",
    nextAction: founderRequired ? "await_founder_acceptance" : "review_pr",
    blockedReason: founderRequired ? "founder_acceptance_required" : null,
    evidenceRefs: evidence,
    holdResourceLock: false,
  });
}

async function ingestFailedJob(job: EngineeringJob, item: WorkItem, error: string): Promise<void> {
  const retry = job.retryCount + 1 < item.maxAttempts;
  await updateEngineeringJob(job.jobId, {
    status: "failed",
    error,
    retryCount: job.retryCount + 1,
    completed: true,
  });
  await failWork({
    workId: item.workId,
    error,
    retry,
  });
}

export async function startEngineeringExecution(
  item: WorkItem,
  leaseToken: string,
): Promise<EngineeringExecutionOutcome> {
  const existing = await getEngineeringJobByWorkId(item.workId);
  if (existing && ["launching", "running", "validating", "blocked_unconfigured"].includes(existing.status)) {
    if (existing.status === "blocked_unconfigured") {
      if (!cursorCloudConfigured()) {
        await parkWork({
          workId: item.workId,
          leaseToken,
          status: "BLOCKED",
          nextAction: "await_cursor_api_key",
          blockedReason: "cursor_cloud_agent_not_configured",
          holdResourceLock: false,
        });
        return "BLOCKED";
      }
    } else {
      await parkWork({
        workId: item.workId,
        leaseToken,
        status: "VALIDATING",
        nextAction: "poll_cursor_cloud_agent",
        holdResourceLock: true,
      });
      return "LAUNCHED";
    }
  }
  if (existing?.status === "succeeded") {
    await parkWork({
      workId: item.workId,
      leaseToken,
      status: item.synthetic || item.controlledTest ? "BLOCKED" : "ACCEPTANCE_READY",
      nextAction: "already_ingested",
      holdResourceLock: false,
    });
    if (item.synthetic || item.controlledTest) {
      await completeWork({ workId: item.workId, leaseToken, evidenceRefs: [`engineering-job:${existing.jobId}`] });
    }
    return item.synthetic || item.controlledTest ? "LAUNCHED" : "BLOCKED";
  }

  const classified = classifyWorkItem(item);
  if (!classified.engineeringRequired) {
    return parkForCursorGate(item, leaseToken, "not_engineering");
  }

  const prompt = existing?.prompt ?? buildEngineeringPrompt(item);
  const repo = existing?.repository ?? engineeringRepoUrl();
  const isolated = true;
  const configured = cursorCloudConfigured();

  if (!configured) {
    if (!existing) {
      await insertEngineeringJob({
        workId: item.workId,
        sourceReference: item.sourceReference,
        ownerAgent: item.ownerAgent,
        repository: repo,
        prompt,
        status: "blocked_unconfigured",
        error: "cursor_api_key_missing",
        founderDecisionRequired: item.founderGateRequired || item.source === "command_center",
        controlledTest: item.controlledTest,
        synthetic: item.synthetic,
        commands: REQUIRED_VALIDATION_COMMANDS,
        validation: { gatesRequired: true, executed: false },
        detail: {
          workOnCurrentBranch: false,
          isolated,
          autoCreatePR: true,
          skipReviewerRequest: true,
          provider: "cursor_cloud_agent",
        },
      });
    }
    await parkWork({
      workId: item.workId,
      leaseToken,
      status: "BLOCKED",
      nextAction: "await_cursor_api_key",
      blockedReason: "cursor_cloud_agent_not_configured",
      holdResourceLock: false,
    });
    await recordCost(item.ownerAgent, item.workId, "engineering_blocked_unconfigured", 1, "cursor api key missing");
    return "BLOCKED";
  }

  const gate = await evaluateCursorLaunch(item);
  if (!gate.allowed) {
    return parkForCursorGate(
      item,
      leaseToken,
      gate.reason === "budget_exhausted" ? "budget_exhausted" : "at_capacity",
    );
  }

  const job =
    existing && ["blocked_unconfigured", "failed"].includes(existing.status)
      ? (await updateEngineeringJob(existing.jobId, { status: "launching", error: null })) ?? existing
      : await insertEngineeringJob({
          workId: item.workId,
          sourceReference: item.sourceReference,
          ownerAgent: item.ownerAgent,
          repository: repo,
          prompt,
          status: "launching",
          founderDecisionRequired: item.founderGateRequired || item.source === "command_center",
          controlledTest: item.controlledTest,
          synthetic: item.synthetic,
          commands: REQUIRED_VALIDATION_COMMANDS,
          validation: { gatesRequired: true, executed: false },
          detail: {
            workOnCurrentBranch: false,
            isolated,
            autoCreatePR: true,
            skipReviewerRequest: true,
            provider: "cursor_cloud_agent",
          },
        });

  try {
    const created = await createCursorCloudAgent({
      prompt,
      name: `AOS ${item.ownerAgent} ${item.workId}`.slice(0, 100),
      repository: repo,
      startingRef: "main",
      autoCreatePR: true,
      skipReviewerRequest: true,
      workOnCurrentBranch: false,
      agentId: `bc-${randomUUID()}`,
      model: cursorModelPreference(),
    });
    await updateEngineeringJob(job.jobId, {
      providerAgentId: created.agent.id,
      providerRunId: created.run?.id ?? created.agent.latestRunId ?? null,
      status: "running",
      detail: {
        agentUrl: created.agent.url ?? null,
        workOnCurrentBranch: false,
        isolated: true,
      },
    });
    await parkWork({
      workId: item.workId,
      leaseToken,
      status: "VALIDATING",
      nextAction: "poll_cursor_cloud_agent",
      evidenceRefs: [`cursor-cloud-agent:${created.agent.id}`],
      holdResourceLock: true,
    });
    await recordCost(item.ownerAgent, item.workId, "cursor_cloud_agent_launch", 1, "programmatic launch");
    return "LAUNCHED";
  } catch (error) {
    const message = error instanceof Error ? error.message : "cursor_cloud_launch_failed";
    await updateEngineeringJob(job.jobId, {
      status: "failed",
      error: message,
      retryCount: job.retryCount + 1,
      completed: true,
    });
    await failWork({ workId: item.workId, leaseToken, error: message, retry: true });
    return "FAILED";
  }
}

export async function pollEngineeringJobs(): Promise<{
  polled: number;
  ingested: number;
  launched: number;
}> {
  const jobs = await listOpenEngineeringJobs();
  let polled = 0;
  let ingested = 0;
  let launched = 0;
  const configured = cursorCloudConfigured();

  for (const job of jobs) {
    const item = await getWork(job.workId);
    if (!item) continue;

    if (job.status === "blocked_unconfigured") {
      if (!configured) continue;
      const gate = await evaluateCursorLaunch(item);
      if (!gate.allowed) continue;
      const outcome = await relaunchJob(job, item);
      if (outcome === "LAUNCHED") launched += 1;
      continue;
    }

    if (!job.providerAgentId || !configured) {
      await updateEngineeringJob(job.jobId, { status: job.status, detail: { heartbeat: "waiting_provider" } });
      polled += 1;
      continue;
    }

    polled += 1;
    try {
      if (job.startedAt && Date.now() - new Date(job.startedAt).getTime() > STALE_JOB_MS) {
        await ingestFailedJob(job, item, "engineering_job_stale");
        ingested += 1;
        continue;
      }
      const agent = await getCursorCloudAgent(job.providerAgentId);
      const runId = job.providerRunId ?? agent.latestRunId;
      if (!runId) {
        await updateEngineeringJob(job.jobId, {
          status: "running",
          providerRunId: null,
          detail: { agentStatus: agent.status ?? null },
        });
        continue;
      }
      const run = await getCursorCloudRun(job.providerAgentId, runId);
      const branch = run.git?.branches?.[0]?.branch ?? job.branch;
      const prUrl = run.git?.branches?.[0]?.prUrl ?? job.prUrl;
      await updateEngineeringJob(job.jobId, {
        providerRunId: run.id,
        branch: branch ?? null,
        prUrl: prUrl ?? null,
        filesChanged: branch ? [branch] : job.filesChanged,
        status: isTerminalCursorRunStatus(run.status) ? "validating" : "running",
        detail: { runStatus: run.status ?? null, durationMs: run.durationMs ?? null },
      });
      if (!isTerminalCursorRunStatus(run.status)) continue;
      const latest = (await getEngineeringJobByWorkId(job.workId)) ?? job;
      if (isSuccessfulCursorRunStatus(run.status)) {
        await ingestSuccessfulJob(latest, item, run.result ?? null);
      } else {
        await ingestFailedJob(latest, item, `cursor_run_${(run.status ?? "error").toLowerCase()}`);
      }
      ingested += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "cursor_cloud_poll_failed";
      await updateEngineeringJob(job.jobId, { error: message, status: job.status });
    }
  }

  return { polled, ingested, launched };
}

async function relaunchJob(job: EngineeringJob, item: WorkItem): Promise<EngineeringExecutionOutcome> {
  try {
    const created = await createCursorCloudAgent({
      prompt: job.prompt,
      name: `AOS ${item.ownerAgent} ${item.workId}`.slice(0, 100),
      repository: job.repository,
      startingRef: "main",
      autoCreatePR: true,
      skipReviewerRequest: true,
      workOnCurrentBranch: false,
      model: cursorModelPreference(),
    });
    await updateEngineeringJob(job.jobId, {
      providerAgentId: created.agent.id,
      providerRunId: created.run?.id ?? created.agent.latestRunId ?? null,
      status: "running",
      error: null,
      detail: { relaunchedAt: new Date().toISOString(), agentUrl: created.agent.url ?? null },
    });
    await parkWork({
      workId: item.workId,
      status: "VALIDATING",
      nextAction: "poll_cursor_cloud_agent",
      blockedReason: null,
      evidenceRefs: [`cursor-cloud-agent:${created.agent.id}`],
      holdResourceLock: true,
    });
    await recordCost(item.ownerAgent, item.workId, "cursor_cloud_agent_relaunch", 1, "configured after block");
    return "LAUNCHED";
  } catch (error) {
    const message = error instanceof Error ? error.message : "cursor_cloud_relaunch_failed";
    await updateEngineeringJob(job.jobId, { error: message });
    return "FAILED";
  }
}
