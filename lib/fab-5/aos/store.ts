import { randomUUID } from "node:crypto";
import postgres, { type JSONValue, type Row, type Sql, type TransactionSql } from "postgres";

import {
  ensureMichelleSchema,
  getMichelleSql,
  michelleBackendConfigured,
  resetMichelleSqlForTests,
} from "@/lib/fab-5/michelle-db";
import {
  isKimberlyAi,
  isOperatingAgent,
  type ActionClass,
  type AgentHeartbeat,
  type AuditEvent,
  type EngineeringJob,
  type EngineeringJobStatus,
  type FounderDecision,
  type NotificationRecord,
  type OperatingAgentId,
  type RuntimeClass,
  type WorkItem,
  type WorkSource,
  type WorkStatus,
} from "@/lib/fab-5/aos/types";

function normalizeSecret(value: string): string {
  let next = value.trim().replace(/^\uFEFF/, "").replace(/\r$/, "");
  for (let i = 0; i < 2; i += 1) {
    if (
      (next.startsWith('"') && next.endsWith('"')) ||
      (next.startsWith("'") && next.endsWith("'"))
    ) {
      next = next.slice(1, -1).trim();
    }
  }
  next = next.replace(/\\[\/\\nrt"'`]/g, (pair) => {
    switch (pair[1]) {
      case "n":
        return "\n";
      case "r":
        return "";
      case "t":
        return "\t";
      default:
        return pair[1] ?? "";
    }
  });
  try {
    if (!next.includes("://") && next.includes("%3A")) {
      const decoded = decodeURIComponent(next);
      if (decoded.includes("://")) next = decoded;
    }
  } catch {
    /* keep */
  }
  return next;
}

function decodeComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitHostPort(hostport: string): { hostname: string; port: string } {
  if (hostport.startsWith("[")) {
    const end = hostport.indexOf("]");
    return {
      hostname: hostport.slice(1, end),
      port: hostport.slice(end + 1).replace(/^:/, ""),
    };
  }
  const colon = hostport.lastIndexOf(":");
  if (colon > 0 && /^\d+$/.test(hostport.slice(colon + 1))) {
    return { hostname: hostport.slice(0, colon), port: hostport.slice(colon + 1) };
  }
  return { hostname: hostport, port: "" };
}

type AosPgOpts = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

function parsePgOpts(raw: string): AosPgOpts | null {
  const normalized = normalizeSecret(raw);
  if (!/^postgres(?:ql)?:\/\//i.test(normalized)) return null;
  if (/^prisma\+/i.test(normalized) || /^prisma:\/\//i.test(normalized)) return null;
  const rest = normalized.replace(/^postgres(?:ql)?:\/\//i, "");
  const at = rest.lastIndexOf("@");
  if (at < 1) return null;
  const userinfo = rest.slice(0, at);
  const hostpart = rest.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const username = decodeComponent(colon < 0 ? userinfo : userinfo.slice(0, colon));
  const password = decodeComponent(colon < 0 ? "" : userinfo.slice(colon + 1));
  const cut = hostpart.search(/[/?]/);
  const hostport = (cut < 0 ? hostpart : hostpart.slice(0, cut)).split(",")[0];
  const tail = cut < 0 ? "" : hostpart.slice(cut);
  const { hostname, port } = splitHostPort(hostport);
  if (!hostname) return null;
  const pathPart = tail.startsWith("/") ? tail.slice(1) : tail.replace(/^\?/, "");
  const database = (pathPart.split("?")[0] || "postgres").replace(/\/$/, "") || "postgres";
  return {
    host: hostname,
    port: port ? Number(port) : 5432,
    database,
    username,
    password,
  };
}

let aosEnvLoaded = false;
let aosOpts: AosPgOpts | null = null;
let aosSql: Sql | null | undefined;
const aosEnvStatus = {
  matched: [] as string[],
  parsed: [] as string[],
  filesSeen: [] as string[],
};

export function getAosEnvStatus(): typeof aosEnvStatus {
  loadAosPostgresEnv();
  return aosEnvStatus;
}

function consider(name: string, raw: string | undefined): void {
  if (!raw?.trim()) return;
  const normalized = normalizeSecret(raw);
  if (/^\[encrypted\]$/i.test(normalized)) return;
  aosEnvStatus.matched.push(name);
  const parsed = parsePgOpts(raw);
  if (!parsed) return;
  aosEnvStatus.parsed.push(name);
  if (!aosOpts || name === "POSTGRES_URL_NON_POOLING") aosOpts = parsed;
}

function loadAosPostgresEnv(): void {
  if (aosEnvLoaded) return;
  consider("POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING);
  consider("POSTGRES_URL", process.env.POSTGRES_URL);
  aosEnvLoaded = true;
}

function getAosSql(): Sql | null {
  loadAosPostgresEnv();
  if (aosSql !== undefined) return aosSql;
  if (aosOpts) {
    aosSql = postgres({
      host: aosOpts.host,
      port: aosOpts.port,
      database: aosOpts.database,
      username: aosOpts.username,
      password: aosOpts.password,
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    return aosSql;
  }
  aosSql = getMichelleSql();
  return aosSql;
}

async function withAosTx<T>(fn: (sql: TransactionSql) => Promise<T>): Promise<T> {
  const sql = getAosSql();
  if (!sql) throw new Error("aos_backend_unconfigured");
  await ensureMichelleSchema(sql);
  const result = await sql.begin(async (tx) => fn(tx));
  return result as T;
}

export function resetAosSqlForTests(): void {
  aosSql = undefined;
  resetMichelleSqlForTests();
}

export function aosConfigured(): boolean {
  loadAosPostgresEnv();
  return Boolean(aosOpts) || michelleBackendConfigured();
}

export async function ensureAos(): Promise<boolean> {
  if (!aosConfigured()) return false;
  const sql = getAosSql();
  if (!sql) return false;
  await ensureMichelleSchema(sql);
  return true;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asJson(value: unknown): JSONValue {
  return JSON.parse(JSON.stringify(value)) as JSONValue;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}

function mapWork(row: Row): WorkItem {
  return {
    workId: String(row.work_id),
    source: row.source as WorkSource,
    sourceReference: String(row.source_reference),
    title: String(row.title),
    description: String(row.description),
    ownerAgent: row.owner_agent as OperatingAgentId,
    priority: Number(row.priority),
    status: row.status as WorkStatus,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
    scheduledAt: iso(row.scheduled_at),
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    blockedReason: row.blocked_reason ? String(row.blocked_reason) : null,
    dependencyIds: asStringArray(row.dependency_ids),
    parentWorkId: row.parent_work_id ? String(row.parent_work_id) : null,
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    leaseToken: row.lease_token ? String(row.lease_token) : null,
    leaseExpiresAt: iso(row.lease_expires_at),
    evidenceRefs: asStringArray(row.evidence_refs),
    founderGateRequired: row.founder_gate_required === true,
    founderDecisionId: row.founder_decision_id ? String(row.founder_decision_id) : null,
    nextAction: row.next_action ? String(row.next_action) : null,
    errorState: row.error_state ? String(row.error_state) : null,
    checkpoint: asObject(row.checkpoint),
    resourceKey: row.resource_key ? String(row.resource_key) : null,
    actionClass: (row.action_class as ActionClass) || "A",
    runtimeClass: (row.runtime_class as RuntimeClass) || "hosted",
    controlledTest: row.controlled_test === true,
    synthetic: row.synthetic === true,
  };
}

function mapJob(row: Row): EngineeringJob {
  return {
    jobId: String(row.job_id),
    workId: String(row.work_id),
    sourceReference: String(row.source_reference ?? ""),
    ownerAgent: row.owner_agent as OperatingAgentId,
    provider: "cursor_cloud_agent",
    providerAgentId: row.provider_agent_id ? String(row.provider_agent_id) : null,
    providerRunId: row.provider_run_id ? String(row.provider_run_id) : null,
    repository: String(row.repository),
    branch: row.branch ? String(row.branch) : null,
    prUrl: row.pr_url ? String(row.pr_url) : null,
    commitSha: row.commit_sha ? String(row.commit_sha) : null,
    prompt: String(row.prompt),
    status: row.status as EngineeringJobStatus,
    heartbeatAt: iso(row.heartbeat_at),
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    filesChanged: asStringArray(row.files_changed),
    commands: asStringArray(row.commands),
    validation: asObject(row.validation) ?? {},
    error: row.error ? String(row.error) : null,
    retryCount: Number(row.retry_count ?? 0),
    founderDecisionRequired: row.founder_decision_required === true,
    controlledTest: row.controlled_test === true,
    synthetic: row.synthetic === true,
    detail: asObject(row.detail) ?? {},
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapDecision(row: Row): FounderDecision {
  return {
    decisionId: String(row.decision_id),
    requestingAgent: row.requesting_agent as OperatingAgentId,
    workId: String(row.work_id),
    decisionRequired: String(row.decision_required),
    agentRecommendation: String(row.agent_recommendation),
    reason: String(row.reason),
    riskIfDelayed: String(row.risk_if_delayed),
    deadline: iso(row.deadline),
    allowedResponse: String(row.allowed_response),
    status: row.status as FounderDecision["status"],
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    resolvedAt: iso(row.resolved_at),
    founderResponse: row.founder_response ? String(row.founder_response) : null,
    executionResumedAt: iso(row.execution_resumed_at),
    severity: row.severity === "urgent" ? "urgent" : "normal",
    controlledTest: row.controlled_test === true,
  };
}

export type EnqueueInput = {
  workId?: string;
  source: WorkSource;
  sourceReference: string;
  title: string;
  description: string;
  ownerAgent: string;
  priority?: number;
  status?: WorkStatus;
  scheduledAt?: string | null;
  dependencyIds?: string[];
  parentWorkId?: string | null;
  maxAttempts?: number;
  founderGateRequired?: boolean;
  nextAction?: string | null;
  resourceKey?: string | null;
  actionClass?: ActionClass;
  runtimeClass?: RuntimeClass;
  controlledTest?: boolean;
  synthetic?: boolean;
  evidenceRefs?: string[];
  blockedReason?: string | null;
};

export function assertOwnerAgent(owner: string): OperatingAgentId {
  if (isKimberlyAi(owner)) {
    throw new Error("kimberly_walker_ai_is_not_an_operating_agent");
  }
  const normalized = owner.trim().toLowerCase();
  const mapped =
    normalized.includes("michelle") ? "michelle"
    : normalized.includes("imani") ? "imani"
    : normalized.includes("nia") ? "nia"
    : normalized;
  if (!isOperatingAgent(mapped)) {
    throw new Error("invalid_operating_agent");
  }
  return mapped;
}

export async function enqueueWork(input: EnqueueInput): Promise<WorkItem> {
  const owner = assertOwnerAgent(input.ownerAgent);
  if (input.actionClass === "D" && !input.founderGateRequired) {
    input.founderGateRequired = true;
  }
  const workId = input.workId ?? `aos-${randomUUID()}`;
  let status: WorkStatus = input.status ?? "QUEUED";
  if (input.founderGateRequired && status === "QUEUED") status = "FOUNDER_GATED";
  else if (input.scheduledAt && new Date(input.scheduledAt).getTime() > Date.now() && status === "QUEUED") {
    status = "DATE_GATED";
  } else if ((input.dependencyIds?.length ?? 0) > 0 && status === "QUEUED") {
    status = "DEPENDENCY_GATED";
  } else if (status === "QUEUED") {
    status = "READY";
  }
  return withAosTx(async (sql) => {
    const rows = await sql`
      INSERT INTO aos_work_items (
        work_id, source, source_reference, title, description, owner_agent,
        priority, status, scheduled_at, dependency_ids, parent_work_id,
        max_attempts, founder_gate_required, next_action, resource_key,
        action_class, runtime_class, controlled_test, synthetic, evidence_refs,
        blocked_reason
      ) VALUES (
        ${workId}, ${input.source}, ${input.sourceReference}, ${input.title},
        ${input.description}, ${owner}, ${input.priority ?? 50}, ${status},
        ${input.scheduledAt ?? null}, ${sql.json(input.dependencyIds ?? [])},
        ${input.parentWorkId ?? null}, ${input.maxAttempts ?? 3},
        ${input.founderGateRequired === true}, ${input.nextAction ?? "inspect"},
        ${input.resourceKey ?? null}, ${input.actionClass ?? "A"},
        ${input.runtimeClass ?? "hosted"}, ${input.controlledTest === true},
        ${input.synthetic === true}, ${sql.json(input.evidenceRefs ?? [])},
        ${input.blockedReason ?? null}
      )
      ON CONFLICT (work_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        updated_at = NOW()
      RETURNING *
    `;
    await audit(sql, {
      at: new Date().toISOString(),
      agent: owner,
      action: "enqueue",
      workId,
      result: status,
      detail: { source: input.source, sourceReference: input.sourceReference },
    });
    return mapWork(rows[0]);
  });
}

export async function getWork(workId: string): Promise<WorkItem | null> {
  if (!(await ensureAos())) return null;
  const sql = getAosSql();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM aos_work_items WHERE work_id = ${workId} LIMIT 1`;
  return rows[0] ? mapWork(rows[0]) : null;
}

export async function listWork(filter: {
  ownerAgent?: OperatingAgentId;
  status?: WorkStatus | WorkStatus[];
  controlledTest?: boolean;
  limit?: number;
}): Promise<WorkItem[]> {
  if (!(await ensureAos())) return [];
  const sql = getAosSql();
  if (!sql) return [];
  const limit = filter.limit ?? 200;
  const statuses = filter.status
    ? Array.isArray(filter.status) ? filter.status : [filter.status]
    : null;
  const statusFilter = statuses ?? [];
  const rows = await sql`
    SELECT * FROM aos_work_items
    WHERE (${filter.ownerAgent ?? null}::text IS NULL OR owner_agent = ${filter.ownerAgent ?? null})
      AND (${statusFilter.length} = 0 OR status = ANY(${statusFilter}))
      AND (${filter.controlledTest ?? null}::boolean IS NULL OR controlled_test = ${filter.controlledTest ?? null})
    ORDER BY priority ASC, created_at ASC
    LIMIT ${limit}
  `;
  return rows.map(mapWork);
}

export async function claimNext(input: {
  ownerAgent: OperatingAgentId;
  leaseSeconds?: number;
  engineeringRuntime?: boolean;
  includeTest?: boolean;
}): Promise<WorkItem | null> {
  const token = randomUUID();
  const leaseSeconds = input.leaseSeconds ?? 300;
  return withAosTx(async (sql) => {
    const rows = await sql`
      WITH next AS (
        SELECT w.work_id
        FROM aos_work_items w
        WHERE w.owner_agent = ${input.ownerAgent}
          AND w.status IN ('READY', 'RETRY')
          AND (w.lease_expires_at IS NULL OR w.lease_expires_at < NOW())
          AND (w.scheduled_at IS NULL OR w.scheduled_at <= NOW())
          AND (${input.includeTest === true} OR w.controlled_test = FALSE)
          AND (${input.engineeringRuntime === true} OR w.runtime_class <> 'engineering')
          AND (
            w.resource_key IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM aos_resource_locks l
              WHERE l.resource_key = w.resource_key
                AND l.lease_expires_at > NOW()
            )
          )
        ORDER BY w.priority ASC, w.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE aos_work_items w
      SET status = 'CLAIMED',
          lease_token = ${token},
          lease_expires_at = NOW() + (${String(leaseSeconds)} || ' seconds')::interval,
          started_at = COALESCE(w.started_at, NOW()),
          updated_at = NOW(),
          attempt_count = w.attempt_count + 1
      FROM next
      WHERE w.work_id = next.work_id
      RETURNING w.*
    `;
    if (!rows[0]) return null;
    const item = mapWork(rows[0]);
    if (item.resourceKey) {
      await sql`
        INSERT INTO aos_resource_locks (resource_key, work_id, owner_agent, lease_expires_at)
        VALUES (${item.resourceKey}, ${item.workId}, ${item.ownerAgent}, ${item.leaseExpiresAt})
        ON CONFLICT (resource_key) DO UPDATE SET
          work_id = EXCLUDED.work_id,
          owner_agent = EXCLUDED.owner_agent,
          lease_expires_at = EXCLUDED.lease_expires_at
      `;
    }
    await audit(sql, {
      at: new Date().toISOString(),
      agent: input.ownerAgent,
      action: "claim",
      workId: item.workId,
      result: "CLAIMED",
      detail: { leaseTokenPresent: true },
    });
    return item;
  });
}

export async function markRunning(workId: string, leaseToken: string): Promise<WorkItem | null> {
  return withAosTx(async (sql) => {
    const rows = await sql`
      UPDATE aos_work_items
      SET status = 'RUNNING', updated_at = NOW()
      WHERE work_id = ${workId} AND lease_token = ${leaseToken} AND status = 'CLAIMED'
      RETURNING *
    `;
    return rows[0] ? mapWork(rows[0]) : null;
  });
}

export async function checkpointWork(
  workId: string,
  leaseToken: string,
  checkpoint: Record<string, unknown>,
  nextAction?: string,
): Promise<WorkItem | null> {
  return withAosTx(async (sql) => {
    const rows = await sql`
      UPDATE aos_work_items
      SET checkpoint = ${sql.json(asJson(checkpoint))},
          next_action = ${nextAction ?? "continue"},
          updated_at = NOW()
      WHERE work_id = ${workId} AND lease_token = ${leaseToken}
      RETURNING *
    `;
    if (rows[0]) {
      await audit(sql, {
        at: new Date().toISOString(),
        agent: rows[0].owner_agent as OperatingAgentId,
        action: "checkpoint",
        workId,
        result: "saved",
        detail: { keys: Object.keys(checkpoint) },
      });
    }
    return rows[0] ? mapWork(rows[0]) : null;
  });
}

async function releaseLock(sql: TransactionSql, item: WorkItem): Promise<void> {
  if (!item.resourceKey) return;
  await sql`DELETE FROM aos_resource_locks WHERE resource_key = ${item.resourceKey} AND work_id = ${item.workId}`;
}

export async function releaseWork(input: {
  workId: string;
  leaseToken?: string | null;
  nextAction?: string;
  status?: "READY" | "BLOCKED";
  blockedReason?: string | null;
}): Promise<WorkItem | null> {
  return withAosTx(async (sql) => {
    const existing = await sql`SELECT * FROM aos_work_items WHERE work_id = ${input.workId} LIMIT 1`;
    if (!existing[0]) return null;
    const current = mapWork(existing[0]);
    if (input.leaseToken && current.leaseToken && current.leaseToken !== input.leaseToken) {
      return null;
    }
    const rows = await sql`
      UPDATE aos_work_items
      SET status = ${input.status ?? "READY"},
          blocked_reason = ${input.blockedReason ?? null},
          next_action = ${input.nextAction ?? current.nextAction},
          lease_token = NULL,
          lease_expires_at = NULL,
          updated_at = NOW()
      WHERE work_id = ${input.workId}
      RETURNING *
    `;
    const item = mapWork(rows[0]);
    await releaseLock(sql, current);
    return item;
  });
}

export async function completeWork(input: {
  workId: string;
  leaseToken?: string | null;
  evidenceRefs?: string[];
  nextAction?: string;
}): Promise<WorkItem | null> {
  return withAosTx(async (sql) => {
    const existing = await sql`SELECT * FROM aos_work_items WHERE work_id = ${input.workId} LIMIT 1`;
    if (!existing[0]) return null;
    const current = mapWork(existing[0]);
    if (input.leaseToken && current.leaseToken && current.leaseToken !== input.leaseToken) {
      return null;
    }
    const evidence = [...current.evidenceRefs, ...(input.evidenceRefs ?? [])];
    const rows = await sql`
      UPDATE aos_work_items
      SET status = 'COMPLETE',
          completed_at = NOW(),
          updated_at = NOW(),
          lease_token = NULL,
          lease_expires_at = NULL,
          evidence_refs = ${sql.json(evidence)},
          next_action = ${input.nextAction ?? "none"},
          error_state = NULL
      WHERE work_id = ${input.workId}
      RETURNING *
    `;
    const item = mapWork(rows[0]);
    await releaseLock(sql, current);
    await unlockDependents(sql, item.workId);
    await audit(sql, {
      at: new Date().toISOString(),
      agent: item.ownerAgent,
      action: "complete",
      workId: item.workId,
      result: "COMPLETE",
      detail: { synthetic: item.synthetic },
    });
    return item;
  });
}

export async function failWork(input: {
  workId: string;
  error: string;
  leaseToken?: string | null;
  retry?: boolean;
}): Promise<WorkItem | null> {
  return withAosTx(async (sql) => {
    const existing = await sql`SELECT * FROM aos_work_items WHERE work_id = ${input.workId} LIMIT 1`;
    if (!existing[0]) return null;
    const current = mapWork(existing[0]);
    if (input.leaseToken && current.leaseToken && current.leaseToken !== input.leaseToken) {
      return null;
    }
    const exhausted = current.attemptCount >= current.maxAttempts;
    const next: WorkStatus = input.retry !== false && !exhausted ? "RETRY" : "FAILED";
    const backoffSeconds = next === "RETRY" && current.attemptCount > 1
      ? Math.min(300, 5 * 2 ** (current.attemptCount - 2))
      : 0;
    const retryAt = backoffSeconds > 0 ? new Date(Date.now() + backoffSeconds * 1000).toISOString() : null;
    const rows = await sql`
      UPDATE aos_work_items
      SET status = ${next},
          error_state = ${input.error},
          updated_at = NOW(),
          lease_token = NULL,
          lease_expires_at = NULL,
          scheduled_at = COALESCE(${retryAt}, scheduled_at),
          completed_at = ${next === "FAILED" ? new Date().toISOString() : null}
      WHERE work_id = ${input.workId}
      RETURNING *
    `;
    const item = mapWork(rows[0]);
    await releaseLock(sql, current);
    await audit(sql, {
      at: new Date().toISOString(),
      agent: item.ownerAgent,
      action: next === "RETRY" ? "retry" : "fail",
      workId: item.workId,
      result: next,
      detail: { attemptCount: item.attemptCount, maxAttempts: item.maxAttempts },
    });
    return item;
  });
}

async function unlockDependents(sql: TransactionSql, completedId: string): Promise<number> {
  const dependents = await sql`
    SELECT * FROM aos_work_items
    WHERE status = 'DEPENDENCY_GATED'
      AND dependency_ids @> ${sql.json([completedId])}::jsonb
  `;
  let unlocked = 0;
  for (const row of dependents) {
    const item = mapWork(row);
    if (item.dependencyIds.length === 0) continue;
    const remaining = [];
    for (const depId of item.dependencyIds) {
      const dep = await sql`SELECT status FROM aos_work_items WHERE work_id = ${depId} LIMIT 1`;
      if (!dep[0] || dep[0].status !== "COMPLETE") remaining.push(depId);
    }
    if (remaining.length === 0) {
      await sql`
        UPDATE aos_work_items
        SET status = 'READY', blocked_reason = NULL, updated_at = NOW(), next_action = 'resume'
        WHERE work_id = ${item.workId}
      `;
      unlocked += 1;
    }
  }
  return unlocked;
}

export async function unlockReadyDependencies(): Promise<number> {
  return withAosTx(async (sql) => {
    const gated = await sql`SELECT * FROM aos_work_items WHERE status = 'DEPENDENCY_GATED'`;
    let unlocked = 0;
    for (const row of gated) {
      const item = mapWork(row);
      if (item.dependencyIds.length === 0) continue;
      let remaining = 0;
      for (const depId of item.dependencyIds) {
        const dep = await sql`SELECT status FROM aos_work_items WHERE work_id = ${depId} LIMIT 1`;
        if (!dep[0] || dep[0].status !== "COMPLETE") remaining += 1;
      }
      if (remaining === 0) {
        await sql`
          UPDATE aos_work_items
          SET status = 'READY', blocked_reason = NULL, updated_at = NOW()
          WHERE work_id = ${item.workId}
        `;
        unlocked += 1;
      }
    }
    return unlocked;
  });
}

export async function unlockDateGated(now = new Date()): Promise<number> {
  return withAosTx(async (sql) => {
    const rows = await sql`
      UPDATE aos_work_items
      SET status = 'READY', updated_at = NOW(), next_action = 'execute'
      WHERE status = 'DATE_GATED'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= ${now.toISOString()}
      RETURNING work_id
    `;
    return rows.length;
  });
}

export async function recoverStaleLeases(now = new Date()): Promise<number> {
  return withAosTx(async (sql) => {
    const stale = await sql`
      SELECT * FROM aos_work_items
      WHERE status IN ('CLAIMED', 'RUNNING')
        AND lease_expires_at IS NOT NULL
        AND lease_expires_at < ${now.toISOString()}
    `;
    for (const row of stale) {
      const item = mapWork(row);
      const next: WorkStatus = item.attemptCount >= item.maxAttempts ? "FAILED" : "RETRY";
      await sql`
        UPDATE aos_work_items
        SET status = ${next},
            lease_token = NULL,
            lease_expires_at = NULL,
            error_state = 'stale_lease_recovered',
            updated_at = NOW()
        WHERE work_id = ${item.workId}
      `;
      await releaseLock(sql, item);
      await audit(sql, {
        at: now.toISOString(),
        agent: "system",
        action: "watchdog",
        workId: item.workId,
        result: next,
        detail: { reason: "stale_lease" },
      });
    }
    await sql`DELETE FROM aos_resource_locks WHERE lease_expires_at < ${now.toISOString()}`;
    return stale.length;
  });
}

export async function saveHeartbeat(input: AgentHeartbeat): Promise<void> {
  if (!(await ensureAos())) return;
  const sql = getAosSql();
  if (!sql) return;
  await sql`
    INSERT INTO aos_heartbeats (
      agent, last_heartbeat, current_work_id, queue_depth, blocked_count,
      failed_count, last_completion_at, last_checkpoint, runtime_error
    ) VALUES (
      ${input.agent}, ${input.lastHeartbeat}, ${input.currentWorkId},
      ${input.queueDepth}, ${input.blockedCount}, ${input.failedCount},
      ${input.lastCompletionAt}, ${input.lastCheckpoint ? sql.json(asJson(input.lastCheckpoint)) : null},
      ${input.runtimeError}
    )
    ON CONFLICT (agent) DO UPDATE SET
      last_heartbeat = EXCLUDED.last_heartbeat,
      current_work_id = EXCLUDED.current_work_id,
      queue_depth = EXCLUDED.queue_depth,
      blocked_count = EXCLUDED.blocked_count,
      failed_count = EXCLUDED.failed_count,
      last_completion_at = EXCLUDED.last_completion_at,
      last_checkpoint = EXCLUDED.last_checkpoint,
      runtime_error = EXCLUDED.runtime_error
  `;
}

export async function listHeartbeats(): Promise<AgentHeartbeat[]> {
  if (!(await ensureAos())) return [];
  const sql = getAosSql();
  if (!sql) return [];
  const rows = await sql`SELECT * FROM aos_heartbeats`;
  return rows.map((row) => ({
    agent: row.agent as OperatingAgentId,
    lastHeartbeat: iso(row.last_heartbeat) ?? new Date().toISOString(),
    currentWorkId: row.current_work_id ? String(row.current_work_id) : null,
    queueDepth: Number(row.queue_depth),
    blockedCount: Number(row.blocked_count),
    failedCount: Number(row.failed_count),
    lastCompletionAt: iso(row.last_completion_at),
    lastCheckpoint: asObject(row.last_checkpoint),
    runtimeError: row.runtime_error ? String(row.runtime_error) : null,
  }));
}

export async function insertFounderDecision(input: Omit<FounderDecision, "createdAt" | "resolvedAt" | "executionResumedAt" | "founderResponse" | "status"> & { status?: FounderDecision["status"] }): Promise<FounderDecision> {
  return withAosTx(async (sql) => {
    const rows = await sql`
      INSERT INTO aos_founder_decisions (
        decision_id, requesting_agent, work_id, decision_required,
        agent_recommendation, reason, risk_if_delayed, deadline,
        allowed_response, status, severity, controlled_test
      ) VALUES (
        ${input.decisionId}, ${input.requestingAgent}, ${input.workId},
        ${input.decisionRequired}, ${input.agentRecommendation}, ${input.reason},
        ${input.riskIfDelayed}, ${input.deadline}, ${input.allowedResponse},
        ${input.status ?? "OPEN"}, ${input.severity}, ${input.controlledTest}
      )
      RETURNING *
    `;
    await sql`
      UPDATE aos_work_items
      SET status = 'FOUNDER_GATED',
          founder_gate_required = TRUE,
          founder_decision_id = ${input.decisionId},
          updated_at = NOW(),
          lease_token = NULL,
          lease_expires_at = NULL
      WHERE work_id = ${input.workId}
    `;
    const current = await sql`SELECT * FROM aos_work_items WHERE work_id = ${input.workId} LIMIT 1`;
    if (current[0]) await releaseLock(sql, mapWork(current[0]));
    await audit(sql, {
      at: new Date().toISOString(),
      agent: input.requestingAgent,
      action: "founder_decision_open",
      workId: input.workId,
      result: "FOUNDER_GATED",
      detail: { decisionId: input.decisionId, severity: input.severity },
    });
    return mapDecision(rows[0]);
  });
}

export async function getDecision(decisionId: string): Promise<FounderDecision | null> {
  if (!(await ensureAos())) return null;
  const sql = getAosSql();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM aos_founder_decisions WHERE decision_id = ${decisionId} LIMIT 1`;
  return rows[0] ? mapDecision(rows[0]) : null;
}

export async function listOpenDecisions(includeTest = false): Promise<FounderDecision[]> {
  if (!(await ensureAos())) return [];
  const sql = getAosSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM aos_founder_decisions
    WHERE status = 'OPEN'
      AND (${includeTest} OR controlled_test = FALSE)
    ORDER BY CASE WHEN severity = 'urgent' THEN 0 ELSE 1 END, created_at ASC
  `;
  return rows.map(mapDecision);
}

export async function resolveFounderDecision(input: {
  decisionId: string;
  status: "APPROVED" | "REJECTED" | "REVIEW";
  founderResponse: string;
}): Promise<FounderDecision | null> {
  return withAosTx(async (sql) => {
    const existing = await sql`SELECT * FROM aos_founder_decisions WHERE decision_id = ${input.decisionId} LIMIT 1`;
    if (!existing[0]) return null;
    const rows = await sql`
      UPDATE aos_founder_decisions
      SET status = ${input.status},
          founder_response = ${input.founderResponse},
          resolved_at = NOW(),
          execution_resumed_at = ${input.status === "APPROVED" ? new Date().toISOString() : null}
      WHERE decision_id = ${input.decisionId}
      RETURNING *
    `;
    const decision = mapDecision(rows[0]);
    if (input.status === "APPROVED") {
      await sql`
        UPDATE aos_work_items
        SET status = 'READY',
            blocked_reason = NULL,
            updated_at = NOW(),
            next_action = 'resume_after_founder'
        WHERE founder_decision_id = ${input.decisionId}
          AND status = 'FOUNDER_GATED'
      `;
    } else if (input.status === "REJECTED") {
      await sql`
        UPDATE aos_work_items
        SET status = 'CANCELLED',
            blocked_reason = 'founder_rejected',
            updated_at = NOW(),
            completed_at = NOW()
        WHERE founder_decision_id = ${input.decisionId}
          AND status = 'FOUNDER_GATED'
      `;
    }
    await audit(sql, {
      at: new Date().toISOString(),
      agent: "founder",
      action: "founder_decision_resolve",
      workId: decision.workId,
      result: input.status,
      detail: { decisionId: input.decisionId },
    });
    return decision;
  });
}

export async function recordNotification(input: Omit<NotificationRecord, "createdAt" | "sentAt"> & { sentAt?: string | null }): Promise<void> {
  if (!(await ensureAos())) return;
  const sql = getAosSql();
  if (!sql) return;
  await sql`
    INSERT INTO aos_notifications (
      notification_id, decision_id, channel, severity, destination_kind, status, error, sent_at
    ) VALUES (
      ${input.notificationId}, ${input.decisionId}, ${input.channel}, ${input.severity},
      ${input.destinationKind}, ${input.status}, ${input.error}, ${input.sentAt ?? null}
    )
  `;
}

export async function listNotifications(decisionId: string): Promise<NotificationRecord[]> {
  if (!(await ensureAos())) return [];
  const sql = getAosSql();
  if (!sql) return [];
  const rows = await sql`SELECT * FROM aos_notifications WHERE decision_id = ${decisionId} ORDER BY created_at`;
  return rows.map((row) => ({
    notificationId: String(row.notification_id),
    decisionId: String(row.decision_id),
    channel: row.channel as NotificationRecord["channel"],
    severity: row.severity === "urgent" ? "urgent" : "normal",
    destinationKind: row.destination_kind as NotificationRecord["destinationKind"],
    status: row.status as NotificationRecord["status"],
    error: row.error ? String(row.error) : null,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    sentAt: iso(row.sent_at),
  }));
}

export async function listAudit(workId: string): Promise<AuditEvent[]> {
  if (!(await ensureAos())) return [];
  const sql = getAosSql();
  if (!sql) return [];
  const rows = await sql`SELECT * FROM aos_audit WHERE work_id = ${workId} ORDER BY at ASC, id ASC`;
  return rows.map((row) => ({
    id: Number(row.id),
    at: iso(row.at) ?? new Date().toISOString(),
    agent: row.agent as AuditEvent["agent"],
    action: String(row.action),
    workId: row.work_id ? String(row.work_id) : null,
    result: String(row.result),
    detail: asObject(row.detail) ?? {},
  }));
}

export async function parkWork(input: {
  workId: string;
  leaseToken?: string | null;
  status: Extract<WorkStatus, "VALIDATING" | "BLOCKED" | "ACCEPTANCE_READY">;
  nextAction?: string;
  blockedReason?: string | null;
  evidenceRefs?: string[];
  holdResourceLock?: boolean;
  lockSeconds?: number;
}): Promise<WorkItem | null> {
  return withAosTx(async (sql) => {
    const existing = await sql`SELECT * FROM aos_work_items WHERE work_id = ${input.workId} LIMIT 1`;
    if (!existing[0]) return null;
    const current = mapWork(existing[0]);
    if (input.leaseToken && current.leaseToken && current.leaseToken !== input.leaseToken) {
      return null;
    }
    const evidence = input.evidenceRefs
      ? [...current.evidenceRefs, ...input.evidenceRefs]
      : current.evidenceRefs;
    const rows = await sql`
      UPDATE aos_work_items
      SET status = ${input.status},
          blocked_reason = ${input.blockedReason ?? null},
          next_action = ${input.nextAction ?? current.nextAction},
          evidence_refs = ${sql.json(evidence)},
          lease_token = NULL,
          lease_expires_at = NULL,
          updated_at = NOW()
      WHERE work_id = ${input.workId}
      RETURNING *
    `;
    const item = mapWork(rows[0]);
    if (input.holdResourceLock) {
      const key = item.resourceKey ?? `work:${item.workId}`;
      const lockSeconds = input.lockSeconds ?? 21600;
      const expires = new Date(Date.now() + lockSeconds * 1000).toISOString();
      await sql`
        INSERT INTO aos_resource_locks (resource_key, work_id, owner_agent, lease_expires_at)
        VALUES (${key}, ${item.workId}, ${item.ownerAgent}, ${expires})
        ON CONFLICT (resource_key) DO UPDATE SET
          work_id = EXCLUDED.work_id,
          owner_agent = EXCLUDED.owner_agent,
          lease_expires_at = EXCLUDED.lease_expires_at
      `;
    } else {
      await releaseLock(sql, current);
    }
    await audit(sql, {
      at: new Date().toISOString(),
      agent: item.ownerAgent,
      action: "park",
      workId: item.workId,
      result: input.status,
      detail: { blockedReason: input.blockedReason ?? null, holdResourceLock: input.holdResourceLock === true },
    });
    return item;
  });
}

export async function unblockLegacyEngineeringRuntime(): Promise<number> {
  if (!(await ensureAos())) return 0;
  const sql = getAosSql();
  if (!sql) return 0;
  const rows = await sql`
    UPDATE aos_work_items
    SET status = 'READY',
        blocked_reason = NULL,
        next_action = 'execute',
        updated_at = NOW()
    WHERE status = 'BLOCKED'
      AND runtime_class = 'engineering'
      AND blocked_reason = 'engineering_runtime_required'
    RETURNING work_id
  `;
  return rows.length;
}

export async function unblockUnconfiguredEngineering(configured: boolean): Promise<number> {
  if (!configured) return 0;
  if (!(await ensureAos())) return 0;
  const sql = getAosSql();
  if (!sql) return 0;
  const rows = await sql`
    UPDATE aos_work_items
    SET status = 'READY',
        blocked_reason = NULL,
        next_action = 'execute',
        updated_at = NOW()
    WHERE status = 'BLOCKED'
      AND runtime_class = 'engineering'
      AND blocked_reason = 'cursor_cloud_agent_not_configured'
    RETURNING work_id
  `;
  return rows.length;
}

export async function insertEngineeringJob(input: {
  jobId?: string;
  workId: string;
  sourceReference?: string;
  ownerAgent: OperatingAgentId;
  providerAgentId?: string | null;
  providerRunId?: string | null;
  repository: string;
  branch?: string | null;
  prUrl?: string | null;
  prompt: string;
  status: EngineeringJobStatus;
  filesChanged?: string[];
  commands?: string[];
  validation?: Record<string, unknown>;
  error?: string | null;
  founderDecisionRequired?: boolean;
  controlledTest?: boolean;
  synthetic?: boolean;
  detail?: Record<string, unknown>;
}): Promise<EngineeringJob> {
  const jobId = input.jobId ?? `aos-eng-${randomUUID()}`;
  return withAosTx(async (sql) => {
    const rows = await sql`
      INSERT INTO aos_engineering_jobs (
        job_id, work_id, source_reference, owner_agent, provider,
        provider_agent_id, provider_run_id, repository, branch, pr_url,
        prompt, status, heartbeat_at, started_at, files_changed, commands,
        validation, error, founder_decision_required, controlled_test,
        synthetic, detail
      ) VALUES (
        ${jobId}, ${input.workId}, ${input.sourceReference ?? ""}, ${input.ownerAgent},
        'cursor_cloud_agent', ${input.providerAgentId ?? null}, ${input.providerRunId ?? null},
        ${input.repository}, ${input.branch ?? null}, ${input.prUrl ?? null},
        ${input.prompt}, ${input.status}, NOW(), NOW(),
        ${sql.json(input.filesChanged ?? [])}, ${sql.json(input.commands ?? [])},
        ${sql.json(asJson(input.validation ?? {}))}, ${input.error ?? null},
        ${input.founderDecisionRequired === true}, ${input.controlledTest === true},
        ${input.synthetic === true}, ${sql.json(asJson(input.detail ?? {}))}
      )
      RETURNING *
    `;
    await audit(sql, {
      at: new Date().toISOString(),
      agent: input.ownerAgent,
      action: "engineering_job_insert",
      workId: input.workId,
      result: input.status,
      detail: { jobId, provider: "cursor_cloud_agent" },
    });
    return mapJob(rows[0]);
  });
}

export async function updateEngineeringJob(
  jobId: string,
  patch: {
    providerAgentId?: string | null;
    providerRunId?: string | null;
    branch?: string | null;
    prUrl?: string | null;
    commitSha?: string | null;
    status?: EngineeringJobStatus;
    filesChanged?: string[];
    commands?: string[];
    validation?: Record<string, unknown>;
    error?: string | null;
    retryCount?: number;
    detail?: Record<string, unknown>;
    completed?: boolean;
  },
): Promise<EngineeringJob | null> {
  return withAosTx(async (sql) => {
    const existing = await sql`SELECT * FROM aos_engineering_jobs WHERE job_id = ${jobId} LIMIT 1`;
    if (!existing[0]) return null;
    const current = mapJob(existing[0]);
    const nextDetail = patch.detail ? { ...current.detail, ...patch.detail } : current.detail;
    const rows = await sql`
      UPDATE aos_engineering_jobs
      SET provider_agent_id = ${patch.providerAgentId ?? current.providerAgentId},
          provider_run_id = ${patch.providerRunId ?? current.providerRunId},
          branch = ${patch.branch ?? current.branch},
          pr_url = ${patch.prUrl ?? current.prUrl},
          commit_sha = ${patch.commitSha ?? current.commitSha},
          status = ${patch.status ?? current.status},
          files_changed = ${sql.json(patch.filesChanged ?? current.filesChanged)},
          commands = ${sql.json(patch.commands ?? current.commands)},
          validation = ${sql.json(asJson(patch.validation ?? current.validation))},
          error = ${patch.error === undefined ? current.error : patch.error},
          retry_count = ${patch.retryCount ?? current.retryCount},
          detail = ${sql.json(asJson(nextDetail))},
          heartbeat_at = NOW(),
          completed_at = ${patch.completed ? new Date().toISOString() : current.completedAt},
          updated_at = NOW()
      WHERE job_id = ${jobId}
      RETURNING *
    `;
    return rows[0] ? mapJob(rows[0]) : null;
  });
}

export async function getEngineeringJobByWorkId(workId: string): Promise<EngineeringJob | null> {
  if (!(await ensureAos())) return null;
  const sql = getAosSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM aos_engineering_jobs
    WHERE work_id = ${workId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function getEngineeringJob(jobId: string): Promise<EngineeringJob | null> {
  if (!(await ensureAos())) return null;
  const sql = getAosSql();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM aos_engineering_jobs WHERE job_id = ${jobId} LIMIT 1`;
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function listOpenEngineeringJobs(): Promise<EngineeringJob[]> {
  if (!(await ensureAos())) return [];
  const sql = getAosSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM aos_engineering_jobs
    WHERE status IN ('blocked_unconfigured', 'launching', 'running', 'validating')
    ORDER BY created_at ASC
  `;
  return rows.map(mapJob);
}

export async function listEngineeringJobs(limit = 20): Promise<EngineeringJob[]> {
  if (!(await ensureAos())) return [];
  const sql = getAosSql();
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM aos_engineering_jobs
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;
  return rows.map(mapJob);
}

export async function countActiveEngineeringJobs(): Promise<number> {
  if (!(await ensureAos())) return 0;
  const sql = getAosSql();
  if (!sql) return 0;
  const rows = await sql`
    SELECT COUNT(*)::int AS n
    FROM aos_engineering_jobs
    WHERE status IN ('launching', 'running', 'validating')
  `;
  return Number(rows[0]?.n ?? 0);
}

export async function recordCost(agent: OperatingAgentId, workId: string | null, kind: string, units = 1, note = ""): Promise<void> {
  if (!(await ensureAos())) return;
  const sql = getAosSql();
  if (!sql) return;
  await sql`
    INSERT INTO aos_cost_events (agent, work_id, kind, units, note)
    VALUES (${agent}, ${workId}, ${kind}, ${units}, ${note})
  `;
}

export async function purgeControlledTests(prefix?: string): Promise<number> {
  if (!(await ensureAos())) return 0;
  const sql = getAosSql();
  if (!sql) return 0;
  const like = prefix ? `${prefix}%` : null;
  await sql`
    DELETE FROM aos_engineering_jobs
    WHERE controlled_test = TRUE
      AND (${like}::text IS NULL OR work_id LIKE ${like})
  `;
  const deleted = await sql`
    DELETE FROM aos_work_items
    WHERE controlled_test = TRUE
      AND (${like}::text IS NULL OR work_id LIKE ${like})
    RETURNING work_id
  `;
  await sql`DELETE FROM aos_founder_decisions WHERE controlled_test = TRUE`;
  await sql`DELETE FROM aos_resource_locks WHERE work_id LIKE ${prefix ? `${prefix}%` : "aos-test-%"}`;
  return deleted.length;
}

async function audit(sql: TransactionSql, event: AuditEvent): Promise<void> {
  await sql`
    INSERT INTO aos_audit (at, agent, action, work_id, result, detail)
    VALUES (${event.at}, ${event.agent}, ${event.action}, ${event.workId}, ${event.result}, ${sql.json(asJson(event.detail))})
  `;
}
