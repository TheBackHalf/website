/**
 * Official Cursor Cloud Agents REST client.
 * @see https://cursor.com/docs/cloud-agent/api/endpoints
 * Does not invent endpoints. Never logs CURSOR_API_KEY.
 */

export const CURSOR_CLOUD_API_BASE = "https://api.cursor.com/v1";
export const DEFAULT_ENGINEERING_REPO = "https://github.com/TheBackHalf/website";

export type CursorCloudAgent = {
  id: string;
  name?: string;
  status?: string;
  url?: string;
  latestRunId?: string | null;
  repos?: Array<{ url?: string; startingRef?: string }>;
  workOnCurrentBranch?: boolean;
  autoCreatePR?: boolean;
};

export type CursorCloudRun = {
  id: string;
  agentId?: string;
  status?: string;
  result?: string | null;
  durationMs?: number | null;
  git?: {
    branches?: Array<{ repoUrl?: string; branch?: string; prUrl?: string }>;
  };
};

export type CursorCreateAgentResult = {
  agent: CursorCloudAgent;
  run: CursorCloudRun | null;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function cursorCloudConfigured(): boolean {
  return Boolean(readEnv("CURSOR_API_KEY"));
}

export async function probeCursorCloudAuth(): Promise<{
  configured: boolean;
  authenticated: boolean;
  httpStatus: number | null;
}> {
  if (!cursorCloudConfigured()) {
    return { configured: false, authenticated: false, httpStatus: null };
  }
  try {
    const response = await fetch(`${CURSOR_CLOUD_API_BASE}/me`, {
      headers: {
        Authorization: authHeader(),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    await response.arrayBuffer();
    return {
      configured: true,
      authenticated: response.ok,
      httpStatus: response.status,
    };
  } catch {
    return { configured: true, authenticated: false, httpStatus: 0 };
  }
}

export function engineeringRepoUrl(): string {
  return readEnv("AOS_ENGINEERING_REPO") || DEFAULT_ENGINEERING_REPO;
}

function authHeader(): string {
  const key = readEnv("CURSOR_API_KEY");
  if (!key) throw new Error("cursor_api_key_missing");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mapAgent(value: unknown): CursorCloudAgent | null {
  const row = asObject(value);
  if (!row?.id) return null;
  return {
    id: String(row.id),
    name: row.name ? String(row.name) : undefined,
    status: row.status ? String(row.status) : undefined,
    url: row.url ? String(row.url) : undefined,
    latestRunId: row.latestRunId ? String(row.latestRunId) : null,
    repos: Array.isArray(row.repos) ? (row.repos as CursorCloudAgent["repos"]) : undefined,
    workOnCurrentBranch: row.workOnCurrentBranch === true,
    autoCreatePR: row.autoCreatePR === true,
  };
}

function mapRun(value: unknown): CursorCloudRun | null {
  const row = asObject(value);
  if (!row?.id) return null;
  const git = asObject(row.git);
  return {
    id: String(row.id),
    agentId: row.agentId ? String(row.agentId) : undefined,
    status: row.status ? String(row.status) : undefined,
    result: row.result ? String(row.result) : null,
    durationMs: typeof row.durationMs === "number" ? row.durationMs : null,
    git: git
      ? {
          branches: Array.isArray(git.branches)
            ? (git.branches as Array<{ repoUrl?: string; branch?: string; prUrl?: string }>)
            : [],
        }
      : undefined,
  };
}

async function cursorFetch(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${CURSOR_CLOUD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { raw: text.slice(0, 200) };
    }
  }
  if (!response.ok) {
    const code = asObject(body)?.error ?? asObject(body)?.code ?? response.status;
    throw new Error(`cursor_cloud_${response.status}:${String(code)}`);
  }
  return body;
}

export async function createCursorCloudAgent(input: {
  prompt: string;
  name?: string;
  repository?: string;
  startingRef?: string;
  autoCreatePR?: boolean;
  skipReviewerRequest?: boolean;
  workOnCurrentBranch?: boolean;
  agentId?: string;
}): Promise<CursorCreateAgentResult> {
  const body: Record<string, unknown> = {
    prompt: { text: input.prompt },
    name: (input.name ?? "AOS engineering job").slice(0, 100),
    repos: [
      {
        url: input.repository ?? engineeringRepoUrl(),
        startingRef: input.startingRef ?? "main",
      },
    ],
    workOnCurrentBranch: input.workOnCurrentBranch === true,
    autoCreatePR: input.autoCreatePR !== false,
    skipReviewerRequest: input.skipReviewerRequest !== false,
  };
  if (input.agentId) body.agentId = input.agentId;
  const payload = await cursorFetch("/agents", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const row = asObject(payload) ?? {};
  const agent = mapAgent(row.agent) ?? mapAgent(row);
  if (!agent) throw new Error("cursor_cloud_create_missing_agent");
  return { agent, run: mapRun(row.run) };
}

export async function getCursorCloudAgent(agentId: string): Promise<CursorCloudAgent> {
  const payload = await cursorFetch(`/agents/${encodeURIComponent(agentId)}`);
  const agent = mapAgent(payload);
  if (!agent) throw new Error("cursor_cloud_agent_missing");
  return agent;
}

export async function getCursorCloudRun(agentId: string, runId: string): Promise<CursorCloudRun> {
  const payload = await cursorFetch(
    `/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
  );
  const run = mapRun(payload);
  if (!run) throw new Error("cursor_cloud_run_missing");
  return run;
}

export function isTerminalCursorRunStatus(status: string | undefined): boolean {
  const value = (status ?? "").toUpperCase();
  return value === "FINISHED" || value === "ERROR" || value === "CANCELLED" || value === "EXPIRED";
}

export function isSuccessfulCursorRunStatus(status: string | undefined): boolean {
  return (status ?? "").toUpperCase() === "FINISHED";
}
