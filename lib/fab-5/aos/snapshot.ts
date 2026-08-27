import {
  getCursorConcurrencyLimit,
  getCursorMode,
  operatingModelProof,
} from "@/lib/fab-5/aos/operating-model";
import { listEngineeringJobs, listHeartbeats, listOpenDecisions, listWork, aosConfigured, countActiveEngineeringJobs } from "@/lib/fab-5/aos/store";
import { AUGUST_LAUNCH_AGENT_ROWS } from "@/lib/fab-5/aos/sprint";
import type {
  AgentExecutionProof,
  EngineeringJob,
  ExecutionProof,
  FounderDecision,
  OperatingAgentId,
  WorkItem,
} from "@/lib/fab-5/aos/types";
import { OPERATING_AGENTS } from "@/lib/fab-5/aos/types";

export type AgentColumn = {
  agent: OperatingAgentId;
  name: string;
  role: string;
  lastHeartbeat: string | null;
  currentWork: WorkItem | null;
  queue: WorkItem[];
  blocked: WorkItem[];
  recentlyCompleted: WorkItem[];
  failed: number;
};

export type AgentOperationsSnapshot = {
  at: string;
  backend: "supabase_postgres" | "none";
  agents: AgentColumn[];
  founderDecisions: FounderDecision[];
  overdueDateGated: WorkItem[];
  dependencies: Array<{ workId: string; owner: OperatingAgentId; waitingOn: string[] }>;
  engineeringJobs: EngineeringJob[];
  operatingModel: ReturnType<typeof operatingModelProof> & {
    cursorMode: ReturnType<typeof getCursorMode>;
    cursorConcurrencyLimit: number;
    cursorActive: number;
  };
};

const NAMES: Record<OperatingAgentId, { name: string; role: string }> = {
  michelle: { name: "Michelle Northstar", role: "Chief of Staff & Operations Officer" },
  imani: { name: "Imani Heartbeat", role: "Chief Technology & Risk Officer" },
  nia: { name: "Nia Prism", role: "Chief Experience & Transformation Officer" },
};

export async function buildAgentOperationsSnapshot(includeTest = false): Promise<AgentOperationsSnapshot> {
  const heartbeats = await listHeartbeats();
  const founderDecisions = await listOpenDecisions(includeTest);
  const engineeringJobs = await listEngineeringJobs(12);
  const cursorActive = await countActiveEngineeringJobs();
  const agents: AgentColumn[] = [];
  const overdueDateGated: WorkItem[] = [];
  const dependencies: AgentOperationsSnapshot["dependencies"] = [];
  const now = Date.now();

  for (const agent of OPERATING_AGENTS) {
    const [queue, blocked, completed, failed, running] = await Promise.all([
      listWork({ ownerAgent: agent, status: ["QUEUED", "READY", "RETRY", "CLAIMED", "RUNNING", "VALIDATING"], controlledTest: includeTest ? undefined : false, limit: 12 }),
      listWork({ ownerAgent: agent, status: ["BLOCKED", "DEPENDENCY_GATED", "DATE_GATED", "FOUNDER_GATED", "ACCEPTANCE_READY"], controlledTest: includeTest ? undefined : false, limit: 12 }),
      listWork({ ownerAgent: agent, status: "COMPLETE", controlledTest: includeTest ? undefined : false, limit: 5 }),
      listWork({ ownerAgent: agent, status: "FAILED", controlledTest: includeTest ? undefined : false, limit: 20 }),
      listWork({ ownerAgent: agent, status: ["CLAIMED", "RUNNING", "VALIDATING"], controlledTest: includeTest ? undefined : false, limit: 3 }),
    ]);
    const visibleQueue = includeTest ? queue : queue.filter((item) => !item.controlledTest);
    const visibleBlocked = includeTest ? blocked : blocked.filter((item) => !item.controlledTest);
    for (const item of visibleBlocked) {
      if (item.status === "DATE_GATED" && item.scheduledAt && new Date(item.scheduledAt).getTime() <= now) {
        overdueDateGated.push(item);
      }
      if (item.dependencyIds.length > 0) {
        dependencies.push({ workId: item.workId, owner: agent, waitingOn: item.dependencyIds });
      }
    }
    const beat = heartbeats.find((entry) => entry.agent === agent);
    agents.push({
      agent,
      name: NAMES[agent].name,
      role: NAMES[agent].role,
      lastHeartbeat: beat?.lastHeartbeat ?? null,
      currentWork: running[0] ?? null,
      queue: visibleQueue,
      blocked: visibleBlocked,
      recentlyCompleted: includeTest ? completed : completed.filter((item) => !item.controlledTest),
      failed: failed.filter((item) => includeTest || !item.controlledTest).length,
    });
  }

  return {
    at: new Date().toISOString(),
    backend: aosConfigured() ? "supabase_postgres" : "none",
    agents,
    founderDecisions: includeTest ? founderDecisions : founderDecisions.filter((item) => !item.controlledTest),
    overdueDateGated,
    dependencies,
    engineeringJobs: includeTest ? engineeringJobs : engineeringJobs.filter((job) => !job.controlledTest),
    operatingModel: {
      ...operatingModelProof(),
      cursorMode: getCursorMode(),
      cursorConcurrencyLimit: getCursorConcurrencyLimit(),
      cursorActive,
    },
  };
}

function sprintRow(workId: string): string | null {
  const match = /^al-(\d+)$/.exec(workId);
  if (!match) return workId;
  return match[1];
}

function isAgentSprintItem(item: WorkItem): boolean {
  const match = /^al-(\d+)$/.exec(item.workId);
  if (!match) return false;
  return AUGUST_LAUNCH_AGENT_ROWS.has(Number(match[1]));
}

export async function buildExecutionProof(includeTest = false): Promise<ExecutionProof> {
  const now = Date.now();
  const [allWork, heartbeats, engineeringJobs] = await Promise.all([
    listWork({ controlledTest: includeTest ? undefined : false, limit: 1000 }),
    listHeartbeats(),
    listEngineeringJobs(40),
  ]);
  const visible = includeTest ? allWork : allWork.filter((item) => !item.controlledTest);
  const sprint = visible.filter(isAgentSprintItem);
  const executingStatuses = new Set(["CLAIMED", "RUNNING", "VALIDATING"]);
  const readyStatuses = new Set(["QUEUED", "READY", "RETRY"]);
  const gatedStatuses = new Set(["FOUNDER_GATED", "ACCEPTANCE_READY"]);
  const agentProof = {} as Record<OperatingAgentId, AgentExecutionProof>;
  for (const agent of OPERATING_AGENTS) {
    const executing = visible
      .filter((item) => item.ownerAgent === agent && executingStatuses.has(item.status))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const beat = heartbeats.find((entry) => entry.agent === agent);
    const current = executing[0] ?? visible.find((item) => item.workId === beat?.currentWorkId) ?? null;
    agentProof[agent] = {
      agent,
      workId: current?.workId ?? beat?.currentWorkId ?? null,
      row: current ? sprintRow(current.workId) : beat?.currentWorkId ? sprintRow(beat.currentWorkId) : null,
      state: current?.status ?? null,
      lastActivity: current?.updatedAt ?? beat?.lastHeartbeat ?? null,
      title: current?.title ?? null,
    };
  }
  const jobs = (includeTest ? engineeringJobs : engineeringJobs.filter((job) => !job.controlledTest))
    .filter((job) => ["launching", "running", "validating", "blocked_unconfigured"].includes(job.status))
    .map((job) => ({
      jobId: job.jobId,
      workId: job.workId,
      status: job.status,
      ownerAgent: job.ownerAgent,
      providerAgentId: job.providerAgentId,
      providerRunId: job.providerRunId,
      updatedAt: job.updatedAt,
    }));
  return {
    at: new Date().toISOString(),
    agents: agentProof,
    heartbeats: heartbeats.map((beat) => ({
      agent: beat.agent,
      lastHeartbeat: beat.lastHeartbeat,
      currentWorkId: beat.currentWorkId,
      queueDepth: beat.queueDepth,
      runtimeError: beat.runtimeError,
    })),
    engineeringJobs: jobs,
    counts: {
      completed: sprint.filter((item) => item.status === "COMPLETE").length,
      executing: sprint.filter((item) => executingStatuses.has(item.status)).length,
      ready: sprint.filter((item) => readyStatuses.has(item.status)).length,
      dependencyBlocked: sprint.filter((item) => item.status === "DEPENDENCY_GATED").length,
      founderHumanGated: sprint.filter((item) => gatedStatuses.has(item.status)).length,
      blocked: sprint.filter((item) => item.status === "BLOCKED" || item.status === "DATE_GATED").length,
      remaining: sprint.filter((item) => item.status !== "COMPLETE" && item.status !== "CANCELLED").length,
    },
    staleLeases: visible.filter(
      (item) =>
        (item.status === "CLAIMED" || item.status === "RUNNING") &&
        item.leaseExpiresAt !== null &&
        new Date(item.leaseExpiresAt).getTime() < now,
    ).length,
  };
}
