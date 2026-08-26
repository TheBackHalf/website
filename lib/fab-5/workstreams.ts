import type {
  LaunchExecutiveId,
  LaunchRowRecord,
  RemainingLaunchDeliverable,
  WorkstreamId,
} from "@/lib/fab-5/types";
import { loadLaunchAdapter } from "@/lib/fab-5/os";

export const WORKSTREAM_OWNERS: Record<WorkstreamId, LaunchExecutiveId> = {
  TECHNOLOGY: "imani",
  OPERATIONS: "michelle",
  MARKETING: "nia",
  FINANCE: "kimberly",
  EXPERIENCE: "nia",
  LEARNING: "nia",
  COMMUNITY: "nia",
  INNOVATION: "nia",
  LEGAL: "imani",
};

export const EXECUTIVE_NAMES: Record<LaunchExecutiveId, string> = {
  kimberly: "Kimberly Walker (AI)",
  michelle: "Michelle Northstar",
  imani: "Imani Heartbeat",
  nia: "Nia Prism",
};

const AMBIGUOUS_OWNERS = /^(tbd|unassigned|shared|fab 5|team|everyone|perfect 10|)$/i;

export type LaunchViewQuestion =
  | "imani_next"
  | "nia_waiting"
  | "nia_next"
  | "michelle_blocked"
  | "michelle_coordinating"
  | "founder_action"
  | "human_expert"
  | "parallel"
  | "critical_path"
  | "unowned"
  | "remaining_count"
  | "after_row_18"
  | "route_technology"
  | "route_learning_experience"
  | "route_operations"
  | "route_marketing"
  | "route_finance"
  | "route_legal_implementation"
  | "route_cross_functional"
  | "route_final_readiness";

export type ExecutiveQueueItem = {
  priority: number;
  id: string;
  row: string;
  deliverable: string;
  status: string;
  workstream: WorkstreamId;
  dependencyState: string;
  nextAction: string;
  evidenceRequirement: string;
  founderGate: boolean;
  humanExpertGate: boolean;
  supportingOwner: string;
};

function ownerOk(owner: string | undefined): boolean {
  if (!owner) return false;
  if (AMBIGUOUS_OWNERS.test(owner.trim())) return false;
  return ["kimberly", "michelle", "imani", "nia"].includes(owner);
}

export async function remainingDeliverables(): Promise<RemainingLaunchDeliverable[]> {
  const adapter = await loadLaunchAdapter();
  return adapter.remainingLaunchCritical;
}

export async function numberedRows(): Promise<LaunchRowRecord[]> {
  const adapter = await loadLaunchAdapter();
  return adapter.rows;
}

export async function unownedRemaining(): Promise<RemainingLaunchDeliverable[]> {
  const remaining = await remainingDeliverables();
  return remaining.filter((item) => !ownerOk(item.primaryOwner));
}

export async function formerRoleCurrentOwnershipCount(): Promise<number> {
  const adapter = await loadLaunchAdapter();
  const blob = JSON.stringify({
    rows: adapter.rows.map((row) => ({
      primaryOwner: row.primaryOwner,
      supportingOwners: row.supportingOwners,
    })),
    remaining: adapter.remainingLaunchCritical.map((item) => ({
      primaryOwner: item.primaryOwner,
      supportingOwners: item.supportingOwners,
    })),
  });
  const retired =
    /sora horizon|katyayani lighthouse|asha canvas|amina anchor|bhavani spark|hana alchemy|nia haven/i;
  return retired.test(blob) ? 1 : 0;
}

export async function executiveQueue(owner: LaunchExecutiveId): Promise<ExecutiveQueueItem[]> {
  const remaining = await remainingDeliverables();
  return remaining
    .filter((item) => item.primaryOwner === owner)
    .sort((a, b) => a.priority - b.priority)
    .map((item) => ({
      priority: item.priority,
      id: item.id,
      row: item.spreadsheetRow != null ? String(item.spreadsheetRow) : item.id,
      deliverable: item.deliverable,
      status: item.status,
      workstream: item.primaryWorkstream,
      dependencyState: item.dependencies.join("; ") || "none",
      nextAction: item.nextAction,
      evidenceRequirement: item.evidenceRequiredForCompletion,
      founderGate: item.founderActionRequired,
      humanExpertGate: item.humanExpertRequired,
      supportingOwner: item.supportingOwners.join(", "),
    }));
}

export async function queryLaunchView(question: LaunchViewQuestion | string): Promise<{
  question: string;
  primaryOwner?: LaunchExecutiveId;
  supportingOwners?: LaunchExecutiveId[];
  workstream?: WorkstreamId;
  answer: string;
  items: unknown[];
}> {
  const adapter = await loadLaunchAdapter();
  const remaining = adapter.remainingLaunchCritical;
  const key = normalizeQuestion(question);
  const named = new Set([
    "unowned",
    "critical_path",
    "parallel",
    "founder_action",
    "imani_next",
    "nia_waiting",
    "nia_next",
    "michelle_blocked",
    "michelle_coordinating",
    "human_expert",
    "remaining_count",
    "after_row_18",
  ]);

  if (key === "unowned") {
    const unowned = remaining.filter((item) => !ownerOk(item.primaryOwner));
    return {
      question: key,
      answer: `UNOWNED LAUNCH-CRITICAL DELIVERABLES = ${unowned.length}`,
      items: unowned,
    };
  }

  if (key === "critical_path") {
    return {
      question: key,
      answer: adapter.criticalPath.join(" → "),
      items: remaining.filter((item) => item.criticalPath),
    };
  }

  if (key === "parallel") {
    return {
      question: key,
      answer: [
        `Imani: ${adapter.parallelExecution.imani.join("; ")}`,
        `Nia: ${adapter.parallelExecution.nia.join("; ")}`,
        `Michelle: ${adapter.parallelExecution.michelle.join("; ")}`,
        `Kimberly: ${adapter.parallelExecution.kimberly.join("; ")}`,
      ].join(" | "),
      items: [adapter.parallelExecution],
    };
  }

  if (key === "founder_action") {
    return {
      question: key,
      answer:
        adapter.founderActionQueue.length === 0
          ? "NONE"
          : adapter.founderActionQueue
              .map((item) => `${item.row}: ${item.decision}`)
              .join(" | "),
      items: adapter.founderActionQueue,
    };
  }

  if (key === "imani_next") {
    const queue = remaining
      .filter((item) => item.primaryOwner === "imani")
      .sort((a, b) => a.priority - b.priority);
    const next = queue[0];
    return {
      question: key,
      primaryOwner: "imani",
      answer: next
        ? `Imani next: ${next.id} — ${next.deliverable}. ${next.nextAction}`
        : "Imani has no remaining primary launch-critical items.",
      items: queue,
    };
  }

  if (key === "nia_waiting" || key === "nia_next") {
    const queue = remaining
      .filter((item) => item.primaryOwner === "nia")
      .sort((a, b) => a.priority - b.priority);
    const next = queue[0];
    return {
      question: key,
      primaryOwner: "nia",
      answer: next
        ? `Nia next: Row ${next.spreadsheetRow} — ${next.deliverable}. ${next.nextAction}`
        : "Nia has no remaining primary launch-critical items.",
      items: queue,
    };
  }

  if (key === "michelle_blocked" || key === "michelle_coordinating") {
    const queue = remaining
      .filter((item) => item.primaryOwner === "michelle")
      .sort((a, b) => a.priority - b.priority);
    const blocking = remaining.filter((item) => item.blockers.length > 0 && item.criticalPath);
    const next = queue[0];
    return {
      question: key,
      primaryOwner: "michelle",
      answer: [
        next
          ? `Michelle is coordinating remaining Operations work starting at Row ${next.spreadsheetRow} — ${next.deliverable}.`
          : "Michelle has no remaining primary items.",
        blocking.length
          ? `Critical-path blockers: ${blocking.map((item) => `Row ${item.spreadsheetRow}`).join(", ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      items: queue,
    };
  }

  if (key === "human_expert") {
    return {
      question: key,
      answer:
        adapter.humanExpertQueue.length === 0
          ? "NONE"
          : adapter.humanExpertQueue.map((item) => `${item.row}: ${item.action}`).join(" | "),
      items: adapter.humanExpertQueue,
    };
  }

  if (key === "remaining_count") {
    return {
      question: key,
      answer: `${remaining.length} launch deliverables remain (status is not Complete).`,
      items: remaining.map((item) => item.spreadsheetRow),
    };
  }

  if (key === "after_row_18") {
    const after = remaining
      .filter((item) => (item.spreadsheetRow ?? 0) > 18)
      .sort((a, b) => a.priority - b.priority);
    return {
      question: key,
      answer: `${after.length} remaining launch deliverables after Row 18. Next in list order: ${after
        .slice(0, 8)
        .map((item) => `Row ${item.spreadsheetRow} (${item.primaryOwner}: ${item.deliverable})`)
        .join("; ")}.`,
      items: after,
    };
  }

  const rowMatch = String(question).match(/(?:august\s+launch\s+)?row\s+(\d+)/i);
  const rowNumber = rowMatch ? Number.parseInt(rowMatch[1], 10) : undefined;
  if (rowNumber && !named.has(key)) {
    const rec = adapter.rows.find((row) => row.number === rowNumber);
    if (rec) {
      const ownerName = rec.primaryOwner ? EXECUTIVE_NAMES[rec.primaryOwner] : "unassigned";
      const legalBoundary =
        rec.primaryWorkstream === "LEGAL"
          ? " LEGAL operational/risk owner is Imani Heartbeat. Imani implements approved text and flags risk. Imani must not issue legal conclusions. Human legal expert required only where the row requires legal judgment (for example Row 34). Founder/Kimberly for signature/acceptance. Michelle coordinates."
          : "";
      const readiness =
        rec.primaryWorkstream === "OPERATIONS" &&
        /final launch readiness|go\/no-go/i.test(`${rec.phase} ${rec.deliverable}`)
          ? " Final readiness is coordinated by Michelle Northstar. Specialists certify their domains. Founder Go/No-Go remains Kimberly-reserved (Row 217)."
          : "";
      return {
        question: `row_${rowNumber}`,
        primaryOwner: rec.primaryOwner,
        supportingOwners: rec.supportingOwners,
        workstream: rec.primaryWorkstream,
        answer: `August Launch Row ${rowNumber} — ${rec.deliverable}: primary owner ${ownerName}. Workstream ${rec.primaryWorkstream}. Supporting: ${(rec.supportingOwners ?? []).join(", ") || "none"}.${legalBoundary}${readiness} One deliverable, one primary owner.`,
        items: [rec],
      };
    }
  }

  if (key === "route_technology") {
    const items = remaining
      .filter((entry) => entry.primaryWorkstream === "TECHNOLOGY")
      .sort((a, b) => a.priority - b.priority);
    const item = items[0];
    return {
      question: key,
      primaryOwner: "imani",
      supportingOwners: item?.supportingOwners,
      workstream: "TECHNOLOGY",
      answer: `TECHNOLOGY primary owner is Imani Heartbeat.${item ? ` Next remaining: Row ${item.spreadsheetRow} — ${item.deliverable}.` : ""}`,
      items,
    };
  }

  if (key === "route_learning_experience") {
    const items = remaining
      .filter(
        (entry) => entry.primaryWorkstream === "LEARNING" || entry.primaryWorkstream === "EXPERIENCE",
      )
      .sort((a, b) => a.priority - b.priority);
    const item = items[0];
    return {
      question: key,
      primaryOwner: "nia",
      workstream: "LEARNING",
      answer: `LEARNING and EXPERIENCE primary owner is Nia Prism. Do not recreate Bhavani Spark.${item ? ` Next remaining: Row ${item.spreadsheetRow} — ${item.deliverable}.` : ""}`,
      items,
    };
  }

  if (key === "route_operations") {
    const items = remaining
      .filter((entry) => entry.primaryWorkstream === "OPERATIONS")
      .sort((a, b) => a.priority - b.priority);
    const item = items[0];
    return {
      question: key,
      primaryOwner: "michelle",
      supportingOwners: item?.supportingOwners,
      workstream: "OPERATIONS",
      answer: `OPERATIONS primary owner is Michelle Northstar.${item ? ` Next remaining: Row ${item.spreadsheetRow} — ${item.deliverable}.` : ""}`,
      items,
    };
  }

  if (key === "route_marketing") {
    const items = remaining
      .filter((entry) => entry.primaryWorkstream === "MARKETING")
      .sort((a, b) => a.priority - b.priority);
    const item = items[0];
    return {
      question: key,
      primaryOwner: "nia",
      workstream: "MARKETING",
      answer: `MARKETING primary owner is Nia Prism.${item ? ` Next remaining: Row ${item.spreadsheetRow} — ${item.deliverable}.` : ""}`,
      items,
    };
  }

  if (key === "route_finance") {
    const items = remaining
      .filter((entry) => entry.primaryWorkstream === "FINANCE")
      .sort((a, b) => a.priority - b.priority);
    const item = items[0];
    return {
      question: key,
      primaryOwner: "kimberly",
      workstream: "FINANCE",
      answer: `FINANCE primary owner is Kimberly Walker (AI).${item ? ` Next remaining: Row ${item.spreadsheetRow} — ${item.deliverable}. Pricing/launch-date/material spend remain Founder-reserved.` : " No remaining Finance rows."}`,
      items,
    };
  }

  if (key === "route_legal_implementation") {
    const item = remaining.find((entry) => entry.spreadsheetRow === 32) ?? remaining.find((entry) => entry.primaryWorkstream === "LEGAL");
    return {
      question: key,
      primaryOwner: "imani",
      supportingOwners: item?.supportingOwners,
      workstream: "LEGAL",
      answer:
        "LEGAL operational/risk owner is Imani Heartbeat. Imani implements approved text and flags risk. Imani must not issue legal conclusions. Human legal expert required only where the row requires legal judgment (for example Row 34). Founder/Kimberly for signature/acceptance. Michelle coordinates.",
      items: remaining.filter((entry) => entry.primaryWorkstream === "LEGAL"),
    };
  }

  if (key === "route_cross_functional") {
    const item = remaining.find((entry) => entry.spreadsheetRow === 170) ?? remaining.find((entry) => entry.spreadsheetRow === 155);
    return {
      question: key,
      primaryOwner: item?.primaryOwner,
      supportingOwners: item?.supportingOwners,
      workstream: item?.primaryWorkstream,
      answer: item
        ? `Cross-functional Row ${item.spreadsheetRow} — ${item.deliverable}: primary owner ${item.primaryOwner}. Supporting: ${item.supportingOwners.join(", ")}. One deliverable, one primary owner.`
        : "No cross-functional example row found.",
      items: item ? [item] : [],
    };
  }

  if (key === "route_final_readiness") {
    const item = remaining.find((entry) => entry.spreadsheetRow === 213);
    return {
      question: key,
      primaryOwner: "michelle",
      supportingOwners: item?.supportingOwners,
      workstream: "OPERATIONS",
      answer:
        "Final readiness is coordinated by Michelle Northstar. Specialists certify their domains. Founder Go/No-Go remains Kimberly-reserved (Row 217).",
      items: remaining.filter((entry) => /Final Launch Readiness|Launch Day|Stabilization/i.test(entry.phase)),
    };
  }

  return {
    question: key,
    answer: "Unknown launch-view question. Use the consolidated view in ops/fab-5/launch-rows.json.",
    items: [],
  };
}

function normalizeQuestion(question: string): LaunchViewQuestion | string {
  const text = question.toLowerCase();
  if (/unowned|unassigned/.test(text)) return "unowned";
  if (/how many launch deliverables remain|remaining count/.test(text)) return "remaining_count";
  if (/remains after row 18|after row 18/.test(text)) return "after_row_18";
  if (/critical path/.test(text)) return "critical_path";
  if (/parallel/.test(text)) return "parallel";
  if (/human expert/.test(text)) return "human_expert";
  if (/founder (action|required|queue)/.test(text)) return "founder_action";
  if (/launch queue|current launch (queue|view)/.test(text)) return "remaining_count";
  if (/imani (work|next)/.test(text) || /should imani/.test(text)) return "imani_next";
  if (/should nia work on next|nia next/.test(text)) return "nia_next";
  if (/nia wait/.test(text) || /should nia/.test(text)) return "nia_waiting";
  if (/michelle coordinating|what is michelle coordinating/.test(text)) return "michelle_coordinating";
  if (/blocking michelle|michelle block/.test(text)) return "michelle_blocked";
  if (/final readiness|go\/no-go reviews/.test(text)) return "route_final_readiness";
  if (/marketing (row|workstream)/.test(text)) return "route_marketing";
  if (/technology/.test(text)) return "route_technology";
  if (/learning|experience/.test(text)) return "route_learning_experience";
  if (/operation/.test(text)) return "route_operations";
  if (/finance/.test(text)) return "route_finance";
  if (/legal/.test(text)) return "route_legal_implementation";
  if (/cross-functional|chargeback|mailbox/.test(text)) return "route_cross_functional";
  return question;
}

export function isLaunchViewQuery(command: string): boolean {
  const text = command.toLowerCase();
  return (
    /what should imani work on next/.test(text) ||
    /what should nia work on next/.test(text) ||
    /what is michelle coordinating/.test(text) ||
    /what requires a human expert/.test(text) ||
    /how many launch deliverables remain/.test(text) ||
    /what launch work remains after row 18/.test(text) ||
    /what is blocking michelle/.test(text) ||
    /what (currently )?requires founder action/.test(text) ||
    /what can run in parallel/.test(text) ||
    /current critical path/.test(text) ||
    /unowned/.test(text) ||
    /query_launch_view|consolidated launch view/.test(text) ||
    /workstream/.test(text)
  );
}
