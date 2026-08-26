/**
 * Imani-only Vercel machine-access wrapper.
 * Reads VERCEL_TOKEN from .env.local into a module-private value.
 * Never logs, returns, or interpolates the token.
 *
 * CLI 59.1.4 `vercel project token` mints a short-lived OIDC JWT for outbound
 * federation. That JWT is not a Vercel REST access token and must not be used
 * as Bearer against api.vercel.com. Founder CLI session is not Imani identity.
 */
import { existsSync, readFileSync } from "node:fs";

import type { OperatingAgentId } from "@/lib/fab-5/types";

export type VercelReadAction =
  | "inspect_project"
  | "inspect_deployments"
  | "inspect_aliases"
  | "inspect_env_names"
  | "inspect_logs";

export type VercelWriteAction = "deploy" | "rollback";

export type VercelBlockedAction =
  | "domain_change"
  | "env_secret_change"
  | "account_change"
  | "billing"
  | "destructive"
  | "irreversible";

export type VercelAction = VercelReadAction | VercelWriteAction | VercelBlockedAction;

export type VercelAuthDecision =
  | { allowed: true; mode: "read" | "write_gated" }
  | { allowed: false; gate: "denied" | "founder"; reason: string };

export type VercelEndpointProbe = {
  path: string;
  usedTeamId: boolean;
  status: number;
  code: string | null;
};

export type VercelDeploymentSummary = {
  id: string;
  readyState: string;
  target: string | null;
  createdAt: string | null;
  url: string | null;
};

export type VercelInspectResult = {
  ok: boolean;
  authenticated: boolean;
  project: string;
  team: string;
  tokenPrefixClass: string;
  usedTeamId: boolean;
  userEndpoint: "forbidden_or_unavailable" | "account_scoped" | "not_called" | "error";
  production: {
    ready: boolean;
    target: string | null;
    createdAt: string | null;
    aliasCount: number;
    aliases: string[];
  } | null;
  productionDeployment: VercelDeploymentSummary | null;
  rollbackTargets: VercelDeploymentSummary[];
  envNames: string[];
  domainAttachment: { attempted: boolean; ok: boolean; nameCount: number };
  logProbe: { attempted: boolean; ok: boolean; eventCount: number | null };
  endpoints: VercelEndpointProbe[];
  cliProbe: {
    attempted: boolean;
    whoami: "forbidden_or_unavailable" | "account_identity" | "founder_session_contamination" | "not_called" | "error";
    listExit: number | null;
    note: string;
  };
  note: string;
};

type LinkedProject = {
  id: string;
  name: string;
  orgId: string;
};

type VercelGetResult = {
  status: number;
  json: unknown;
  code: string | null;
  usedTeamId: boolean;
};

let privateToken: string | undefined;
let tokenLoaded = false;

function classifyPrefix(value: string): string {
  if (value.startsWith("vcp_")) return "vercel_project_token_prefix";
  if (value.startsWith("vercel_")) return "vercel_access_token_prefix";
  return "other_nonempty";
}

function normalizeSecret(value: string): string {
  let next = value.trim().replace(/^\uFEFF/, "");
  if (
    (next.startsWith('"') && next.endsWith('"')) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    next = next.slice(1, -1).trim();
  }
  if (/^bearer\s+/i.test(next)) next = next.replace(/^bearer\s+/i, "").trim();
  return next;
}

function envLineName(rawName: string): string {
  let name = rawName.trim().replace(/^\uFEFF/, "");
  if (name.startsWith("export ")) name = name.slice(7).trim();
  return name;
}

function readEnvLocalName(name: string): string | undefined {
  const filePath = ".env.local";
  if (!existsSync(filePath)) return undefined;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    if (envLineName(line.slice(0, eq)) !== name) continue;
    const value = normalizeSecret(line.slice(eq + 1));
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

function loadImaniToken(): { present: boolean; prefixClass: string } {
  if (!tokenLoaded) {
    privateToken = readEnvLocalName("VERCEL_TOKEN");
    if (!privateToken) {
      const fromEnv = normalizeSecret(process.env.VERCEL_TOKEN ?? "");
      privateToken = fromEnv.length > 0 ? fromEnv : undefined;
    }
    tokenLoaded = true;
  }
  return {
    present: Boolean(privateToken),
    prefixClass: privateToken ? classifyPrefix(privateToken) : "absent",
  };
}

function loadLinkedProject(): LinkedProject | null {
  const filePath = ".vercel/repo.json";
  if (existsSync(filePath)) {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      projects?: Array<{ id?: string; name?: string; orgId?: string }>;
    };
    const project = parsed.projects?.[0];
    if (project?.id && project.name && project.orgId) {
      return { id: project.id, name: project.name, orgId: project.orgId };
    }
  }
  const envId = process.env.VERCEL_PROJECT_ID?.trim();
  const envOrg = process.env.VERCEL_ORG_ID?.trim();
  if (envId && envOrg) {
    return {
      id: envId,
      name: process.env.VERCEL_PROJECT_NAME?.trim() || "website",
      orgId: envOrg,
    };
  }
  return {
    id: "prj_FCi9UmpaTJVGQwlHeREMqDEfJsOy",
    name: "website",
    orgId: "team_78QcHJQpS3JFQLL0nRZTUY8e",
  };
}

export function authorizeVercelAction(
  agent: OperatingAgentId | "nia" | "michelle" | "imani",
  action: VercelAction,
  context: { approved?: boolean; tested?: boolean; evidencePresent?: boolean } = {},
): VercelAuthDecision {
  if (agent !== "imani") {
    return {
      allowed: false,
      gate: "denied",
      reason: `${agent} is not authorized for Vercel machine access. Imani Heartbeat is the sole runtime identity.`,
    };
  }

  const blocked: VercelBlockedAction[] = [
    "domain_change",
    "env_secret_change",
    "account_change",
    "billing",
    "destructive",
    "irreversible",
  ];
  if ((blocked as string[]).includes(action)) {
    return {
      allowed: false,
      gate: "founder",
      reason: `FOUNDER-GATED. ${action} is Founder-reserved under Row 19. Imani must not execute it.`,
    };
  }

  const reads: VercelReadAction[] = [
    "inspect_project",
    "inspect_deployments",
    "inspect_aliases",
    "inspect_env_names",
    "inspect_logs",
  ];
  if ((reads as string[]).includes(action)) {
    return { allowed: true, mode: "read" };
  }

  if (action === "deploy" || action === "rollback") {
    if (!context.approved || !context.tested || !context.evidencePresent) {
      return {
        allowed: false,
        gate: "denied",
        reason:
          "WRITE GATED. Approved, tested, evidence-backed production change is required under Row 19 before deploy/rollback. This setup path does not execute writes.",
      };
    }
    return { allowed: true, mode: "write_gated" };
  }

  return { allowed: false, gate: "denied", reason: "Unknown Vercel action." };
}

export function requestVercelWrite(
  agent: OperatingAgentId,
  action: VercelWriteAction | VercelBlockedAction,
  context: { approved?: boolean; tested?: boolean; evidencePresent?: boolean } = {},
): {
  executed: false;
  authorized: boolean;
  gate: "denied" | "founder" | "write_gated";
  reason: string;
} {
  const decision = authorizeVercelAction(agent, action, context);
  if (!decision.allowed) {
    return {
      executed: false,
      authorized: false,
      gate: decision.gate,
      reason: decision.reason,
    };
  }
  return {
    executed: false,
    authorized: true,
    gate: "write_gated",
    reason:
      "WRITE AUTHORIZED UNDER ROW 19 GATES but not executed. Row 20 Imani setup forbids production mutation.",
  };
}

function errorCode(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const err = (json as { error?: { code?: unknown } }).error;
  if (!err || typeof err !== "object") return null;
  return typeof err.code === "string" ? err.code : null;
}

async function vercelGet(
  pathname: string,
  query: Record<string, string> = {},
): Promise<{ status: number; json: unknown; code: string | null }> {
  const loaded = loadImaniToken();
  if (!loaded.present || !privateToken) {
    return { status: 0, json: { error: "token_absent" }, code: "token_absent" };
  }
  const url = new URL(`https://api.vercel.com${pathname}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${privateToken}`,
      Accept: "application/json",
    },
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json, code: errorCode(json) };
}

async function vercelGetScoped(
  pathname: string,
  query: Record<string, string>,
  orgId: string,
  probes: VercelEndpointProbe[],
): Promise<VercelGetResult> {
  const attempts: Array<{ query: Record<string, string>; usedTeamId: boolean }> = [
    { query, usedTeamId: false },
    { query: { ...query, teamId: orgId }, usedTeamId: true },
    { query: { ...query, slug: "back-half" }, usedTeamId: false },
  ];
  const first = await vercelGet(pathname, attempts[0].query);
  probes.push({
    path: pathname,
    usedTeamId: false,
    status: first.status,
    code: first.code,
  });
  if (first.status === 200) return { ...first, usedTeamId: false };
  for (const attempt of attempts.slice(1)) {
    const next = await vercelGet(pathname, attempt.query);
    probes.push({
      path: pathname,
      usedTeamId: attempt.usedTeamId,
      status: next.status,
      code: next.code,
    });
    if (next.status === 200) return { ...next, usedTeamId: attempt.usedTeamId };
  }
  return { ...first, usedTeamId: false };
}

function summarizeDeployment(item: Record<string, unknown> | undefined): VercelDeploymentSummary | null {
  if (!item) return null;
  const id =
    typeof item.uid === "string" ? item.uid : typeof item.id === "string" ? item.id : null;
  if (!id) return null;
  const created =
    typeof item.created === "number"
      ? new Date(item.created).toISOString()
      : typeof item.createdAt === "number"
        ? new Date(item.createdAt).toISOString()
        : null;
  return {
    id,
    readyState:
      typeof item.readyState === "string"
        ? item.readyState
        : typeof item.state === "string"
          ? item.state
          : "unknown",
    target: typeof item.target === "string" ? item.target : null,
    createdAt: created,
    url: typeof item.url === "string" ? item.url : null,
  };
}

function aliasesFrom(item: Record<string, unknown> | undefined): string[] {
  if (!item) return [];
  const aliases = Array.isArray(item.aliases)
    ? item.aliases.filter((value): value is string => typeof value === "string")
    : [];
  if (typeof item.url === "string" && aliases.length === 0) {
    aliases.push(item.url.startsWith("http") ? item.url : `https://${item.url}`);
  }
  return aliases;
}

function envNamesFrom(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const rec = payload as { envs?: unknown };
  if (!Array.isArray(rec.envs)) return [];
  const names: string[] = [];
  for (const item of rec.envs) {
    if (item && typeof item === "object" && "key" in item) {
      const key = (item as { key?: unknown }).key;
      if (typeof key === "string") names.push(key);
    }
  }
  return [...new Set(names)].sort();
}

function domainNamesFrom(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const rec = payload as { domains?: unknown; name?: unknown };
  const rows = Array.isArray(rec.domains) ? rec.domains : Array.isArray(payload) ? payload : [];
  const names: string[] = [];
  for (const item of rows) {
    if (item && typeof item === "object") {
      const name = (item as { name?: unknown; apexName?: unknown }).name;
      if (typeof name === "string") names.push(name);
    }
  }
  if (typeof rec.name === "string") names.push(rec.name);
  return [...new Set(names)];
}

function emptyInspect(
  linked: LinkedProject | null,
  prefixClass: string,
  note: string,
): VercelInspectResult {
  return {
    ok: false,
    authenticated: false,
    project: linked?.name ?? "website",
    team: "back-half",
    tokenPrefixClass: prefixClass,
    usedTeamId: false,
    userEndpoint: "not_called",
    production: null,
    productionDeployment: null,
    rollbackTargets: [],
    envNames: [],
    domainAttachment: { attempted: false, ok: false, nameCount: 0 },
    logProbe: { attempted: false, ok: false, eventCount: null },
    endpoints: [],
    cliProbe: { attempted: false, whoami: "not_called", listExit: null, note: "not_run" },
    note,
  };
}

export async function imaniVercelInspect(): Promise<VercelInspectResult> {
  const loaded = loadImaniToken();
  const linked = loadLinkedProject();
  if (!loaded.present) return emptyInspect(linked, loaded.prefixClass, "token_absent");
  if (!linked) return emptyInspect(linked, loaded.prefixClass, "project_link_missing");

  const probes: VercelEndpointProbe[] = [];
  const user = await vercelGet("/v2/user");
  probes.push({ path: "/v2/user", usedTeamId: false, status: user.status, code: user.code });
  const userEndpoint =
    user.status === 200
      ? "account_scoped"
      : user.status === 403 || user.status === 401
        ? "forbidden_or_unavailable"
        : "error";

  const projectById = await vercelGetScoped(
    `/v9/projects/${encodeURIComponent(linked.id)}`,
    {},
    linked.orgId,
    probes,
  );
  let projectRead = projectById;
  if (projectById.status !== 200) {
    projectRead = await vercelGetScoped(
      `/v9/projects/${encodeURIComponent(linked.name)}`,
      {},
      linked.orgId,
      probes,
    );
  }

  const deployments = await vercelGetScoped(
    "/v6/deployments",
    { projectId: linked.id, limit: "8", target: "production" },
    linked.orgId,
    probes,
  );
  let deploymentList: Array<Record<string, unknown>> = [];
  if (deployments.status === 200 && deployments.json && typeof deployments.json === "object") {
    deploymentList = ((deployments.json as { deployments?: Array<Record<string, unknown>> }).deployments ??
      []) as Array<Record<string, unknown>>;
  }
  if (deploymentList.length === 0) {
    const unfiltered = await vercelGetScoped(
      "/v6/deployments",
      { projectId: linked.id, limit: "8" },
      linked.orgId,
      probes,
    );
    if (unfiltered.status === 200 && unfiltered.json && typeof unfiltered.json === "object") {
      deploymentList = ((unfiltered.json as { deployments?: Array<Record<string, unknown>> }).deployments ??
        []) as Array<Record<string, unknown>>;
    }
  }

  const projectReadOk = projectRead.status === 200;
  const deploymentsOk = deployments.status === 200 || deploymentList.length > 0;
  if (!projectReadOk && !deploymentsOk) {
    return {
      ...emptyInspect(linked, loaded.prefixClass, ""),
      userEndpoint,
      endpoints: probes,
      usedTeamId: projectById.usedTeamId || projectRead.usedTeamId,
      note: `project_read_http_${projectRead.status}${projectRead.code ? `_${projectRead.code}` : ""};deployments_http_${deployments.status}${deployments.code ? `_${deployments.code}` : ""};user_endpoint=${userEndpoint}`,
    };
  }

  const summaries = deploymentList
    .map((item) => summarizeDeployment(item))
    .filter((item): item is VercelDeploymentSummary => Boolean(item));
  const productionDeployment =
    summaries.find((item) => item.target === "production" && item.readyState === "READY") ??
    summaries.find((item) => item.readyState === "READY") ??
    summaries[0] ??
    null;
  const rollbackTargets = summaries
    .filter((item) => item.id !== productionDeployment?.id && item.readyState === "READY")
    .slice(0, 5);

  const latestRaw = deploymentList[0];
  const aliases = aliasesFrom(latestRaw);
  const aliasList = await vercelGetScoped(
    "/v4/aliases",
    { projectId: linked.id, limit: "20" },
    linked.orgId,
    probes,
  );
  if (aliasList.status === 200 && aliasList.json && typeof aliasList.json === "object") {
    const rows = (aliasList.json as { aliases?: Array<{ alias?: unknown }> }).aliases ?? [];
    for (const row of rows) {
      if (typeof row.alias === "string" && !aliases.includes(row.alias)) aliases.push(row.alias);
    }
  }

  const domains = await vercelGetScoped(
    `/v9/projects/${encodeURIComponent(linked.id)}/domains`,
    {},
    linked.orgId,
    probes,
  );
  const domainNames = domains.status === 200 ? domainNamesFrom(domains.json) : [];
  for (const name of domainNames) {
    if (!aliases.includes(name)) aliases.push(name);
  }

  const env = await vercelGetScoped(
    `/v9/projects/${encodeURIComponent(linked.id)}/env`,
    {},
    linked.orgId,
    probes,
  );
  const envNames = env.status === 200 ? envNamesFrom(env.json) : [];

  let logProbe = { attempted: false, ok: false, eventCount: null as number | null };
  if (productionDeployment?.id) {
    logProbe.attempted = true;
    const events = await vercelGetScoped(
      `/v3/deployments/${encodeURIComponent(productionDeployment.id)}/events`,
      { limit: "1" },
      linked.orgId,
      probes,
    );
    logProbe.ok = events.status === 200;
    if (events.status === 200 && events.json) {
      const rows = Array.isArray(events.json)
        ? events.json
        : typeof events.json === "object"
          ? ((events.json as { events?: unknown[] }).events ?? null)
          : null;
      logProbe.eventCount = Array.isArray(rows) ? rows.length : null;
    }
  }

  const usedTeamId = probes.some((item) => item.usedTeamId && item.status === 200);
  return {
    ok: true,
    authenticated: true,
    project: `back-half/${linked.name}`,
    team: "back-half",
    tokenPrefixClass: loaded.prefixClass,
    usedTeamId,
    userEndpoint,
    production: {
      ready: productionDeployment?.readyState === "READY",
      target: productionDeployment?.target ?? "production",
      createdAt: productionDeployment?.createdAt ?? null,
      aliasCount: aliases.length,
      aliases,
    },
    productionDeployment,
    rollbackTargets,
    envNames,
    domainAttachment: {
      attempted: true,
      ok: domains.status === 200 || aliasList.status === 200 || aliases.length > 0,
      nameCount: aliases.length,
    },
    logProbe,
    endpoints: probes,
    cliProbe: { attempted: false, whoami: "not_called", listExit: null, note: "rest_succeeded_whoami_not_acceptance" },
    note: projectReadOk
      ? deploymentsOk
        ? "authenticated_project_read_no_mutation"
        : "authenticated_project_read_deployments_limited"
      : "authenticated_deployments_read_inferred_scope",
  };
}

export function vercelTokenPresent(): boolean {
  return loadImaniToken().present;
}

export function vercelTokenPrefixClass(): string {
  return loadImaniToken().prefixClass;
}

export function vercelLinkedProjectMetadata(): { name: string; orgPresent: boolean; idPresent: boolean } | null {
  const linked = loadLinkedProject();
  if (!linked) return null;
  return {
    name: linked.name,
    orgPresent: Boolean(linked.orgId),
    idPresent: Boolean(linked.id),
  };
}
