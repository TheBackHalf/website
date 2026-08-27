/**
 * Fab 5 Operating Model V2 — permanent company architecture.
 * Three persistent business agents. Cursor Cloud Agents are a controlled
 * engineering resource, not the routine execution engine.
 */

import {
  countActiveEngineeringJobs,
  enqueueWork,
  getWork,
  listOpenDecisions,
  sumCostSince,
} from "@/lib/fab-5/aos/store";
import type { OperatingAgentId, RuntimeClass, WorkItem } from "@/lib/fab-5/aos/types";
import { OPERATING_AGENTS } from "@/lib/fab-5/aos/types";

export const OPERATING_MODEL_VERSION = "v2";

export const BUSINESS_AGENTS = [
  {
    id: "michelle" as const,
    name: "Michelle Northstar",
    role: "Chief of Staff & Operations Officer",
    owns: [
      "operational email/inbox monitoring and routing",
      "support/SLA oversight",
      "work queues and follow-up",
      "cross-functional coordination",
      "daily operating review",
      "Founder briefing and exception escalation",
    ],
  },
  {
    id: "imani" as const,
    name: "Imani Heartbeat",
    role: "Chief Technology & Risk Officer",
    owns: [
      "production/application health",
      "APIs/database/authentication",
      "payments and analytics health",
      "errors/security signals",
      "technical incident response",
      "engineering orchestration",
    ],
  },
  {
    id: "nia" as const,
    name: "Nia Prism",
    role: "Chief Experience & Transformation Officer",
    owns: [
      "approved social/content execution",
      "publishing verification",
      "engagement monitoring",
      "Architect experience",
      "customer/community experience",
      "experience/marketing issue routing",
    ],
  },
] as const;

export const EXECUTION_PATHS = [
  "ROUTINE_DETERMINISTIC",
  "AI_REASONING",
  "ENGINEERING_REQUIRED",
  "FOUNDER_RESERVED",
  "HUMAN_EXPERT",
] as const;
export type ExecutionPath = (typeof EXECUTION_PATHS)[number];

export type CursorMode = "normal" | "hypercare";

export type ExecutionClassification = {
  path: ExecutionPath;
  engineeringRequired: boolean;
  runtimeClass: RuntimeClass;
  nextAction: string;
  reason: string;
};

export type CursorLaunchDecision = {
  allowed: boolean;
  reason: "ok" | "not_engineering" | "at_capacity" | "budget_exhausted" | "not_configured";
  mode: CursorMode;
  maxConcurrent: number;
  active: number;
  monthlyUsed: number;
  monthlyLimit: number;
};

export const CADENCE_WORK = [
  {
    workId: "aos-omv2-michelle-ops-cycle",
    ownerAgent: "michelle" as const,
    title: "Michelle hosted operations cycle",
    description:
      "Hosted operations/inbox/support/work-queue cycle. Deterministic inspect of support SLA, AOS queues, and Founder exceptions. Do not invoke Cursor. Do not mark Launch Readiness rows Complete.",
    intervalMs: 15 * 60 * 1000,
  },
  {
    workId: "aos-omv2-imani-tech-cycle",
    ownerAgent: "imani" as const,
    title: "Imani hosted technology/risk cycle",
    description:
      "Hosted technology/risk/health cycle. Deterministic production health, payments/auth signals, and engineering-queue inspect. Do not invoke Cursor to check health. Do not mark Launch Readiness rows Complete.",
    intervalMs: 15 * 60 * 1000,
  },
  {
    workId: "aos-omv2-nia-experience-cycle",
    ownerAgent: "nia" as const,
    title: "Nia hosted experience/content cycle",
    description:
      "Hosted experience/content/engagement cycle. Deterministic inspect of customer-facing surfaces and the approved social queue. Do not invoke Cursor. Do not publish. Do not mark Launch Readiness rows Complete.",
    intervalMs: 15 * 60 * 1000,
  },
] as const;

export const GAP_WORK = [
  {
    workId: "aos-omv2-gap-michelle-ops-inbox",
    ownerAgent: "michelle" as const,
    title: "Gap — operational inbox monitoring beyond support@ IMAP",
    description:
      "Support IMAP poll exists. General operational email/inbox monitoring and routing beyond support@ is not yet a hosted capability. Implement as hosted mail/API work. Do not route this through Cursor Cloud Agents forever.",
  },
  {
    workId: "aos-omv2-gap-imani-security-signals",
    ownerAgent: "imani" as const,
    title: "Gap — hosted security/error signal aggregation",
    description:
      "Production health and monitoring crons exist. A dedicated hosted security/error-signal aggregator for Imani is not yet implemented. Implement as hosted jobs/APIs. Do not route routine signal checks through Cursor Cloud Agents.",
  },
  {
    workId: "aos-omv2-gap-nia-publish-verify",
    ownerAgent: "nia" as const,
    title: "Gap — hosted publishing verification",
    description:
      "Approved social queue exists. Hosted verification that native Instagram/TikTok schedules actually published is not implemented. Implement as hosted verification. Do not route routine publish checks through Cursor Cloud Agents.",
  },
  {
    workId: "aos-omv2-gap-nia-engagement-monitor",
    ownerAgent: "nia" as const,
    title: "Gap — hosted engagement monitoring",
    description:
      "Row 83 protocol exists. Hosted engagement monitoring across approved channels is not yet an AOS cycle. Implement as hosted monitoring. Do not route routine engagement checks through Cursor Cloud Agents.",
  },
] as const;

export const CURSOR_BUDGET_ATTENTION_ID = "aos-omv2-cursor-budget-attention";

const DEFAULT_MONTHLY_BUDGET_UNITS = 20;

const ROUTINE_RE = [
  /check(ing)? (the )?(email|inbox|mail)/i,
  /inbox monitor|imap poll|operational email/i,
  /inspect (a |the )?(dashboard|queue|health|production|register|checkout|server)/i,
  /server health|application health|\/api\/ops\/health/i,
  /verify (a |the )?(scheduled|routine|cron)/i,
  /status report|operating review|daily briefing|founder briefing/i,
  /deterministic database|postgres read|database work/i,
  /sla (oversight|state)|support queue|work[- ]queue/i,
  /hosted (operations|technology|experience) cycle/i,
];

const ENGINEERING_RE = [
  /implement (the )?(code|api|schema|component|route|webhook|progression|save logic)/i,
  /typescript|\.tsx\b|pull request|isolated branch|repository change/i,
  /fix (a )?(production )?(defect|bug) in (code|repo|component|the codebase)/i,
  /software (change|engineering)|refactor (the )?(code|component)/i,
  /(?<!do not )(?<!don't )(?<!not )write (the )?code|open a pull request|cursor cloud/i,
  /build (the )?(authenticated|api|route|component|schema)/i,
  /wire .* (api|webhook|oauth|stripe live secret)/i,
];

const PLAN_RE =
  /\b(plan|protocol|procedure|tabletop|runway|welcome|briefing|coverage|register|re-audit|simulation|communications?|copy|script)\b/i;

const HUMAN_RE = /human (legal|expert|acceptance|review)|qualified human/i;

function haystack(input: {
  title: string;
  description: string;
  nextAction?: string | null;
  workId?: string;
}): string {
  return `${input.workId ?? ""} ${input.title} ${input.description} ${input.nextAction ?? ""}`;
}

export function threeBusinessAgentsLocked(): boolean {
  return (
    OPERATING_AGENTS.length === 3 &&
    OPERATING_AGENTS[0] === "michelle" &&
    OPERATING_AGENTS[1] === "imani" &&
    OPERATING_AGENTS[2] === "nia" &&
    BUSINESS_AGENTS.length === 3
  );
}

export function getCursorMode(): CursorMode {
  const raw = (process.env.AOS_CURSOR_MODE ?? process.env.AOS_LAUNCH_HYPERCARE ?? "").trim().toLowerCase();
  if (raw === "hypercare" || raw === "launch" || raw === "1" || raw === "true") return "hypercare";
  return "normal";
}

export function getCursorConcurrencyLimit(mode: CursorMode = getCursorMode()): number {
  const modeMax = mode === "hypercare" ? 2 : 1;
  const envRaw = process.env.AOS_MAX_OPEN_ENGINEERING_JOBS?.trim();
  if (!envRaw) return modeMax;
  const envMax = Number.parseInt(envRaw, 10);
  if (!Number.isFinite(envMax) || envMax < 1) return modeMax;
  return Math.min(modeMax, envMax);
}

export function getMonthlyCursorBudgetUnits(): number {
  const parsed = Number.parseInt(process.env.AOS_CURSOR_MONTHLY_BUDGET_UNITS ?? String(DEFAULT_MONTHLY_BUDGET_UNITS), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MONTHLY_BUDGET_UNITS;
}

export function cursorModelPreference(): string | undefined {
  const value = process.env.AOS_CURSOR_MODEL?.trim();
  return value ? value : undefined;
}

export function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

export function classifyExecution(input: {
  title: string;
  description: string;
  source?: string;
  nextAction?: string | null;
  runtimeClass?: string;
  actionClass?: string;
  founderGateRequired?: boolean;
  workId?: string;
  synthetic?: boolean;
}): ExecutionClassification {
  const text = haystack(input);
  const workId = input.workId ?? "";

  if (input.actionClass === "D" || input.founderGateRequired === true) {
    return {
      path: "FOUNDER_RESERVED",
      engineeringRequired: false,
      runtimeClass: "hosted",
      nextAction: "await_founder",
      reason: "Founder-reserved gate.",
    };
  }
  if (HUMAN_RE.test(text) || input.nextAction === "await_human") {
    return {
      path: "HUMAN_EXPERT",
      engineeringRequired: false,
      runtimeClass: "hosted",
      nextAction: "await_human",
      reason: "Human-expert review required.",
    };
  }
  if (workId.startsWith("aos-omv2-gap-")) {
    return {
      path: "ROUTINE_DETERMINISTIC",
      engineeringRequired: false,
      runtimeClass: "hosted",
      nextAction: "implement_hosted_capability",
      reason: "Identified hosted capability gap — not Cursor.",
    };
  }
  if (workId.startsWith("aos-omv2-") || input.nextAction === "hosted_operational_execute") {
    return {
      path: "ROUTINE_DETERMINISTIC",
      engineeringRequired: false,
      runtimeClass: "hosted",
      nextAction: "hosted_operational_execute",
      reason: "Hosted operating cadence.",
    };
  }

  const routine = ROUTINE_RE.some((pattern) => pattern.test(text));
  const engineering = ENGINEERING_RE.some((pattern) => pattern.test(text));
  const planLike = PLAN_RE.test(text);

  if (routine && !engineering) {
    return {
      path: "ROUTINE_DETERMINISTIC",
      engineeringRequired: false,
      runtimeClass: "hosted",
      nextAction: input.source === "command_center" ? "await_domain_execution" : "hosted_operational_execute",
      reason: "Routine/deterministic work — hosted path, Cursor forbidden.",
    };
  }

  if (input.synthetic === true && input.runtimeClass === "engineering") {
    return {
      path: "ENGINEERING_REQUIRED",
      engineeringRequired: true,
      runtimeClass: "engineering",
      nextAction: "cursor_cloud_engineering",
      reason: "Controlled engineering test.",
    };
  }

  if (engineering && !planLike) {
    return {
      path: "ENGINEERING_REQUIRED",
      engineeringRequired: true,
      runtimeClass: "engineering",
      nextAction: "cursor_cloud_engineering",
      reason: "Software engineering required.",
    };
  }

  if (planLike && !engineering) {
    return {
      path: "ROUTINE_DETERMINISTIC",
      engineeringRequired: false,
      runtimeClass: "hosted",
      nextAction: input.source === "command_center" ? "await_domain_execution" : "hosted_operational_execute",
      reason: "Plan/protocol/communications — not Cursor.",
    };
  }

  if (/classif|generat(e|ion)|reason(ing)?|summariz/i.test(text) && !engineering) {
    return {
      path: "AI_REASONING",
      engineeringRequired: false,
      runtimeClass: "hosted",
      nextAction: "hosted_operational_execute",
      reason: "AI reasoning on economical hosted model only — not Cursor.",
    };
  }

  if (input.runtimeClass === "engineering" && engineering) {
    return {
      path: "ENGINEERING_REQUIRED",
      engineeringRequired: true,
      runtimeClass: "engineering",
      nextAction: "cursor_cloud_engineering",
      reason: "Tagged engineering and software signals present.",
    };
  }

  return {
    path: "ROUTINE_DETERMINISTIC",
    engineeringRequired: false,
    runtimeClass: "hosted",
    nextAction: input.source === "command_center" ? "await_domain_execution" : "hosted_operational_execute",
    reason: "Default hosted path. Cursor is not invoked for non-engineering work.",
  };
}

export function classifyWorkItem(item: WorkItem): ExecutionClassification {
  return classifyExecution({
    title: item.title,
    description: item.description,
    source: item.source,
    nextAction: item.nextAction,
    runtimeClass: item.runtimeClass,
    actionClass: item.actionClass,
    founderGateRequired: item.founderGateRequired,
    workId: item.workId,
    synthetic: item.synthetic,
  });
}

export async function evaluateCursorLaunch(
  item: WorkItem,
  overrides?: { mode?: CursorMode; active?: number; monthlyUsed?: number },
): Promise<CursorLaunchDecision> {
  const classified = classifyWorkItem(item);
  const mode = overrides?.mode ?? getCursorMode();
  const maxConcurrent = getCursorConcurrencyLimit(mode);
  const monthlyLimit = getMonthlyCursorBudgetUnits();
  const active = overrides?.active ?? (await countActiveEngineeringJobs(item.controlledTest === true));
  const monthlyUsed =
    overrides?.monthlyUsed ??
    (await sumCostSince(["cursor_cloud_agent_launch", "cursor_cloud_agent_relaunch"], monthStartIso()));

  if (!classified.engineeringRequired) {
    return {
      allowed: false,
      reason: "not_engineering",
      mode,
      maxConcurrent,
      active,
      monthlyUsed,
      monthlyLimit,
    };
  }
  if (monthlyUsed >= monthlyLimit) {
    return {
      allowed: false,
      reason: "budget_exhausted",
      mode,
      maxConcurrent,
      active,
      monthlyUsed,
      monthlyLimit,
    };
  }
  if (active >= maxConcurrent) {
    return {
      allowed: false,
      reason: "at_capacity",
      mode,
      maxConcurrent,
      active,
      monthlyUsed,
      monthlyLimit,
    };
  }
  return {
    allowed: true,
    reason: "ok",
    mode,
    maxConcurrent,
    active,
    monthlyUsed,
    monthlyLimit,
  };
}

export function cursorCapacityAvailable(decision: CursorLaunchDecision): boolean {
  return decision.allowed;
}

export async function ensureOperatingModelWork(): Promise<string[]> {
  const seeded: string[] = [];
  const now = Date.now();

  for (const cycle of CADENCE_WORK) {
    const existing = await getWork(cycle.workId);
    if (!existing) {
      await enqueueWork({
        workId: cycle.workId,
        source: "recurring",
        sourceReference: "operating-model-v2-cadence",
        title: cycle.title,
        description: cycle.description,
        ownerAgent: cycle.ownerAgent,
        priority: 8,
        actionClass: "A",
        runtimeClass: "hosted",
        nextAction: "hosted_operational_execute",
        resourceKey: `aos-omv2:${cycle.workId}`,
        evidenceRefs: ["ops/fab-5/AOS-PERMANENT-OPERATING-SYSTEM.md"],
      });
      seeded.push(cycle.workId);
      continue;
    }
    const completedAt = existing.completedAt ? new Date(existing.completedAt).getTime() : 0;
    const stale = existing.status === "COMPLETE" && now - completedAt >= cycle.intervalMs;
    const recoverable = existing.status === "FAILED" || existing.status === "BLOCKED";
    if ((stale || recoverable) && !["CLAIMED", "RUNNING", "VALIDATING"].includes(existing.status)) {
      const { applySprintWorkState } = await import("@/lib/fab-5/aos/store");
      await applySprintWorkState({
        workId: cycle.workId,
        status: "READY",
        runtimeClass: "hosted",
        nextAction: "hosted_operational_execute",
        blockedReason: null,
        force: true,
      });
      seeded.push(cycle.workId);
    }
  }

  for (const gap of GAP_WORK) {
    const existing = await getWork(gap.workId);
    if (existing) continue;
    await enqueueWork({
      workId: gap.workId,
      source: "company_objective",
      sourceReference: "operating-model-v2-gap",
      title: gap.title,
      description: gap.description,
      ownerAgent: gap.ownerAgent,
      priority: 90,
      status: "BLOCKED",
      actionClass: "A",
      runtimeClass: "hosted",
      nextAction: "implement_hosted_capability",
      blockedReason: "hosted_capability_not_implemented",
      resourceKey: `aos-omv2:${gap.workId}`,
      evidenceRefs: ["ops/fab-5/AOS-PERMANENT-OPERATING-SYSTEM.md"],
    });
    seeded.push(gap.workId);
  }

  return seeded;
}

export async function ensureCursorBudgetAttentionWork(): Promise<WorkItem | null> {
  const existing = await getWork(CURSOR_BUDGET_ATTENTION_ID);
  const open = await listOpenDecisions(false);
  if (open.some((item) => item.workId === CURSOR_BUDGET_ATTENTION_ID)) {
    return existing;
  }
  if (existing?.status === "FOUNDER_GATED" && existing.founderDecisionId) return existing;
  if (existing) return existing;
  return enqueueWork({
    workId: CURSOR_BUDGET_ATTENTION_ID,
    source: "company_objective",
    sourceReference: "operating-model-v2-cursor-budget",
    title: "Founder Attention — monthly Cursor engineering budget reached",
    description:
      "Configured monthly Cursor engineering budget is exhausted. Do not purchase more capacity. Do not increase spending limits. Preserve/queue engineering work. Non-Cursor operations continue.",
    ownerAgent: "michelle",
    priority: 2,
      actionClass: "A",
      runtimeClass: "hosted",
      nextAction: "await_founder",
    resourceKey: "aos-omv2:cursor-budget-attention",
  });
}

export function operatingModelProof(): {
  version: typeof OPERATING_MODEL_VERSION;
  businessAgents: number;
  agents: Array<{ id: OperatingAgentId; name: string; role: string }>;
  cursorNormalMax: number;
  cursorHypercareMax: number;
  monthlyBudgetUnits: number;
} {
  return {
    version: OPERATING_MODEL_VERSION,
    businessAgents: BUSINESS_AGENTS.length,
    agents: BUSINESS_AGENTS.map((agent) => ({ id: agent.id, name: agent.name, role: agent.role })),
    cursorNormalMax: 1,
    cursorHypercareMax: 2,
    monthlyBudgetUnits: getMonthlyCursorBudgetUnits(),
  };
}
