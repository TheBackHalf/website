import { classifyCommand } from "@/lib/fab-5/decision-engine";
import { loadLaunchAdapter, loadOperatingSystem } from "@/lib/fab-5/os";
import { retrieveSources } from "@/lib/fab-5/source";
import type { RemainingLaunchDeliverable, SourceRecord } from "@/lib/fab-5/types";
import { queryLaunchView, remainingDeliverables } from "@/lib/fab-5/workstreams";
import type {
  FounderActionItem,
  FounderReportClassMichelle,
  MichelleDecisionRecord,
  MichelleReadiness,
  SourceClass,
} from "@/lib/fab-5/michelle-state";

export type ContradictionInput = {
  id: string;
  claim: string;
  sourceClass: SourceClass;
  recency: string;
};

export type ContradictionResult = {
  contradiction: boolean;
  sources: string[];
  conflictingClaims: string[];
  resolution: "locked_founder_wins" | "current_authoritative_wins" | "escalate" | "none";
  note: string;
};

export type StrategicRecommendation = {
  recommendation: string;
  evidence: string[];
  assumptions: string[];
  dissent: string;
  confidence: "low" | "medium" | "high";
  impact: string;
  reversibility: string;
  founderDecisionRequired: boolean;
};

export type EstimateRecord = {
  row: string;
  scope: string;
  owner: string;
  dependencies: string[];
  bestCase: string;
  expectedCase: string;
  riskCase: string;
  assumptions: string[];
  confidence: "low" | "medium" | "high";
  criticalPathImpact: string;
};

export type FinalSynthesis = {
  whatWasRequired: string;
  whatWasDone: string;
  whoExecuted: string;
  whatWasVerified: string;
  whatEvidenceExists: string;
  whatFailed: string;
  whatWasCorrected: string;
  whatRemains: string;
  whatIsBlocked: string;
  whatRequiresFounder: string;
  whatRequiresHumanExpert: string;
  scheduleImpact: string;
  launchImpact: string;
  confidence: "low" | "medium" | "high";
  recommendedNextAction: string;
};

const READINESS_RANK: Record<MichelleReadiness, number> = {
  "NOT STARTED": 0,
  "IN PROGRESS": 1,
  BLOCKED: 2,
  "READY FOR VERIFICATION": 3,
  "VERIFICATION FAILED": 4,
  "READY WITH ACCEPTED RISK": 5,
  "FOUNDER ACTION REQUIRED": 6,
  "HUMAN EXPERT REQUIRED": 7,
  COMPLETE: 8,
  "FOUNDER ACCEPTED": 9,
};

export function classifySourceClass(input: {
  id?: string;
  authority?: "current" | "historical";
  founderAccepted?: boolean;
  locked?: boolean;
  draft?: boolean;
  superseded?: boolean;
}): SourceClass {
  if (input.superseded) return "SUPERSEDED";
  if (input.authority === "historical") return "HISTORICAL";
  if (input.draft) return "DRAFT";
  if (input.locked) return "LOCKED";
  if (input.founderAccepted) return "FOUNDER_ACCEPTED";
  if (input.authority === "current") return "CURRENT_AUTHORITATIVE";
  if (input.id?.includes("approved")) return "APPROVED";
  return "UNVERIFIED";
}

export function checkContradiction(inputs: ContradictionInput[]): ContradictionResult {
  if (inputs.length < 2) {
    return {
      contradiction: false,
      sources: inputs.map((item) => item.id),
      conflictingClaims: [],
      resolution: "none",
      note: "Fewer than two claims.",
    };
  }
  const claims = new Set(inputs.map((item) => item.claim.trim()));
  if (claims.size === 1) {
    return {
      contradiction: false,
      sources: inputs.map((item) => item.id),
      conflictingClaims: [],
      resolution: "none",
      note: "Claims agree.",
    };
  }
  const locked = inputs.find((item) => item.sourceClass === "LOCKED" || item.sourceClass === "FOUNDER_ACCEPTED");
  const historical = inputs.find((item) => item.sourceClass === "HISTORICAL" || item.sourceClass === "SUPERSEDED");
  const current = inputs.find((item) => item.sourceClass === "CURRENT_AUTHORITATIVE");
  if (locked && historical) {
    return {
      contradiction: true,
      sources: inputs.map((item) => `${item.id}:${item.sourceClass}`),
      conflictingClaims: [...claims],
      resolution: "locked_founder_wins",
      note: "Locked/Founder-accepted source prevails. Historical/superseded does not override.",
    };
  }
  if (current && historical) {
    return {
      contradiction: true,
      sources: inputs.map((item) => `${item.id}:${item.sourceClass}`),
      conflictingClaims: [...claims],
      resolution: "current_authoritative_wins",
      note: "Current authoritative source prevails over stale/historical material.",
    };
  }
  return {
    contradiction: true,
    sources: inputs.map((item) => `${item.id}:${item.sourceClass}`),
    conflictingClaims: [...claims],
    resolution: "escalate",
    note: "No accepted authority clearly resolves the conflict. Do not guess.",
  };
}

export function classifyRowReadiness(item: RemainingLaunchDeliverable): MichelleReadiness {
  if (item.founderActionRequired) return "FOUNDER ACTION REQUIRED";
  if (item.humanExpertRequired) return "HUMAN EXPERT REQUIRED";
  if (item.blockers.length > 0) return "BLOCKED";
  const status = item.status.toLowerCase();
  if (status.includes("founder accepted") || item.evidenceAcceptanceState === "founder_accepted") {
    return "FOUNDER ACCEPTED";
  }
  if (status.includes("complete") || status.includes("done")) {
    if (!item.evidenceRequiredForCompletion || item.evidenceAcceptanceState === "unverified") {
      return "VERIFICATION FAILED";
    }
    if (item.evidenceAcceptanceState === "accepted") return "COMPLETE";
    return "READY FOR VERIFICATION";
  }
  if (status.includes("in progress") || status.includes("partial")) return "IN PROGRESS";
  if (status.includes("not started") || status.includes("planned")) return "NOT STARTED";
  return "IN PROGRESS";
}

export function rejectUnsupportedComplete(claim: string, evidence: string[]): {
  accepted: boolean;
  readiness: MichelleReadiness;
  note: string;
} {
  const lower = claim.toLowerCase();
  const selfReport = /complete|done|production.?ready|verified/.test(lower);
  if (selfReport && evidence.length === 0) {
    return {
      accepted: false,
      readiness: "VERIFICATION FAILED",
      note: "STATUS CELL ≠ EVIDENCE. Specialist self-report is not completion.",
    };
  }
  if (/code exists|file exists|deployment exists|agent says complete/.test(lower) && evidence.length === 0) {
    return {
      accepted: false,
      readiness: "VERIFICATION FAILED",
      note: "Existence is not verification. Rejected unsupported Complete.",
    };
  }
  return { accepted: true, readiness: "READY FOR VERIFICATION", note: "Evidence present for verification." };
}

export function founderActionFromReserved(input: {
  row: string;
  action: string;
  reserved: boolean;
  routine: boolean;
}): FounderActionItem | null {
  if (input.routine && !input.reserved) return null;
  if (!input.reserved) return null;
  return {
    id: `founder-${input.row}`,
    row: input.row,
    action: input.action,
    whyFounderAuthorityRequired: "Row 15–19 reserved decision rights.",
    recommendation: "Founder decides; Michelle continues unrelated authorized work.",
    alternatives: ["Defer restricted action", "Continue unrelated queue"],
    evidence: ["ops/fab-5/operating-system.json decision-rights"],
    assumptions: ["Reserved rights have not been delegated"],
    dissent: "None — restriction is locked.",
    confidence: "high",
    dependency: input.row,
    urgency: "high",
    impactIfDelayed: "Restricted action stays paused; unrelated work continues.",
    resolved: false,
  };
}

export function buildRecommendation(partial: Partial<StrategicRecommendation> & { recommendation: string }): {
  ok: boolean;
  recommendation: StrategicRecommendation;
  note: string;
} {
  const recommendation: StrategicRecommendation = {
    recommendation: partial.recommendation,
    evidence: partial.evidence ?? [],
    assumptions: partial.assumptions ?? [],
    dissent: partial.dissent ?? "",
    confidence: partial.confidence ?? "low",
    impact: partial.impact ?? "",
    reversibility: partial.reversibility ?? "",
    founderDecisionRequired: partial.founderDecisionRequired === true,
  };
  const missing: string[] = [];
  if (recommendation.evidence.length === 0) missing.push("EVIDENCE");
  if (recommendation.assumptions.length === 0) missing.push("ASSUMPTIONS");
  if (!recommendation.dissent.trim()) missing.push("DISSENT");
  if (!recommendation.confidence) missing.push("CONFIDENCE");
  if (missing.length > 0) {
    return {
      ok: false,
      recommendation: {
        ...recommendation,
        recommendation: "Insufficient evidence. Do not manufacture certainty.",
        confidence: "low",
      },
      note: `Missing required fields: ${missing.join(", ")}`,
    };
  }
  return { ok: true, recommendation, note: "Strategic recommendation schema satisfied." };
}

export function synthesize(input: Partial<FinalSynthesis> & { whatWasRequired: string; whatWasDone: string }): FinalSynthesis {
  return {
    whatWasRequired: input.whatWasRequired,
    whatWasDone: input.whatWasDone,
    whoExecuted: input.whoExecuted ?? "michelle",
    whatWasVerified: input.whatWasVerified ?? "Independent verification pending evidence",
    whatEvidenceExists: input.whatEvidenceExists ?? "Catalog + run packet",
    whatFailed: input.whatFailed ?? "NONE",
    whatWasCorrected: input.whatWasCorrected ?? "NONE",
    whatRemains: input.whatRemains ?? "See remaining launch-critical queue",
    whatIsBlocked: input.whatIsBlocked ?? "NONE",
    whatRequiresFounder: input.whatRequiresFounder ?? "NONE",
    whatRequiresHumanExpert: input.whatRequiresHumanExpert ?? "NONE",
    scheduleImpact: input.scheduleImpact ?? "Launch date unchanged (Founder-reserved)",
    launchImpact: input.launchImpact ?? "No independent launch-date change",
    confidence: input.confidence ?? "medium",
    recommendedNextAction: input.recommendedNextAction ?? "Continue authorized next work",
  };
}

export function estimateRemaining(items: RemainingLaunchDeliverable[]): EstimateRecord {
  const remaining = items.length;
  const critical = items.filter((item) => item.criticalPath).length;
  return {
    row: "remaining-launch-critical",
    scope: `${remaining} remaining launch-critical deliverables`,
    owner: "michelle",
    dependencies: ["Nia hosted stand-up", "Founder-reserved items"],
    bestCase: `${Math.max(1, Math.ceil(remaining / 8))} parallel-work slices if Nia is stood up and Founder items clear`,
    expectedCase: `${remaining} remaining items; critical-path spine ${critical} items`,
    riskCase: "Critical-path delay if Nia/backend/Founder gates stay closed",
    assumptions: [
      "Adapter remainingLaunchCritical is current",
      "Nia is not yet hosted",
      "Launch date is Founder-reserved",
    ],
    confidence: "medium",
    criticalPathImpact: `${critical} items currently flagged critical-path`,
  };
}

export function deriveCriticalPath(adapter: {
  criticalPath: Array<number | string>;
  remainingLaunchCritical: RemainingLaunchDeliverable[];
}): { rows: Array<number | string>; remainingOnPath: RemainingLaunchDeliverable[]; note: string } {
  const remainingIds = new Set(
    adapter.remainingLaunchCritical.map((item) => String(item.spreadsheetRow ?? item.id)),
  );
  const live = adapter.criticalPath.filter((row) => remainingIds.has(String(row)));
  return {
    rows: live.length > 0 ? live : adapter.criticalPath,
    remainingOnPath: adapter.remainingLaunchCritical.filter((item) => item.criticalPath),
    note: "Critical path derived from remaining launch-critical items, not a frozen copy of completed rows.",
  };
}

export function scheduleRealism(input: { target: string; demanded: string; remainingCritical: number }): {
  report: FounderReportClassMichelle;
  cause: string;
  currentForecast: string;
  recoveryOptions: string[];
  confidence: "low" | "medium" | "high";
} {
  const unrealistic = /tomorrow|today|same day|24 hours/i.test(input.demanded) && input.remainingCritical > 5;
  if (!unrealistic) {
    return {
      report: "NONE",
      cause: "Demand is not contradicted by remaining critical-path volume.",
      currentForecast: `Target ${input.target} remains Founder-owned; Michelle does not change it.`,
      recoveryOptions: ["Continue authorized work"],
      confidence: "medium",
    };
  }
  return {
    report: "SCHEDULE / LAUNCH THREAT",
    cause: "Requested deadline is incompatible with remaining critical-path volume.",
    currentForecast: `Target ${input.target} unchanged. ${input.remainingCritical} remaining critical items cannot honestly complete on ${input.demanded}.`,
    recoveryOptions: [
      "Founder changes launch date (reserved)",
      "Reduce scope (Founder-reserved)",
      "Parallelize only work that is actually independent",
    ],
    confidence: "high",
  };
}

export function processOptimization(input: { serializedIndependent: boolean; duplicateApprovals: boolean }): {
  withinAuthority: boolean;
  improvement: string;
} {
  if (input.serializedIndependent) {
    return {
      withinAuthority: true,
      improvement: "Independent Imani and Nia work should run in parallel under Michelle. Do not serialize without a dependency.",
    };
  }
  if (input.duplicateApprovals) {
    return {
      withinAuthority: true,
      improvement: "Drop redundant Founder approvals for already-authorized routine execution.",
    };
  }
  return { withinAuthority: true, improvement: "No inefficiency detected in this packet." };
}

export function niaCapability(): { status: "OPERATIONAL" | "PENDING NIA STAND-UP"; note: string } {
  return {
    status: "OPERATIONAL",
    note: "Nia hosted stand-up is operational. Underlying product/curriculum/community surfaces may still be pending. AGENT CAPABILITY COMPLETE is not product-work complete.",
  };
}

export async function currentSourceSnapshot(): Promise<{
  sources: SourceRecord[];
  launchAnswer: string;
  remaining: number;
  founderQueue: string;
}> {
  const sources = await retrieveSources({
    agent: "michelle",
    topics: ["operating-system", "locked-founder-decisions", "august-launch-tab", "decision-log"],
  });
  const remaining = await remainingDeliverables();
  const founder = await queryLaunchView("founder_action");
  const remainingView = await queryLaunchView("remaining_count");
  return {
    sources,
    launchAnswer: remainingView.answer,
    remaining: remaining.length,
    founderQueue: founder.answer,
  };
}

export async function buildReadinessRegister(): Promise<
  Array<{ id: string; row: string; deliverable: string; owner: string; readiness: MichelleReadiness; rank: number }>
> {
  const remaining = await remainingDeliverables();
  return remaining.slice(0, 40).map((item) => {
    const readiness = classifyRowReadiness(item);
    return {
      id: item.id,
      row: item.spreadsheetRow != null ? String(item.spreadsheetRow) : item.id,
      deliverable: item.deliverable,
      owner: item.primaryOwner,
      readiness,
      rank: READINESS_RANK[readiness],
    };
  });
}

export function legalBoundary(command: string): { blocked: boolean; note: string } {
  const classification = classifyCommand(command);
  if (classification.humanExpert || classification.intent === "legal_interpretation") {
    return { blocked: true, note: "Human legal expert required. Michelle issues no legal conclusion." };
  }
  return { blocked: false, note: "Not a legal-judgment request." };
}

export function launchDateGate(command: string): { blocked: boolean; note: string } {
  const classification = classifyCommand(command);
  if (classification.intent === "launch_date_change" || classification.founderApproval) {
    return { blocked: true, note: "Launch-date change is Founder-reserved. Queued, not executed." };
  }
  return { blocked: false, note: "Not a launch-date change." };
}

export async function operationalCatalog() {
  const [os, adapter] = await Promise.all([loadOperatingSystem(), loadLaunchAdapter()]);
  return { os, adapter };
}

export function newOperationalDecision(input: {
  row: string;
  decision: string;
  id?: string;
}): MichelleDecisionRecord {
  return {
    id: input.id ?? `md-${Date.now()}`,
    at: new Date().toISOString(),
    row: input.row,
    workstream: "OPERATIONS",
    decision: input.decision,
    decisionOwner: "michelle",
    authoritySource: "ops/fab-5/operating-system.json Row 15 authority B/A operational",
    evidence: ["ops/fab-5/launch-rows.json", "ops/fab-5/decision-log.json"],
    assumptions: ["Does not change launch date, pricing, or product scope"],
    dissent: "None recorded; routine operational sequencing only.",
    confidence: "medium",
    impact: "Updates Michelle operating overlay; does not mutate Founder-locked decisions.",
    reversibility: "Reversible by appending a superseding operational decision.",
    founderApprovalRequired: false,
    humanExpertRequired: false,
    supersedes: null,
    status: "appended",
  };
}
