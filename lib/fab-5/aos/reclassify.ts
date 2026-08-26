/**
 * Recursive Launch Readiness classification.
 * Uses completed rows + Founder-accepted status files so a named
 * prerequisite that is already done is not treated as a live blocker.
 * Does not mark Founder acceptance or Command Center Complete.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadLaunchAdapter } from "@/lib/fab-5/os";
import type { LaunchExecutiveId, RemainingLaunchDeliverable } from "@/lib/fab-5/types";

export const LAUNCH_SPRINT_KICKOFF_ID = "aos-row74-launch-sprint-kickoff";

export type LaunchReadinessClass =
  | "READY FOR AGENT EXECUTION"
  | "BLOCKED BY DEPENDENCY"
  | "FOUNDER ACTION REQUIRED"
  | "HUMAN ACCEPTANCE REQUIRED";

export type ClassifiedLaunchRow = {
  id: string;
  row: number | null;
  deliverable: string;
  owner: LaunchExecutiveId;
  workstream: string;
  classification: LaunchReadinessClass;
  prerequisite: string | null;
  executableBy: "michelle" | "imani" | "nia" | "cursor_cloud" | "founder" | "human" | "none";
  stillRemaining: boolean;
};

export type LaunchReclassification = {
  remainingLaunchCritical: number;
  readyForAgentExecution: number;
  queuedForAgentExecution: number;
  dependencyBlocked: number;
  founderActionRequired: number;
  humanAcceptanceRequired: number;
  michelleReady: number;
  imaniReady: number;
  niaReady: number;
  cursorCloudEngineeringReady: number;
  genuineBlockers: string[];
  items: ClassifiedLaunchRow[];
};

type StatusFile = {
  row?: number;
  founderAccepted?: boolean;
  rowMarkedComplete?: boolean;
  markedComplete?: boolean;
  status?: string;
  nextAction?: string;
  technicalStatus?: string;
  founderAcceptance?: string | null;
  remainingBlockers?: string;
  percentCompleteRecorded?: number;
};

type AdapterRow = {
  number: number;
  deliverable: string;
  status: string;
  percentComplete?: number;
  founderActionRequired?: boolean;
  humanExpertRequired?: boolean;
};

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitDeps(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    for (const part of value.split(/[;,]/)) {
      const trimmed = part.trim();
      if (trimmed && trimmed !== "-" && !/^none$/i.test(trimmed)) out.push(trimmed);
    }
  }
  return [...new Set(out)];
}

function loadStatusFiles(): Map<number, StatusFile> {
  const map = new Map<number, StatusFile>();
  const dir = path.join(process.cwd(), "ops/fab-5");
  if (!existsSync(dir)) return map;
  for (const name of readdirSync(dir)) {
    const match = /^row-(\d+)-status\.json$/.exec(name);
    if (!match) continue;
    try {
      const parsed = JSON.parse(readFileSync(path.join(dir, name), "utf8")) as StatusFile;
      map.set(Number(match[1]), parsed);
    } catch {
      /* ignore unreadable status files */
    }
  }
  return map;
}

function statusSaysDeferred(file: StatusFile | undefined): boolean {
  if (!file) return false;
  const status = String(file.status ?? "").toLowerCase();
  const technical = String(file.technicalStatus ?? "").toLowerCase();
  return (
    file.founderAcceptance === "DEFERRED" ||
    status.includes("deferred") ||
    technical.includes("deferred")
  );
}

function statusSaysComplete(file: StatusFile | undefined): boolean {
  if (!file) return false;
  if (file.founderAccepted === true && (file.rowMarkedComplete === true || file.markedComplete === true)) {
    return true;
  }
  const status = String(file.status ?? "").toLowerCase();
  return (
    (file.founderAccepted === true || file.founderAcceptance === "YES" || file.founderAcceptance === "APPROVED") &&
    (status === "complete" || file.percentCompleteRecorded === 100)
  );
}

function adapterRowComplete(row: AdapterRow | undefined): boolean {
  if (!row) return false;
  const status = String(row.status ?? "").toLowerCase();
  return (row.percentComplete ?? 0) >= 100 || status === "complete" || status === "completed";
}

function statusSaysFounderAction(file: StatusFile | undefined, item: RemainingLaunchDeliverable): boolean {
  const next = String(file?.nextAction ?? item.nextAction ?? "");
  if (/^FOUNDER ACTION/i.test(next)) return true;
  if (item.spreadsheetRow === 75 || item.id === "75") return true;
  if (item.spreadsheetRow === 73 || item.id === "73") return true;
  const blockers = String(file?.remainingBlockers ?? "");
  if (/live (secret )?key|cloudflare dns records|replace STRIPE_SECRET_KEY/i.test(`${next} ${blockers}`)) {
    return true;
  }
  return false;
}

function statusSaysHumanAcceptance(file: StatusFile | undefined): boolean {
  if (!file || statusSaysComplete(file)) return false;
  const technical = String(file.technicalStatus ?? "").toLowerCase();
  const next = String(file.nextAction ?? "");
  if (technical.includes("ready_for_founder_acceptance")) return true;
  if (/founder acceptance review/i.test(next)) return true;
  if (file.founderAcceptance === "PENDING" && (file.percentCompleteRecorded ?? 0) >= 90) return true;
  return false;
}

function findAdapterRow(dep: string, rows: AdapterRow[]): AdapterRow | undefined {
  const n = norm(dep);
  if (!n) return undefined;
  const exact = rows.find((row) => norm(row.deliverable) === n);
  if (exact) return exact;
  const numbered = Number(dep);
  if (Number.isFinite(numbered)) {
    const byNumber = rows.find((row) => row.number === numbered);
    if (byNumber) return byNumber;
  }
  return rows.find((row) => {
    const deliverable = norm(row.deliverable);
    return deliverable.includes(n) || n.includes(deliverable);
  });
}

function executableBy(
  item: RemainingLaunchDeliverable,
  classification: LaunchReadinessClass,
): ClassifiedLaunchRow["executableBy"] {
  if (classification === "FOUNDER ACTION REQUIRED") return "founder";
  if (classification === "HUMAN ACCEPTANCE REQUIRED") return "human";
  if (classification === "BLOCKED BY DEPENDENCY") return "none";
  if (item.primaryOwner === "imani") return "cursor_cloud";
  if (item.primaryOwner === "nia") {
    return ["EXPERIENCE", "LEARNING", "MARKETING", "COMMUNITY"].includes(item.primaryWorkstream)
      ? "nia"
      : "nia";
  }
  if (item.primaryOwner === "michelle") return "michelle";
  return "founder";
}

export async function reclassifyLaunchBacklog(): Promise<LaunchReclassification> {
  const adapter = await loadLaunchAdapter();
  const remaining = adapter.remainingLaunchCritical;
  const rows = adapter.rows as AdapterRow[];
  const statusFiles = loadStatusFiles();
  const remainingById = new Map(remaining.map((item) => [item.id, item]));

  const classify = (item: RemainingLaunchDeliverable, stack: Set<string>): LaunchReadinessClass => {
    if (stack.has(item.id)) return "BLOCKED BY DEPENDENCY";
    const status = statusFiles.get(item.spreadsheetRow ?? Number(item.id));
    const adapterRow = rows.find((row) => row.number === (item.spreadsheetRow ?? Number(item.id)));
    if (statusSaysComplete(status) || statusSaysDeferred(status) || adapterRowComplete(adapterRow)) {
      return "READY FOR AGENT EXECUTION";
    }
    if (
      item.founderActionRequired ||
      item.primaryOwner === "kimberly" ||
      statusSaysFounderAction(status, item)
    ) {
      return "FOUNDER ACTION REQUIRED";
    }
    if (item.humanExpertRequired || statusSaysHumanAcceptance(status)) {
      return "HUMAN ACCEPTANCE REQUIRED";
    }
    for (const dep of splitDeps([...(item.dependencies ?? []), ...(item.blockers ?? [])])) {
      const found = findAdapterRow(dep, rows);
      if (!found) continue;
      const foundStatus = statusFiles.get(found.number);
      if (statusSaysComplete(foundStatus) || statusSaysDeferred(foundStatus) || adapterRowComplete(found)) continue;
      const child = remainingById.get(String(found.number));
      if (!child) {
        if (found.founderActionRequired) return "BLOCKED BY DEPENDENCY";
        continue;
      }
      stack.add(item.id);
      const childClass = classify(child, stack);
      stack.delete(item.id);
      if (childClass !== "READY FOR AGENT EXECUTION") return "BLOCKED BY DEPENDENCY";
    }
    return "READY FOR AGENT EXECUTION";
  };

  const items: ClassifiedLaunchRow[] = [];
  for (const item of remaining) {
    const status = statusFiles.get(item.spreadsheetRow ?? Number(item.id));
    const adapterRow = rows.find((row) => row.number === (item.spreadsheetRow ?? Number(item.id)));
    const complete = statusSaysComplete(status) || adapterRowComplete(adapterRow);
    const deferred = statusSaysDeferred(status);
    const classification = complete || deferred ? "READY FOR AGENT EXECUTION" : classify(item, new Set());
    items.push({
      id: item.id,
      row: item.spreadsheetRow,
      deliverable: item.deliverable,
      owner: item.primaryOwner,
      workstream: item.primaryWorkstream,
      classification: complete || deferred ? "READY FOR AGENT EXECUTION" : classification,
      prerequisite: splitDeps([...(item.dependencies ?? []), ...(item.blockers ?? [])])[0] ?? null,
      executableBy: complete || deferred ? "none" : executableBy(item, classification),
      stillRemaining: !complete && !deferred,
    });
  }

  const live = items.filter((item) => item.stillRemaining);
  const ready = live.filter((item) => item.classification === "READY FOR AGENT EXECUTION");
  const genuineBlockers = live
    .filter(
      (item) =>
        item.classification === "FOUNDER ACTION REQUIRED" ||
        item.classification === "HUMAN ACCEPTANCE REQUIRED" ||
        item.classification === "BLOCKED BY DEPENDENCY",
    )
    .slice(0, 20)
    .map((item) => `${item.row ?? item.id}: ${item.deliverable} — ${item.classification}`);

  return {
    remainingLaunchCritical: live.length,
    readyForAgentExecution: ready.length,
    queuedForAgentExecution: 0,
    dependencyBlocked: live.filter((item) => item.classification === "BLOCKED BY DEPENDENCY").length,
    founderActionRequired: live.filter((item) => item.classification === "FOUNDER ACTION REQUIRED").length,
    humanAcceptanceRequired: live.filter((item) => item.classification === "HUMAN ACCEPTANCE REQUIRED")
      .length,
    michelleReady: ready.filter((item) => item.owner === "michelle").length,
    imaniReady: ready.filter((item) => item.owner === "imani").length,
    niaReady: ready.filter((item) => item.owner === "nia").length,
    cursorCloudEngineeringReady: ready.filter((item) => item.owner === "imani").length,
    genuineBlockers,
    items: live,
  };
}
