import { retrieveSources } from "@/lib/fab-5/source";
import { loadOperatingSystem } from "@/lib/fab-5/os";

export const TRIPLE_E_SOURCE =
  "ops/fab-5/operating-system.json nia.mission; ops/fab-5/launch-rows.json Independent Fab 5 Triple E Review (Energy, Elegance, and Excellence)";

export type TripleEDimension = "Energy" | "Elegance" | "Excellence";

export type NiaSeverity = "BLOCKER" | "CRITICAL" | "MAJOR" | "MINOR" | "COSMETIC";

export type SourceClassNia =
  | "APPROVED"
  | "LOCKED"
  | "FOUNDER_ACCEPTED"
  | "CURRENT"
  | "DRAFT"
  | "SUPERSEDED"
  | "HISTORICAL"
  | "UNVERIFIED";

export type TouchpointEval = {
  touchpoint: string;
  expectedExperience: string;
  actualExperience: string;
  tripleE: Record<TripleEDimension, { result: "PASS" | "FAIL" | "UNVERIFIED"; evidence: string }>;
  accessibilityResult: string;
  clarityResult: string;
  usabilityResult: string;
  contentResult: string;
  functionalResult: string;
  evidence: string[];
  defects: string[];
  severity: NiaSeverity;
  owner: string;
  correctionRequired: string;
  retestRequired: boolean;
  releaseImpact: "NONE" | "NIA RELEASE BLOCK" | "CORRECT THEN RETEST";
  status: "PASS" | "FAIL" | "BLOCKED";
};

export const TRIPLE_E_DIMENSIONS: Record<
  TripleEDimension,
  { meaning: string; acceptance: string; evidence: string; severity: string; block: string }
> = {
  Energy: {
    meaning: "Energy — first dimension of the approved Architect promise (Energy, Elegant, Excellent).",
    acceptance: "Participant-facing interaction must evidence the approved Energy promise; self-report is not evidence.",
    evidence: "Actual implemented experience vs approved Journey/brand/operating-system sources.",
    severity: "Material Energy failure against the approved promise is CRITICAL/BLOCKER; preference is not.",
    block: "Unresolved critical Energy defect may block release (launch-rows Independent Fab 5 Triple E Review).",
  },
  Elegance: {
    meaning: "Elegance / Elegant — second dimension of the approved Architect promise.",
    acceptance: "Presentation and coherence must match approved identity; a mockup is not the actual experience.",
    evidence: "Implemented surface compared to approved brand/Journey sources.",
    severity: "Material Elegant/Elegance failure vs approved promise is CRITICAL/BLOCKER.",
    block: "Unresolved critical Elegance defect may block release.",
  },
  Excellence: {
    meaning: "Excellence / Excellent — third dimension of the approved Architect promise.",
    acceptance: "Delivery must meet approved transformation/experience quality; existence of copy is not Excellence.",
    evidence: "Actual experience plus Triple E is evidenced, not asserted (operating-system nia.successCriteria).",
    severity: "Material Excellence failure vs approved promise is CRITICAL/BLOCKER.",
    block: "Unresolved critical Excellence defect may block release.",
  },
};

export async function approvedExperiencePromise(): Promise<{
  promise: string;
  sources: string[];
  class: SourceClassNia;
}> {
  const os = await loadOperatingSystem();
  const nia = os.nia as { mission: string };
  const sources = await retrieveSources({
    agent: "nia",
    topics: ["approved-brand", "approved-product-curriculum", "operating-system"],
  });
  return {
    promise: nia.mission,
    sources: [TRIPLE_E_SOURCE, ...sources.map((item) => item.label)],
    class: "FOUNDER_ACCEPTED",
  };
}

export function evaluateTouchpoint(input: {
  touchpoint: string;
  expected: string;
  actual: string;
  specSaysPass?: boolean;
  actualDefect?: boolean;
  preferenceOnly?: boolean;
  accessibilityFail?: boolean;
}): TouchpointEval {
  const actualWins = input.specSaysPass === true && input.actualDefect === true;
  const preference = input.preferenceOnly === true && !input.actualDefect;
  const material = actualWins || input.actualDefect === true || input.accessibilityFail === true;
  const fail = material && !preference;
  const dim = (name: TripleEDimension): TouchpointEval["tripleE"][TripleEDimension] => ({
    result: fail ? "FAIL" : preference ? "PASS" : input.actualDefect === false ? "PASS" : "UNVERIFIED",
    evidence: fail
      ? `Actual experience (${input.actual}) vs approved requirement (${input.expected}). Spec PASS is not evidence.`
      : `${name} assessed against ${TRIPLE_E_SOURCE}`,
  });
  const severity: NiaSeverity = preference
    ? "COSMETIC"
    : input.accessibilityFail
      ? "BLOCKER"
      : fail
        ? "CRITICAL"
        : "MINOR";
  const block = fail && (severity === "BLOCKER" || severity === "CRITICAL");
  return {
    touchpoint: input.touchpoint,
    expectedExperience: input.expected,
    actualExperience: input.actual,
    tripleE: { Energy: dim("Energy"), Elegance: dim("Elegance"), Excellence: dim("Excellence") },
    accessibilityResult: input.accessibilityFail ? "FAIL critical accessibility" : "No critical accessibility failure evidenced",
    clarityResult: fail ? "Actual experience is unclear vs approved promise" : "Clarity holds against approved copy",
    usabilityResult: fail ? "Critical path unusable or misleading" : "Usable against approved flow",
    contentResult: fail ? "Participant-facing content does not match approved requirement" : "Content aligned or not a material miss",
    functionalResult: fail ? "FUNCTION WORKS LOCALLY / SPEC PASS is not EXPERIENCE TESTED" : "Functional result consistent with approved surface",
    evidence: [TRIPLE_E_SOURCE, `touchpoint:${input.touchpoint}`, `actual:${input.actual}`],
    defects: fail ? [`${input.touchpoint}: ${input.actual}`] : [],
    severity,
    owner: fail ? "imani" : "nia",
    correctionRequired: fail ? "Restore implemented experience to approved requirement. Nia retests independently." : "NONE",
    retestRequired: fail,
    releaseImpact: block ? "NIA RELEASE BLOCK" : preference ? "NONE" : "NONE",
    status: block ? "BLOCKED" : fail ? "FAIL" : "PASS",
  };
}

export function mayReleaseBlock(evalResult: TouchpointEval): boolean {
  if (evalResult.severity === "COSMETIC" || evalResult.severity === "MINOR") return false;
  return evalResult.releaseImpact === "NIA RELEASE BLOCK" && evalResult.status === "BLOCKED";
}

export function independentRetest(input: {
  specialistSaysComplete: boolean;
  niaInspectedActual: boolean;
  actualNowMatchesApproved: boolean;
}): { cleared: boolean; note: string } {
  if (input.specialistSaysComplete && !input.niaInspectedActual) {
    return { cleared: false, note: "Imani self-certification is not acceptance. Nia must independently verify actual experience." };
  }
  if (input.niaInspectedActual && input.actualNowMatchesApproved) {
    return { cleared: true, note: "Independent Nia retest of actual experience passed." };
  }
  return { cleared: false, note: "Block remains until Nia independently retests and evidence demonstrates resolution." };
}

export function curriculumCompleteness(components: { required: string[]; present: string[] }): {
  missing: string[];
  status: "COMPLETE" | "INCOMPLETE";
} {
  const missing = components.required.filter((item) => !components.present.includes(item));
  return { missing, status: missing.length ? "INCOMPLETE" : "COMPLETE" };
}

export function curriculumCoherence(input: { contradiction?: string; outOfSequence?: string }): {
  issue: string | null;
  status: "COHERENT" | "CONTRADICTORY" | "OUT OF SEQUENCE";
} {
  if (input.contradiction) return { issue: input.contradiction, status: "CONTRADICTORY" };
  if (input.outOfSequence) return { issue: input.outOfSequence, status: "OUT OF SEQUENCE" };
  return { issue: null, status: "COHERENT" };
}

export function teachability(instruction: string): { defect: boolean; note: string } {
  const confusing = /unclear|confusing|undefined terms|no example|wall of text/i.test(instruction);
  return {
    defect: confusing,
    note: confusing
      ? "CONTENT EXISTS is not CONTENT CAN BE LEARNED. Instruction is not teachable as written."
      : "Instruction is learnable on the evidence provided.",
  };
}

export function measurability(input: { outcome: string; measure?: string }): {
  gap: boolean;
  model: {
    outcome: string;
    indicator: string;
    measure: string;
    source: string;
    successCriterion: string;
    limitations: string;
  };
} {
  const hasMeasure = Boolean(input.measure?.trim());
  return {
    gap: !hasMeasure,
    model: {
      outcome: input.outcome,
      indicator: hasMeasure ? input.measure! : "NONE EVIDENCED",
      measure: hasMeasure ? input.measure! : "NONE",
      source: hasMeasure ? "approved assessment/journey evidence" : "UNVERIFIED",
      successCriterion: hasMeasure ? input.measure! : "Cannot be claimed",
      limitations: hasMeasure
        ? "Do not treat as clinical validation."
        : "Transformation claim lacks an evidence model. Do not manufacture success.",
    },
  };
}

export function assessmentBoundary(request: string): { rejected: boolean; note: string } {
  const clinical = /clinical|diagnos|psychometric validation|mental health|DSM|validated instrument/i.test(request);
  return {
    rejected: clinical,
    note: clinical
      ? "Unsupported clinical/psychometric conclusion rejected. Nia may not diagnose or fabricate validation."
      : "Within learning-interpretation authority.",
  };
}

export function improvementLoop(confusionEvidence: string): {
  observe: string;
  classify: string;
  recommend: string;
  authority: "implement_if_authorized" | "escalate";
} {
  return {
    observe: confusionEvidence,
    classify: "LEARNING ISSUE — teachability/clarity",
    recommend: "Clarify instruction within approved content; do not change Journey architecture.",
    authority: /philosophy|promise|pricing|launch scope|brand position/i.test(confusionEvidence)
      ? "escalate"
      : "implement_if_authorized",
  };
}

export function classifyLaunchVsFuture(input: {
  item: string;
  approvedCommitment?: boolean;
  legalSafety?: boolean;
  materialExperience?: boolean;
  technicalDependency?: boolean;
  optional?: boolean;
}): {
  item: string;
  launchRequirement: "YES" | "NO" | "UNDETERMINED";
  recommendedTiming: "LAUNCH" | "DEFER";
  confidence: "low" | "medium" | "high";
} {
  const required =
    input.approvedCommitment === true ||
    input.legalSafety === true ||
    input.materialExperience === true ||
    input.technicalDependency === true;
  if (input.optional && !required) {
    return { item: input.item, launchRequirement: "NO", recommendedTiming: "DEFER", confidence: "high" };
  }
  if (required) {
    return { item: input.item, launchRequirement: "YES", recommendedTiming: "LAUNCH", confidence: "high" };
  }
  return { item: input.item, launchRequirement: "NO", recommendedTiming: "DEFER", confidence: "medium" };
}

export function scopeDrift(input: { daysBeforeLaunch: boolean; optionalMajor: boolean }): {
  blockExpansion: boolean;
  note: string;
} {
  if (input.daysBeforeLaunch && input.optionalMajor) {
    return { blockExpansion: true, note: "DEFER. Optional major feature is not launch-critical. Do not consume launch capacity." };
  }
  return { blockExpansion: false, note: "Within approved launch scope." };
}

export function competitiveClaim(input: { evidence?: string; liveSourced?: boolean }): {
  accepted: boolean;
  note: string;
  dependency: string;
} {
  if (!input.evidence && !input.liveSourced) {
    return {
      accepted: false,
      note: "Unsupported competitor claim. Fact vs inference required. Do not fake intelligence from model memory.",
      dependency: "Hosted live research required when freshness matters.",
    };
  }
  return {
    accepted: true,
    note: input.liveSourced
      ? "Observation retained with live source provenance."
      : "Observation retained with source.",
    dependency: "NONE",
  };
}

export function futureTrend(signal: string): { class: "OBSERVED SIGNAL" | "EMERGING TREND" | "SPECULATION"; dissent: string } {
  if (/maybe|might|could|speculate|someday/i.test(signal)) {
    return { class: "SPECULATION", dissent: "Treat as speculation, not fact. Do not add launch scope." };
  }
  return { class: "OBSERVED SIGNAL", dissent: "Requires dated source before acting." };
}

export function categoryStrategy(request: string): { escalate: boolean; note: string } {
  const reserved = /reposition|rebrand|new category name|change the promise|pricing strategy|launch strategy/i.test(request);
  return {
    escalate: reserved,
    note: reserved
      ? "Founder-reserved. Nia may recommend only. No autonomous identity/promise/pricing/launch-strategy change."
      : "Within research/recommend authority.",
  };
}

export function niaToImaniHandoff(evalResult: TouchpointEval): {
  touchpoint: string;
  expectedExperience: string;
  actualExperience: string;
  defect: string;
  severity: NiaSeverity;
  evidence: string[];
  technicalCorrectionRequired: string;
  acceptanceCriteria: string;
  retestRequired: boolean;
} {
  return {
    touchpoint: evalResult.touchpoint,
    expectedExperience: evalResult.expectedExperience,
    actualExperience: evalResult.actualExperience,
    defect: evalResult.defects[0] ?? "NONE",
    severity: evalResult.severity,
    evidence: evalResult.evidence,
    technicalCorrectionRequired: evalResult.correctionRequired,
    acceptanceCriteria: "Actual implemented experience matches approved requirement. Nia independent retest required.",
    retestRequired: true,
  };
}

export function niaToMichelleHandoff(evalResult: TouchpointEval): {
  status: string;
  finding: string;
  evidence: string[];
  severity: NiaSeverity;
  releaseImpact: string;
  correction: string;
  retest: boolean;
  scopeClassification: "LAUNCH" | "FUTURE";
  dependencies: string[];
  confidence: "low" | "medium" | "high";
} {
  return {
    status: evalResult.status,
    finding: evalResult.defects[0] ?? "No material experience defect",
    evidence: evalResult.evidence,
    severity: evalResult.severity,
    releaseImpact: evalResult.releaseImpact,
    correction: evalResult.correctionRequired,
    retest: evalResult.retestRequired,
    scopeClassification: evalResult.releaseImpact === "NIA RELEASE BLOCK" ? "LAUNCH" : "FUTURE",
    dependencies: evalResult.owner === "imani" ? ["imani technical correction", "nia independent retest"] : [],
    confidence: "medium",
  };
}

export function founderUnavailableNia(input: { routine: boolean; reserved: boolean }): {
  continueRoutine: boolean;
  queueReserved: boolean;
} {
  return { continueRoutine: true, queueReserved: input.reserved };
}
