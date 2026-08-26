import { listEngineeringJobs, listHeartbeats, listOpenDecisions, listWork, aosConfigured } from "@/lib/fab-5/aos/store";
import type { EngineeringJob, FounderDecision, OperatingAgentId, WorkItem } from "@/lib/fab-5/aos/types";
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
  };
}
