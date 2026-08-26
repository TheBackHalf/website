export const OPERATING_AGENTS = ["michelle", "imani", "nia"] as const;
export type OperatingAgentId = (typeof OPERATING_AGENTS)[number];

export const WORK_STATUSES = [
  "QUEUED",
  "READY",
  "CLAIMED",
  "RUNNING",
  "BLOCKED",
  "DEPENDENCY_GATED",
  "DATE_GATED",
  "FOUNDER_GATED",
  "RETRY",
  "VALIDATING",
  "ACCEPTANCE_READY",
  "COMPLETE",
  "FAILED",
  "CANCELLED",
] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export const WORK_SOURCES = [
  "command_center",
  "recurring",
  "schedule",
  "system_event",
  "kpi_threshold",
  "support_signal",
  "product_event",
  "incident",
  "monitoring",
  "agent_follow_up",
  "company_objective",
  "cross_agent_dependency",
  "controlled_test",
] as const;
export type WorkSource = (typeof WORK_SOURCES)[number];

export const ACTION_CLASSES = ["A", "B", "C", "D"] as const;
export type ActionClass = (typeof ACTION_CLASSES)[number];

export const RUNTIME_CLASSES = ["hosted", "engineering"] as const;
export type RuntimeClass = (typeof RUNTIME_CLASSES)[number];

export const DECISION_STATUSES = ["OPEN", "APPROVED", "REJECTED", "REVIEW"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export type WorkItem = {
  workId: string;
  source: WorkSource;
  sourceReference: string;
  title: string;
  description: string;
  ownerAgent: OperatingAgentId;
  priority: number;
  status: WorkStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  blockedReason: string | null;
  dependencyIds: string[];
  parentWorkId: string | null;
  attemptCount: number;
  maxAttempts: number;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  evidenceRefs: string[];
  founderGateRequired: boolean;
  founderDecisionId: string | null;
  nextAction: string | null;
  errorState: string | null;
  checkpoint: Record<string, unknown> | null;
  resourceKey: string | null;
  actionClass: ActionClass;
  runtimeClass: RuntimeClass;
  controlledTest: boolean;
  synthetic: boolean;
};

export type FounderDecision = {
  decisionId: string;
  requestingAgent: OperatingAgentId;
  workId: string;
  decisionRequired: string;
  agentRecommendation: string;
  reason: string;
  riskIfDelayed: string;
  deadline: string | null;
  allowedResponse: string;
  status: DecisionStatus;
  createdAt: string;
  resolvedAt: string | null;
  founderResponse: string | null;
  executionResumedAt: string | null;
  severity: "normal" | "urgent";
  controlledTest: boolean;
};

export type NotificationRecord = {
  notificationId: string;
  decisionId: string;
  channel: "dashboard" | "email" | "sms";
  severity: "normal" | "urgent";
  destinationKind: "founder_email" | "founder_sms" | "dashboard";
  status: "queued" | "sent" | "failed" | "not_configured" | "controlled_test_held";
  error: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type AgentHeartbeat = {
  agent: OperatingAgentId;
  lastHeartbeat: string;
  currentWorkId: string | null;
  queueDepth: number;
  blockedCount: number;
  failedCount: number;
  lastCompletionAt: string | null;
  lastCheckpoint: Record<string, unknown> | null;
  runtimeError: string | null;
};

export type AuditEvent = {
  id?: number;
  at: string;
  agent: OperatingAgentId | "system" | "founder";
  action: string;
  workId: string | null;
  result: string;
  detail: Record<string, unknown>;
};

export const ENGINEERING_JOB_STATUSES = [
  "blocked_unconfigured",
  "launching",
  "running",
  "validating",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type EngineeringJobStatus = (typeof ENGINEERING_JOB_STATUSES)[number];

export type EngineeringJob = {
  jobId: string;
  workId: string;
  sourceReference: string;
  ownerAgent: OperatingAgentId;
  provider: "cursor_cloud_agent";
  providerAgentId: string | null;
  providerRunId: string | null;
  repository: string;
  branch: string | null;
  prUrl: string | null;
  commitSha: string | null;
  prompt: string;
  status: EngineeringJobStatus;
  heartbeatAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  filesChanged: string[];
  commands: string[];
  validation: Record<string, unknown>;
  error: string | null;
  retryCount: number;
  founderDecisionRequired: boolean;
  controlledTest: boolean;
  synthetic: boolean;
  detail: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type TickResult = {
  ok: boolean;
  at: string;
  watchdogReleased: number;
  dateUnlocked: number;
  dependencyUnlocked: number;
  claimed: string[];
  completed: string[];
  failed: string[];
  retried: string[];
  skippedEngineering: number;
  engineeringJobsLaunched: number;
  engineeringJobsPolled: number;
  engineeringJobsIngested: number;
  errors: string[];
  parallel: boolean;
};

export function isOperatingAgent(value: string): value is OperatingAgentId {
  return (OPERATING_AGENTS as readonly string[]).includes(value);
}

export function isKimberlyAi(value: string): boolean {
  return /kimberly walker\s*\(ai\)|kimberly_ai|kimberly-ai/i.test(value.trim());
}

export function isHumanFounderOwner(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (isKimberlyAi(value)) return false;
  return (
    v === "kim" ||
    v === "kimberly" ||
    v === "kimberly walker" ||
    v === "kimberly walker (human)" ||
    v === "founder"
  );
}
