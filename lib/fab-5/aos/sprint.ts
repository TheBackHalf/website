/**
 * August Launch Sprint — Agent-owned 78-row release.
 * Founder authorized kickoff 2026-08-26. Batch #1A Founder acceptance is recorded
 * only for rows 157, 169, 188, 203, and 208.
 */

import bundledSnapshot from "@/ops/fab-5/aos-command-center-snapshot.json";
import { classifyExecution } from "@/lib/fab-5/aos/operating-model";
import { LAUNCH_SPRINT_KICKOFF_ID } from "@/lib/fab-5/aos/reclassify";
import {
  applySprintWorkState,
  blockOutOfSprintCommandCenter,
  completeWork,
  enqueueWork,
  getWork,
  listOpenDecisions,
  resolveFounderDecision,
  unlockReadyDependencies,
} from "@/lib/fab-5/aos/store";
import type { OperatingAgentId, WorkStatus } from "@/lib/fab-5/aos/types";

const MICHELLE = [11, 73, 157, 158, 159, 160, 163, 164, 169, 172, 173, 174, 188, 200, 201, 203, 204, 205, 208, 210, 211, 213, 215, 216];
const IMANI = [75, 85, 122, 133, 134, 135, 136, 138, 139, 141, 142, 146, 147, 148, 161, 162, 167, 168, 170, 171, 176, 177, 178, 179, 181, 182, 184, 185, 186, 187, 194, 195];
const NIA = [82, 87, 88, 137, 140, 145, 155, 156, 165, 180, 183, 189, 190, 193, 196, 197, 198, 206, 209, 212, 214, 218];

export const AUGUST_LAUNCH_AGENT_ROWS = new Set([...MICHELLE, ...IMANI, ...NIA]);
const OWNER_BY_ROW = new Map<number, OperatingAgentId>([
  ...MICHELLE.map((row) => [row, "michelle"] as const),
  ...IMANI.map((row) => [row, "imani"] as const),
  ...NIA.map((row) => [row, "nia"] as const),
]);

const COMPLETE_ROWS = new Set([157, 169, 172, 174, 188, 203, 204, 208]);
const ACCEPTANCE_READY_ROWS = new Set([82, 145, 180, 196]);
const FOUNDER_ACCEPTED_BATCH_1A = new Set([157, 169, 188, 203, 208]);
const BATCH_1A_EVIDENCE: Record<number, string> = {
  157: "founder-acceptance-batch-1a:2026-08-26 row-157 first-72-hour-support-coverage-plan-only",
  169: "founder-acceptance-batch-1a:2026-08-26 row-169 operational-procedure-and-tabletop-not-legal-notification",
  188: "founder-acceptance-batch-1a:2026-08-26 row-188 triage-register-only-defects-not-resolved",
  203: "founder-acceptance-batch-1a:2026-08-26 row-203 change-control-protocol-not-freeze-or-go-no-go",
  208: "founder-acceptance-batch-1a:2026-08-26 row-208 hypercare-plan-not-activation",
};
const FOUNDER_GATES = new Set([11, 73, 75, 85, 163, 170, 200, 201, 218]);
const HUMAN_GATES = new Set([139, 140]);
const P0 = new Set([
  87, 88, 122, 133, 136, 137, 141, 142, 146, 148, 155, 156, 157, 158, 161, 165, 167, 168, 169, 171, 176, 177, 178,
  179, 182, 183, 188, 189, 190, 194, 195, 197, 198, 203, 205, 208, 213, 214, 215, 216,
]);

const KICKOFF_EVIDENCE =
  "Founder authorized August Launch Sprint 2026-08-26 after Row 74 Founder Acceptance. Emergency AOS recovery applied 2026-08-26.";

export type SprintReleaseResult = {
  kickoffCompleted: boolean;
  kickoffDecisionResolved: boolean;
  applied: number;
  ready: number;
  gatedFounder: number;
  gatedHuman: number;
  acceptanceReady: number;
  completed: number;
  skippedInFlight: number;
  cancelledDuplicates: number;
  blockedOutOfScope: number;
  byOwner: Record<OperatingAgentId, { ready: number; gated: number }>;
};

function workIdFor(row: number): string {
  return `al-${row}`;
}

function skipWorkbookStatus(status: string): boolean {
  const value = status.trim().toLowerCase();
  return (
    value === "complete" ||
    value === "completed" ||
    value === "planned" ||
    value === "deferred" ||
    value.includes("removed")
  );
}

function classFor(row: number): { status: WorkStatus; nextAction: string; blockedReason: string | null; founderGate: boolean } {
  if (COMPLETE_ROWS.has(row)) {
    return { status: "COMPLETE", nextAction: "none", blockedReason: null, founderGate: false };
  }
  if (ACCEPTANCE_READY_ROWS.has(row)) {
    return {
      status: "ACCEPTANCE_READY",
      nextAction: "await_founder_acceptance",
      blockedReason: "founder_acceptance_required",
      founderGate: true,
    };
  }
  if (FOUNDER_GATES.has(row)) {
    return { status: "FOUNDER_GATED", nextAction: "await_founder", blockedReason: "founder_action_required", founderGate: true };
  }
  if (HUMAN_GATES.has(row)) {
    return { status: "FOUNDER_GATED", nextAction: "await_human", blockedReason: "human_acceptance_required", founderGate: true };
  }
  return { status: "READY", nextAction: "execute", blockedReason: null, founderGate: false };
}

function routingForReadyLaunch(title: string, description: string): { runtimeClass: "hosted" | "engineering"; nextAction: string } {
  const classified = classifyExecution({
    title,
    description,
    source: "command_center",
  });
  if (classified.engineeringRequired) {
    return { runtimeClass: "engineering", nextAction: "cursor_cloud_engineering" };
  }
  return { runtimeClass: "hosted", nextAction: "await_domain_execution" };
}

async function authorizeKickoff(): Promise<{ completed: boolean; decisionResolved: boolean }> {
  let kickoff = await getWork(LAUNCH_SPRINT_KICKOFF_ID);
  if (!kickoff) {
    kickoff = await enqueueWork({
      workId: LAUNCH_SPRINT_KICKOFF_ID,
      source: "company_objective",
      sourceReference: "row-74-fab5-agent-standup",
      title: "Founder kickoff — August Launch three-agent sprint",
      description: KICKOFF_EVIDENCE,
      ownerAgent: "michelle",
      priority: 3,
      actionClass: "A",
      runtimeClass: "hosted",
      nextAction: "none",
      resourceKey: "aos-standup:launch-sprint-kickoff",
      evidenceRefs: [KICKOFF_EVIDENCE],
    });
  }
  const open = await listOpenDecisions(false);
  let decisionResolved = false;
  for (const decision of open.filter((item) => item.workId === LAUNCH_SPRINT_KICKOFF_ID)) {
    await resolveFounderDecision({
      decisionId: decision.decisionId,
      status: "APPROVED",
      founderResponse: KICKOFF_EVIDENCE,
    });
    decisionResolved = true;
  }
  if (kickoff.status !== "COMPLETE") {
    await completeWork({
      workId: LAUNCH_SPRINT_KICKOFF_ID,
      evidenceRefs: [KICKOFF_EVIDENCE],
      nextAction: "none",
    });
  }
  return { completed: true, decisionResolved };
}

async function recordFounderAcceptedBatch1a(): Promise<{ completed: string[]; skipped: string[]; dependencyUnlocked: number }> {
  const completed: string[] = [];
  const skipped: string[] = [];
  for (const row of FOUNDER_ACCEPTED_BATCH_1A) {
    const workId = workIdFor(row);
    const existing = await getWork(workId);
    if (!existing) {
      skipped.push(workId);
      continue;
    }
    if (existing.status === "COMPLETE") {
      completed.push(workId);
      continue;
    }
    if (["CLAIMED", "RUNNING", "VALIDATING"].includes(existing.status)) {
      skipped.push(workId);
      continue;
    }
    const item = await completeWork({
      workId,
      evidenceRefs: [
        BATCH_1A_EVIDENCE[row],
        `ops/fab-5/runs/row-${row}-founder-acceptance-closure-2026-08-26.json`,
      ],
      nextAction: "none",
    });
    if (item?.status === "COMPLETE") completed.push(workId);
    else skipped.push(workId);
  }
  const dependencyUnlocked = await unlockReadyDependencies();
  return { completed, skipped, dependencyUnlocked };
}

export async function releaseAugustLaunchSprint(): Promise<SprintReleaseResult> {
  const snapshot = bundledSnapshot as {
    workbook: string;
    rows: Array<{
      tab: string;
      order: number;
      deliverable: string;
      description: string;
      status: string;
      notes: string;
    }>;
  };
  const byOwner: Record<OperatingAgentId, { ready: number; gated: number }> = {
    michelle: { ready: 0, gated: 0 },
    imani: { ready: 0, gated: 0 },
    nia: { ready: 0, gated: 0 },
  };
  const result: SprintReleaseResult = {
    kickoffCompleted: false,
    kickoffDecisionResolved: false,
    applied: 0,
    ready: 0,
    gatedFounder: 0,
    gatedHuman: 0,
    acceptanceReady: 0,
    completed: 0,
    skippedInFlight: 0,
    cancelledDuplicates: 0,
    blockedOutOfScope: 0,
    byOwner,
  };

  for (const row of AUGUST_LAUNCH_AGENT_ROWS) {
    const dup = await getWork(`aos-sprint-lr-${row}`);
    if (dup && !["COMPLETE", "CLAIMED", "RUNNING", "VALIDATING"].includes(dup.status)) {
      await applySprintWorkState({
        workId: dup.workId,
        status: "CANCELLED",
        nextAction: "superseded_by_al_work_id",
        blockedReason: "duplicate_sprint_queue",
        force: true,
      });
      result.cancelledDuplicates += 1;
    }
  }

  const kickoff = await authorizeKickoff();
  result.kickoffCompleted = kickoff.completed;
  result.kickoffDecisionResolved = kickoff.decisionResolved;
  await recordFounderAcceptedBatch1a();

  for (const workId of [
    "aos-row74-michelle-reclassify",
    "aos-row74-imani-cursor-inspect",
    "aos-row74-nia-experience-inspect",
    "aos-open-google-signin-hide",
    "aos-open-checkout-pricing",
  ]) {
    const item = await getWork(workId);
    if (item && !["COMPLETE", "CLAIMED", "RUNNING", "VALIDATING", "CANCELLED"].includes(item.status)) {
      await completeWork({
        workId,
        evidenceRefs: ["row-74-complete-do-not-rerun"],
        nextAction: "none",
      });
    }
  }

  for (const row of snapshot.rows) {
    if (row.tab !== "August Launch") continue;
    if (!AUGUST_LAUNCH_AGENT_ROWS.has(row.order)) continue;
    if (row.order === 74 || row.order === 10 || row.order === 217) continue;
    if (skipWorkbookStatus(row.status) && !COMPLETE_ROWS.has(row.order)) continue;
    const owner = OWNER_BY_ROW.get(row.order);
    if (!owner) continue;
    const workId = workIdFor(row.order);
    const classified = classFor(row.order);
    const priority = P0.has(row.order) ? 20 : classified.status === "READY" ? 60 : 200;
    const readyRouting =
      classified.status === "READY"
        ? routingForReadyLaunch(row.deliverable, (row.notes ?? "").trim() || row.description)
        : { runtimeClass: "hosted" as const, nextAction: classified.nextAction };
    const runtimeClass = readyRouting.runtimeClass;
    const nextAction = classified.status === "READY" ? readyRouting.nextAction : classified.nextAction;
    let existing = await getWork(workId);
    if (!existing) {
      existing = await enqueueWork({
        workId,
        source: "command_center",
        sourceReference: `August Launch row ${row.order}`,
        title: row.deliverable,
        description: (row.notes ?? "").trim() || row.description,
        ownerAgent: owner,
        priority,
        status: classified.status === "READY" ? "READY" : classified.status,
        founderGateRequired: classified.founderGate,
        actionClass: classified.founderGate ? "D" : "A",
        runtimeClass,
        nextAction,
        blockedReason: classified.blockedReason,
        resourceKey: `cc:August Launch:${row.order}`,
        evidenceRefs: [`workbook:${snapshot.workbook}`, "august-launch-sprint-78"],
      });
    }
    const applied = await applySprintWorkState({
      workId,
      ownerAgent: owner,
      status: classified.status,
      runtimeClass,
      nextAction,
      blockedReason: classified.blockedReason,
      founderGateRequired: classified.founderGate,
      dependencyIds: [],
      priority,
      evidenceRefs: ["august-launch-sprint-recovery-2026-08-26"],
    });
    if (!applied) continue;
    if (classified.status === "COMPLETE" && applied.status !== "COMPLETE") {
      const evidence = FOUNDER_ACCEPTED_BATCH_1A.has(row.order)
        ? [BATCH_1A_EVIDENCE[row.order], `ops/fab-5/runs/row-${row.order}-founder-acceptance-closure-2026-08-26.json`]
        : ["michelle-aos-rows-204-174-172"];
      await completeWork({ workId, evidenceRefs: evidence, nextAction: "none" });
    }
    if (["CLAIMED", "RUNNING", "VALIDATING"].includes(applied.status) && applied.status !== classified.status) {
      result.skippedInFlight += 1;
      continue;
    }
    result.applied += 1;
    if (applied.status === "READY") {
      result.ready += 1;
      byOwner[owner].ready += 1;
    } else if (ACCEPTANCE_READY_ROWS.has(row.order)) {
      result.acceptanceReady += 1;
      byOwner[owner].gated += 1;
    } else if (HUMAN_GATES.has(row.order)) {
      result.gatedHuman += 1;
      byOwner[owner].gated += 1;
    } else if (FOUNDER_GATES.has(row.order) || applied.status === "FOUNDER_GATED") {
      result.gatedFounder += 1;
      byOwner[owner].gated += 1;
    } else if (applied.status === "COMPLETE") {
      result.completed += 1;
    }
  }

  result.blockedOutOfScope = await blockOutOfSprintCommandCenter([...AUGUST_LAUNCH_AGENT_ROWS].map((row) => workIdFor(row)));
  return result;
}

export function isAugustLaunchAgentRow(workId: string): boolean {
  const match = /^al-(\d+)$/.exec(workId);
  if (!match) return false;
  return AUGUST_LAUNCH_AGENT_ROWS.has(Number(match[1]));
}
