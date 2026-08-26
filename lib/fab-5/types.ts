export type OperatingAgentId = "michelle" | "imani" | "nia";

export type LaunchExecutiveId = "kimberly" | "michelle" | "imani" | "nia";

export type WorkstreamId =
  | "TECHNOLOGY"
  | "OPERATIONS"
  | "MARKETING"
  | "FINANCE"
  | "EXPERIENCE"
  | "LEARNING"
  | "COMMUNITY"
  | "INNOVATION"
  | "LEGAL";

export type AuthorityCode = "A" | "B" | "C" | "D" | "E" | "F";

export type FounderReportClass =
  | "ACTION_REQUIRED"
  | "DECISION_REQUIRED"
  | "MATERIAL_BLOCKER"
  | "MATERIAL_RISK"
  | "ROW_READY_FOR_FOUNDER_ACCEPTANCE"
  | "SCHEDULE_LAUNCH_THREAT";

export type ReadinessState =
  | "DESIGNED"
  | "BUILT"
  | "TESTED"
  | "PRODUCTION-READY";

export type CommunicationAction =
  | "DRAFT"
  | "SEND"
  | "PUBLISH"
  | "RESPOND"
  | "ESCALATE";

export type ToolPermission =
  | "READ"
  | "WRITE"
  | "EXECUTE"
  | "ADMIN"
  | "APPROVAL-ONLY"
  | "NONE";

export type LaunchRowRecord = {
  number: number;
  phase: string;
  deliverable: string;
  status: string;
  mutating: boolean;
  dependencies: number[];
  description: string;
  evidence: string[];
  percentComplete?: number;
  founderAcceptance?: string;
  primaryWorkstream?: WorkstreamId;
  primaryOwner?: LaunchExecutiveId;
  supportingOwners?: LaunchExecutiveId[];
  blockers?: string[];
  remainingLaunchCritical?: boolean;
  founderActionRequired?: boolean;
  humanExpertRequired?: boolean;
  cost?: string | null;
  nextAction?: string;
  evidenceAcceptanceState?: string;
};

export type RemainingLaunchDeliverable = {
  id: string;
  spreadsheetRow: number | null;
  spreadsheetNote?: string;
  phase: string;
  deliverable: string;
  description: string;
  percentComplete: number;
  status: string;
  primaryWorkstream: WorkstreamId;
  secondaryWorkstreams?: WorkstreamId[];
  primaryOwner: LaunchExecutiveId;
  supportingOwners: LaunchExecutiveId[];
  dependencies: string[];
  blockers: string[];
  founderActionRequired: boolean;
  humanExpertRequired: boolean;
  evidenceRequiredForCompletion: string;
  cost: string | null;
  nextAction: string;
  evidenceAcceptanceState: string;
  priority: number;
  criticalPath: boolean;
  source: string[];
};

export type SourceRecord = {
  id: string;
  rank: number;
  label: string;
  authority: "current" | "historical";
  excerpt: string;
};

export type HandoffPacket = {
  id: string;
  task: string;
  sourceAuthority: string[];
  owner: OperatingAgentId;
  objective: string;
  constraints: string[];
  dependencies: string[];
  toolsAuthorized: string[];
  acceptanceCriteria: string[];
  evidenceRequired: string[];
  escalationConditions: string[];
  qa?: Record<string, unknown>;
};

export type SpecialistReturn = {
  agent: OperatingAgentId;
  status: "complete" | "blocked" | "escalated" | "failed" | "rejected";
  workPerformed: string[];
  evidence: EvidenceItem[];
  testResults: string[];
  blockers: BlockRecord[];
  risks: string[];
  decisionsMade: string[];
  escalationsRequired: EscalationRecord[];
  recommendedNextAction: string;
  startedAt: string;
  endedAt: string;
};

export type EvidenceItem = {
  kind:
    | "source"
    | "file"
    | "test"
    | "readiness"
    | "fidelity"
    | "trace"
    | "engineering_handoff";
  summary: string;
  ref?: string;
};

export type BlockRecord = {
  blockingAgent: OperatingAgentId;
  issue: string;
  evidence: string;
  severity: "low" | "medium" | "high" | "critical";
  owner: OperatingAgentId | "founder" | "human_legal_expert";
  requiredCorrection: string;
  retestRequirement: string;
};

export type EscalationRecord = {
  to: "michelle" | "founder" | "human_legal_expert";
  reason: string;
  decisionRequired?: string;
  recommendation?: string;
  alternatives?: string[];
  impact?: string;
  risk?: string;
  reversibility?: string;
  evidence?: string;
};

export type FounderGateRequest = {
  decisionRequired: string;
  why: string;
  recommendation: string;
  alternatives: string[];
  impact: string;
  risk: string;
  reversibility: string;
  evidence: string;
};

export type EngineeringHandoff = {
  executionLayer: "cursor";
  task: string;
  filesInScope: string[];
  testsRequired: string[];
  mutating: boolean;
};

export type OrchestrationResult = {
  runId: string;
  command: string;
  rowNumber?: number;
  mode: "normal" | "read_only" | "founder_unavailable" | "qa";
  plan: string[];
  assignments: HandoffPacket[];
  specialistResults: SpecialistReturn[];
  evidence: EvidenceItem[];
  blocks: BlockRecord[];
  escalations: EscalationRecord[];
  founderReports: FounderReportClass[];
  founderGate?: FounderGateRequest;
  founderActionRequired: boolean;
  synthesis: string;
  finalStatus:
    | "synthesized"
    | "blocked"
    | "founder_gate"
    | "human_expert_gate"
    | "failed";
  parallel: boolean;
  tracePath?: string;
};

export type TraceEvent = {
  at: string;
  type: string;
  agent?: OperatingAgentId;
  detail: Record<string, unknown>;
};

export type RunTrace = {
  runId: string;
  startedAt: string;
  endedAt?: string;
  initiatingRequest: string;
  rowNumber?: number;
  manager: "michelle";
  events: TraceEvent[];
  result?: OrchestrationResult;
};
