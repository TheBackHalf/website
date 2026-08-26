import bundledSnapshot from "@/ops/fab-5/aos-command-center-snapshot.json";
import { enqueueWork, getWork } from "@/lib/fab-5/aos/store";
import {
  isHumanFounderOwner,
  isKimberlyAi,
  type OperatingAgentId,
  type WorkItem,
  type WorkStatus,
} from "@/lib/fab-5/aos/types";

export type CommandCenterRow = {
  tab: "August Launch" | "Post Launch";
  order: number;
  phase: string;
  deliverable: string;
  description: string;
  percentComplete: number;
  status: string;
  dependency: string;
  cost: string;
  assignedAgent: string;
  notes: string;
  targetTiming?: string;
};

export type CommandCenterSnapshot = {
  ingestedAt: string;
  workbook: string;
  rows: CommandCenterRow[];
};

const LAUNCH_AT = "2026-08-31T04:00:00.000Z";

function mapAgent(assigned: string): OperatingAgentId | "skip" | "invalid" {
  const value = assigned.trim();
  if (!value) return "skip";
  if (isKimberlyAi(value)) return "invalid";
  if (isHumanFounderOwner(value)) return "skip";
  const lower = value.toLowerCase();
  if (lower.includes("michelle")) return "michelle";
  if (lower.includes("imani")) return "imani";
  if (lower.includes("nia")) return "nia";
  return "skip";
}

function isIncomplete(row: CommandCenterRow): boolean {
  if (row.percentComplete >= 100) return false;
  const status = row.status.trim().toLowerCase();
  return status !== "complete" && status !== "completed";
}

function initialStatus(row: CommandCenterRow): { status: WorkStatus; scheduledAt: string | null; blockedReason: string | null } {
  const dep = row.dependency.trim();
  const timing = (row.targetTiming ?? "").toLowerCase();
  const gateText = `${dep} ${timing}`;
  if (row.tab === "Post Launch") {
    return { status: "DATE_GATED", scheduledAt: LAUNCH_AT, blockedReason: dep || "post_launch_queue" };
  }
  if (/august 31|launch day|first 24-hour|72-hour|october 25/.test(gateText)) {
    return { status: "DATE_GATED", scheduledAt: LAUNCH_AT, blockedReason: dep || "date_gated" };
  }
  if (dep && dep !== "-" && !/^none$/i.test(dep)) {
    return { status: "BLOCKED", scheduledAt: null, blockedReason: dep };
  }
  return { status: "READY", scheduledAt: null, blockedReason: null };
}

export function workIdFor(row: CommandCenterRow): string {
  const prefix = row.tab === "August Launch" ? "al" : "pl";
  return `${prefix}-${row.order}`;
}

export async function loadCommandCenterSnapshot(_filePath?: string): Promise<CommandCenterSnapshot> {
  return bundledSnapshot as CommandCenterSnapshot;
}

export async function ingestCommandCenterSnapshot(
  snapshot: CommandCenterSnapshot,
): Promise<{ ingested: number; skippedKim: number; skippedComplete: number; skippedInvalid: number; items: WorkItem[] }> {
  let skippedKim = 0;
  let skippedComplete = 0;
  let skippedInvalid = 0;
  const items: WorkItem[] = [];
  for (const row of snapshot.rows) {
    if (!row.deliverable.trim() && !row.description.trim()) continue;
    if (!isIncomplete(row)) {
      skippedComplete += 1;
      continue;
    }
    const owner = mapAgent(row.assignedAgent);
    if (owner === "skip") {
      skippedKim += 1;
      continue;
    }
    if (owner === "invalid") {
      skippedInvalid += 1;
      continue;
    }
    const existing = await getWork(workIdFor(row));
    if (existing && existing.status === "COMPLETE") continue;
    const gate = initialStatus(row);
    const item = await enqueueWork({
      workId: workIdFor(row),
      source: "command_center",
      sourceReference: `${row.tab} row ${row.order}`,
      title: row.deliverable,
      description: row.description,
      ownerAgent: owner,
      priority: row.tab === "August Launch" ? row.order : 300 + row.order,
      status: gate.status,
      scheduledAt: gate.scheduledAt,
      nextAction: gate.blockedReason ?? "execute",
      blockedReason: gate.blockedReason,
      resourceKey: `cc:${row.tab}:${row.order}`,
      runtimeClass: "engineering",
      actionClass: /spend|payment|bank|insurance|tax/i.test(`${row.deliverable} ${row.description}`) ? "C" : "A",
      controlledTest: false,
      synthetic: false,
      evidenceRefs: [`workbook:${snapshot.workbook}`],
    });
    items.push(item);
  }
  return {
    ingested: items.length,
    skippedKim,
    skippedComplete,
    skippedInvalid,
    items,
  };
}
