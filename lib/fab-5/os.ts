import { readFile } from "node:fs/promises";

import type {
  LaunchExecutiveId,
  LaunchRowRecord,
  OperatingAgentId,
  RemainingLaunchDeliverable,
  WorkstreamId,
} from "@/lib/fab-5/types";

export type LaunchWorkstreamRecord = {
  id: WorkstreamId;
  primaryExecutive: LaunchExecutiveId;
  primaryExecutiveName: string;
  humanLegalBoundary?: string;
  escalationPath: string;
  remainingLaunchWork: string;
};

export type LaunchAdapterFile = {
  adapter: string;
  sourceLimitation?: string | null;
  authoritativeWorkbook?: string;
  ingestedFromReadableCopy?: string | null;
  authoritativeTab?: string;
  statusCounts?: Record<string, number>;
  reconciliationExceptions?: unknown[];
  executiveQueueCounts?: Record<string, number>;
  workstreams: LaunchWorkstreamRecord[];
  rows: LaunchRowRecord[];
  remainingLaunchCritical: RemainingLaunchDeliverable[];
  criticalPath: Array<number | string>;
  criticalPathNote: string;
  parallelExecution: Record<LaunchExecutiveId, string[]>;
  scheduleLaunchThreat: string;
  formerPerfect10CurrentOwnershipReferences: number;
  potentialDuplicates: unknown[];
  founderActionQueue: Array<{
    id: string;
    row: string;
    decision: string;
    whyFounderRequired: string;
    deadlineDependency: string;
    recommendation: string;
    impactIfDelayed: string;
  }>;
  humanExpertQueue: Array<{
    id: string;
    row: string;
    action: string;
    whyHumanExpert: string;
    note: string;
  }>;
  flaggedNotAdded: Array<{
    item: string;
    whyFlagged: string;
    recommendedDisposition: string;
  }>;
  statusIntegrity: {
    row15FounderAcceptance: string;
    row16FounderAcceptance: string;
    row17FounderAcceptance: string;
  };
};

export type Fab5OperatingSystem = {
  operatingModel: {
    operatingAgents: OperatingAgentId[];
    commandModel: string;
  };
  authorityCodes: Record<string, string>;
  sourceOfTruthHierarchy: Array<{ rank: number; id: string; label: string }>;
  founderReservedDecisions: string[];
  michelle: Record<string, unknown>;
  michelleOrchestration: {
    routing: Record<string, string>;
    parallelization: string;
    never: string;
  };
  imani: Record<string, unknown>;
  nia: Record<string, unknown>;
  decisionRights: Array<{
    decision: string;
    owner: string;
    consulted: string;
    independent: string;
    founderApproval: boolean;
    humanExpert: boolean;
    evidence: boolean;
  }>;
  escalation: { mustEscalate: string[]; doNotEscalateMerelyBecause: string[] };
  communications: { sendGate: { autonomousSendRequiresAll: string[]; ifAnyFails: string } };
  emailAutonomy: { liveConnection: string };
  evidenceAcceptance: { executorIsNotFinalVerifier: boolean };
  blockAuthority: {
    requiredFields: string[];
    michelleMayBlockCompletionFor: string[];
    imaniMayBlockReleaseFor: string[];
    niaMayBlockReleaseFor: string[];
  };
  disagreementProtocol: { noMajorityVote: boolean };
  founderUnavailableMode: { queueLabel: string; emergencyContainment: string };
  reportingModel: { founderReceivesOnly: string[] };
};

let cachedOs: Fab5OperatingSystem | null = null;
let cachedRows: LaunchRowRecord[] | null = null;
let cachedAdapter: LaunchAdapterFile | null = null;

export async function loadOperatingSystem(): Promise<Fab5OperatingSystem> {
  if (cachedOs) return cachedOs;
  const raw = await readFile("ops/fab-5/operating-system.json", "utf8");
  cachedOs = JSON.parse(raw) as Fab5OperatingSystem;
  return cachedOs;
}

export async function loadLaunchAdapter(): Promise<LaunchAdapterFile> {
  if (cachedAdapter) return cachedAdapter;
  const raw = await readFile("ops/fab-5/launch-rows.json", "utf8");
  cachedAdapter = JSON.parse(raw) as LaunchAdapterFile;
  return cachedAdapter;
}

export async function loadLaunchRows(): Promise<LaunchRowRecord[]> {
  if (cachedRows) return cachedRows;
  const adapter = await loadLaunchAdapter();
  cachedRows = adapter.rows;
  return cachedRows;
}

export async function getLaunchRow(number: number): Promise<LaunchRowRecord | null> {
  const rows = await loadLaunchRows();
  return rows.find((row) => row.number === number) ?? null;
}

export function resetOsCacheForTests(): void {
  cachedOs = null;
  cachedRows = null;
  cachedAdapter = null;
}

export const OPERATING_AGENTS: OperatingAgentId[] = ["michelle", "imani", "nia"];
