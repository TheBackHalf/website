import type { JSONValue, TransactionSql } from "postgres";

import {
  getMichelleSql,
  michelleBackendConfigured,
  redactPersistError,
  withMichelleTx,
} from "@/lib/fab-5/michelle-db";

export type SourceClass =
  | "CURRENT_AUTHORITATIVE"
  | "LOCKED"
  | "FOUNDER_ACCEPTED"
  | "APPROVED"
  | "SUPERSEDED"
  | "HISTORICAL"
  | "DRAFT"
  | "UNVERIFIED";

export type MichelleReadiness =
  | "NOT STARTED"
  | "IN PROGRESS"
  | "BLOCKED"
  | "READY FOR VERIFICATION"
  | "VERIFICATION FAILED"
  | "READY WITH ACCEPTED RISK"
  | "FOUNDER ACTION REQUIRED"
  | "HUMAN EXPERT REQUIRED"
  | "COMPLETE"
  | "FOUNDER ACCEPTED";

export type FounderReportClassMichelle =
  | "ACTION REQUIRED"
  | "DECISION REQUIRED"
  | "MATERIAL BLOCKER"
  | "MATERIAL RISK"
  | "ROW READY FOR FOUNDER ACCEPTANCE"
  | "SCHEDULE / LAUNCH THREAT"
  | "NONE";

export type MichelleDecisionRecord = {
  id: string;
  at: string;
  row: string;
  workstream: string;
  decision: string;
  decisionOwner: "michelle" | "imani" | "nia" | "founder";
  authoritySource: string;
  evidence: string[];
  assumptions: string[];
  dissent: string;
  confidence: "low" | "medium" | "high";
  impact: string;
  reversibility: string;
  founderApprovalRequired: boolean;
  humanExpertRequired: boolean;
  supersedes: string | null;
  status: "appended" | "superseded";
};

export type FounderActionItem = {
  id: string;
  row: string;
  action: string;
  whyFounderAuthorityRequired: string;
  recommendation: string;
  alternatives: string[];
  evidence: string[];
  assumptions: string[];
  dissent: string;
  confidence: "low" | "medium" | "high";
  dependency: string;
  urgency: "low" | "medium" | "high";
  impactIfDelayed: string;
  resolved: boolean;
};

export type HumanExpertAction = {
  id: string;
  row: string;
  expertType: string;
  reason: string;
  evidence: string[];
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
};

export type MichelleBlocker = {
  id: string;
  row: string;
  blockingExecutive: string;
  issue: string;
  evidence: string[];
  severity: "low" | "medium" | "high";
  owner: string;
  requiredCorrection: string;
  retestRequirement: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
};

export type MichelleDependencyState = {
  row: string;
  blockedBy: string[];
  unlocks: string[];
  parallelWith: string[];
  founderDependency: boolean;
  humanExpertDependency: boolean;
  externalSystemDependency: string | null;
  updatedAt: string;
};

export type MichelleReadinessRow = {
  row: string;
  state: MichelleReadiness;
  owner: string;
  evidenceReferences: string[];
  blockers: string[];
  verificationState: string;
  updatedAt: string;
  updatedBy: string;
};

export type MichelleRunRecord = {
  runId: string;
  idempotencyKey: string;
  trigger: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  rowTask: string;
  sourceReferences: string[];
  plan: string[];
  result: unknown;
  nextAction: string | null;
  error: string | null;
  retryCount: number;
};

export type MichelleRuntimeOverlay = {
  version: 1;
  updatedAt: string;
  decisions: MichelleDecisionRecord[];
  founderActions: FounderActionItem[];
  executionHistory: string[];
  lastRunId: string | null;
};

export type PersistResult = {
  attempted: boolean;
  durable: boolean;
  backend: "supabase_postgres" | "none";
  path: string;
  note: string;
  duplicate?: boolean;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function emptyOverlay(): MichelleRuntimeOverlay {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    decisions: [],
    founderActions: [],
    executionHistory: [],
    lastRunId: null,
  };
}

function mapDecision(row: Record<string, unknown>): MichelleDecisionRecord {
  return {
    id: String(row.decision_id),
    at: new Date(String(row.at)).toISOString(),
    row: String(row.row_id),
    workstream: String(row.workstream),
    decision: String(row.decision),
    decisionOwner: String(row.owner) as MichelleDecisionRecord["decisionOwner"],
    authoritySource: String(row.authority_source),
    evidence: asStringArray(row.evidence_references),
    assumptions: asStringArray(row.assumptions),
    dissent: String(row.dissent ?? ""),
    confidence: String(row.confidence) as MichelleDecisionRecord["confidence"],
    impact: String(row.impact),
    reversibility: String(row.reversibility),
    founderApprovalRequired: Boolean(row.founder_approval_required),
    humanExpertRequired: Boolean(row.human_expert_required),
    supersedes: row.supersedes ? String(row.supersedes) : null,
    status: String(row.status) as MichelleDecisionRecord["status"],
  };
}

function mapFounder(row: Record<string, unknown>): FounderActionItem {
  const status = String(row.status);
  return {
    id: String(row.action_id),
    row: String(row.row_id),
    action: String(row.action),
    whyFounderAuthorityRequired: String(row.reason_founder_required),
    recommendation: String(row.recommendation),
    alternatives: asStringArray(row.alternatives),
    evidence: asStringArray(row.evidence),
    assumptions: asStringArray(row.assumptions),
    dissent: String(row.dissent ?? ""),
    confidence: String(row.confidence) as FounderActionItem["confidence"],
    dependency: String(row.dependency ?? ""),
    urgency: String(row.urgency) as FounderActionItem["urgency"],
    impactIfDelayed: "",
    resolved: status === "resolved",
  };
}

function mapRun(row: Record<string, unknown>): MichelleRunRecord {
  return {
    runId: String(row.run_id),
    idempotencyKey: String(row.idempotency_key),
    trigger: String(row.trigger),
    startedAt: new Date(String(row.started_at)).toISOString(),
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
    status: String(row.status),
    rowTask: String(row.row_task ?? ""),
    sourceReferences: asStringArray(row.source_references),
    plan: asStringArray(row.plan),
    result: row.result ?? null,
    nextAction: row.next_action ? String(row.next_action) : null,
    error: row.error ? String(row.error) : null,
    retryCount: Number(row.retry_count ?? 0),
  };
}

async function insertAudit(
  sql: TransactionSql,
  input: {
    what: string;
    why: string;
    previous?: unknown;
    next?: unknown;
    evidence?: string[];
  },
): Promise<void> {
  await sql`
    INSERT INTO michelle_audit (agent, what, why, authority, evidence, previous_state, new_state)
    VALUES (
      'michelle',
      ${input.what},
      ${input.why},
      'ops/fab-5/operating-system.json Rows 15-19',
      ${sql.json(input.evidence ?? [])},
      ${input.previous == null ? null : sql.json(input.previous as JSONValue)},
      ${input.next == null ? null : sql.json(input.next as JSONValue)}
    )
  `;
}

export async function loadMichelleOverlay(): Promise<{
  overlay: MichelleRuntimeOverlay;
  durable: boolean;
  note: string;
}> {
  if (!michelleBackendConfigured() || !getMichelleSql()) {
    return {
      overlay: emptyOverlay(),
      durable: false,
      note: "Supabase Postgres env not visible in this process. Catalog ops/fab-5 remains the static source.",
    };
  }
  try {
    const overlay = await withMichelleTx(async (sql) => assembleOverlay(sql));
    return {
      overlay,
      durable: true,
      note: "Loaded Michelle mutable state from existing Supabase Postgres.",
    };
  } catch (error) {
    return {
      overlay: emptyOverlay(),
      durable: false,
      note: `Durable load failed: ${redactPersistError(error)}`,
    };
  }
}

async function assembleOverlay(sql: TransactionSql): Promise<MichelleRuntimeOverlay> {
  const decisions = await sql`SELECT * FROM michelle_decisions ORDER BY at ASC`;
  const founder = await sql`SELECT * FROM michelle_founder_actions WHERE status = 'open' ORDER BY created_at ASC`;
  const runs = await sql`SELECT run_id FROM michelle_runs ORDER BY started_at DESC LIMIT 50`;
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    decisions: decisions.map((row) => mapDecision(row as Record<string, unknown>)),
    founderActions: founder.map((row) => mapFounder(row as Record<string, unknown>)),
    executionHistory: runs.map((row) => String(row.run_id)).reverse(),
    lastRunId: runs[0] ? String(runs[0].run_id) : null,
  };
}

export async function saveMichelleOverlay(
  overlay: MichelleRuntimeOverlay,
): Promise<PersistResult> {
  void overlay;
  return {
    attempted: true,
    durable: michelleBackendConfigured(),
    backend: michelleBackendConfigured() ? "supabase_postgres" : "none",
    path: "supabase:michelle_*",
    note: "Mutable state is written per-record, not as a /tmp overlay.",
  };
}

export function appendDecision(
  overlay: MichelleRuntimeOverlay,
  record: MichelleDecisionRecord,
): MichelleRuntimeOverlay {
  const decisions = overlay.decisions.map((entry) =>
    record.supersedes && entry.id === record.supersedes
      ? { ...entry, status: "superseded" as const }
      : entry,
  );
  return {
    ...overlay,
    decisions: [...decisions, record],
    executionHistory: [...overlay.executionHistory.slice(-49), record.id],
  };
}

export function upsertFounderAction(
  overlay: MichelleRuntimeOverlay,
  item: FounderActionItem,
): MichelleRuntimeOverlay {
  const without = overlay.founderActions.filter((entry) => entry.id !== item.id && !entry.resolved);
  return { ...overlay, founderActions: item.resolved ? without : [...without, item] };
}

export async function persistDecision(record: MichelleDecisionRecord, controlledTest = false): Promise<boolean> {
  const inserted = await withMichelleTx(async (sql) => {
    if (record.supersedes) {
      await sql`
        UPDATE michelle_decisions
        SET status = 'superseded'
        WHERE decision_id = ${record.supersedes}
      `;
    }
    const rows = await sql`
      INSERT INTO michelle_decisions (
        decision_id, at, row_id, workstream, decision, owner, authority_source,
        evidence_references, assumptions, dissent, confidence, impact, reversibility,
        founder_approval_required, human_expert_required, supersedes, status, controlled_test
      ) VALUES (
        ${record.id}, ${record.at}, ${record.row}, ${record.workstream}, ${record.decision},
        ${record.decisionOwner}, ${record.authoritySource}, ${sql.json(record.evidence)},
        ${sql.json(record.assumptions)}, ${record.dissent}, ${record.confidence}, ${record.impact},
        ${record.reversibility}, ${record.founderApprovalRequired}, ${record.humanExpertRequired},
        ${record.supersedes}, ${record.status}, ${controlledTest}
      )
      ON CONFLICT (decision_id) DO NOTHING
      RETURNING decision_id
    `;
    await insertAudit(sql, {
      what: "decision",
      why: record.decision,
      next: record,
      evidence: record.evidence,
    });
    return rows.length > 0;
  });
  return inserted;
}

export async function persistFounderAction(item: FounderActionItem): Promise<boolean> {
  const now = new Date().toISOString();
  const status = item.resolved ? "resolved" : "open";
  try {
  return await withMichelleTx(async (sql) => {
    const previous = await sql`
      SELECT * FROM michelle_founder_actions WHERE action_id = ${item.id}
    `;
    const rows = await sql`
      INSERT INTO michelle_founder_actions (
        action_id, row_id, action, reason_founder_required, recommendation, alternatives,
        evidence, assumptions, dissent, confidence, dependency, urgency, status, created_at, resolved_at
      ) VALUES (
        ${item.id}, ${item.row}, ${item.action}, ${item.whyFounderAuthorityRequired},
        ${item.recommendation}, ${sql.json(item.alternatives)}, ${sql.json(item.evidence)},
        ${sql.json(item.assumptions)}, ${item.dissent}, ${item.confidence}, ${item.dependency},
        ${item.urgency}, ${status}, ${now}, ${item.resolved ? now : null}
      )
      ON CONFLICT (action_id) DO UPDATE SET
        status = EXCLUDED.status,
        resolved_at = EXCLUDED.resolved_at
      RETURNING action_id
    `;
    await insertAudit(sql, {
      what: "founder_action",
      why: item.whyFounderAuthorityRequired,
      previous: previous[0] ?? null,
      next: item,
      evidence: item.evidence,
    });
    return rows.length > 0;
  });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "23505") return false;
    throw error;
  }
}

export async function persistHumanExpertAction(item: HumanExpertAction): Promise<void> {
  await withMichelleTx(async (sql) => {
    await sql`
      INSERT INTO michelle_human_expert_actions (
        action_id, row_id, expert_type, reason, evidence, status, created_at, resolved_at
      ) VALUES (
        ${item.id}, ${item.row}, ${item.expertType}, ${item.reason}, ${sql.json(item.evidence)},
        ${item.status}, ${item.createdAt}, ${item.resolvedAt}
      )
      ON CONFLICT (action_id) DO UPDATE SET
        status = EXCLUDED.status,
        resolved_at = EXCLUDED.resolved_at
    `;
    await insertAudit(sql, {
      what: "human_expert_action",
      why: item.reason,
      next: item,
      evidence: item.evidence,
    });
  });
}

export async function persistBlocker(item: MichelleBlocker): Promise<void> {
  await withMichelleTx(async (sql) => {
    await sql`
      INSERT INTO michelle_blockers (
        block_id, row_id, blocking_executive, issue, evidence, severity, owner,
        required_correction, retest_requirement, status, created_at, resolved_at
      ) VALUES (
        ${item.id}, ${item.row}, ${item.blockingExecutive}, ${item.issue}, ${sql.json(item.evidence)},
        ${item.severity}, ${item.owner}, ${item.requiredCorrection}, ${item.retestRequirement},
        ${item.status}, ${item.createdAt}, ${item.resolvedAt}
      )
      ON CONFLICT (block_id) DO UPDATE SET
        status = EXCLUDED.status,
        resolved_at = EXCLUDED.resolved_at
    `;
    await insertAudit(sql, {
      what: "blocker",
      why: item.issue,
      next: item,
      evidence: item.evidence,
    });
  });
}

export async function persistReadiness(row: MichelleReadinessRow): Promise<void> {
  await withMichelleTx(async (sql) => {
    const previous = await sql`SELECT * FROM michelle_readiness WHERE row_id = ${row.row}`;
    await sql`
      INSERT INTO michelle_readiness (
        row_id, state, owner, evidence_references, blockers, verification_state, updated_at, updated_by
      ) VALUES (
        ${row.row}, ${row.state}, ${row.owner}, ${sql.json(row.evidenceReferences)},
        ${sql.json(row.blockers)}, ${row.verificationState}, ${row.updatedAt}, ${row.updatedBy}
      )
      ON CONFLICT (row_id) DO UPDATE SET
        state = EXCLUDED.state,
        owner = EXCLUDED.owner,
        evidence_references = EXCLUDED.evidence_references,
        blockers = EXCLUDED.blockers,
        verification_state = EXCLUDED.verification_state,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
    await insertAudit(sql, {
      what: "readiness",
      why: `Readiness ${row.row} -> ${row.state}`,
      previous: previous[0] ?? null,
      next: row,
      evidence: row.evidenceReferences,
    });
  });
}

export async function persistDependency(row: MichelleDependencyState): Promise<void> {
  await withMichelleTx(async (sql) => {
    await sql`
      INSERT INTO michelle_dependencies (
        row_id, blocked_by, unlocks, parallel_with, founder_dependency,
        human_expert_dependency, external_system_dependency, updated_at
      ) VALUES (
        ${row.row}, ${sql.json(row.blockedBy)}, ${sql.json(row.unlocks)}, ${sql.json(row.parallelWith)},
        ${row.founderDependency}, ${row.humanExpertDependency}, ${row.externalSystemDependency}, ${row.updatedAt}
      )
      ON CONFLICT (row_id) DO UPDATE SET
        blocked_by = EXCLUDED.blocked_by,
        unlocks = EXCLUDED.unlocks,
        parallel_with = EXCLUDED.parallel_with,
        founder_dependency = EXCLUDED.founder_dependency,
        human_expert_dependency = EXCLUDED.human_expert_dependency,
        external_system_dependency = EXCLUDED.external_system_dependency,
        updated_at = EXCLUDED.updated_at
    `;
    await insertAudit(sql, {
      what: "dependency",
      why: `Dependency state for ${row.row}`,
      next: row,
    });
  });
}

export async function persistRun(run: MichelleRunRecord): Promise<{ created: boolean; existing?: MichelleRunRecord }> {
  return withMichelleTx(async (sql) => {
    const existing = await sql`
      SELECT * FROM michelle_runs WHERE idempotency_key = ${run.idempotencyKey}
    `;
    if (existing.length > 0) {
      return { created: false, existing: mapRun(existing[0] as Record<string, unknown>) };
    }
    await sql`
      INSERT INTO michelle_runs (
        run_id, idempotency_key, trigger, started_at, completed_at, status, row_task,
        source_references, plan, result, next_action, error, retry_count, created_by
      ) VALUES (
        ${run.runId}, ${run.idempotencyKey}, ${run.trigger}, ${run.startedAt}, ${run.completedAt},
        ${run.status}, ${run.rowTask}, ${sql.json(run.sourceReferences)}, ${sql.json(run.plan)},
        ${run.result == null ? null : sql.json(run.result as JSONValue)},
        ${run.nextAction}, ${run.error}, ${run.retryCount}, 'michelle'
      )
    `;
    await insertAudit(sql, {
      what: "run",
      why: run.rowTask,
      next: { runId: run.runId, status: run.status },
    });
    return { created: true };
  });
}

export async function completeRun(run: MichelleRunRecord): Promise<void> {
  await withMichelleTx(async (sql) => {
    await sql`
      UPDATE michelle_runs SET
        completed_at = ${run.completedAt},
        status = ${run.status},
        result = ${run.result == null ? null : sql.json(run.result as JSONValue)},
        next_action = ${run.nextAction},
        error = ${run.error},
        retry_count = ${run.retryCount}
      WHERE run_id = ${run.runId}
    `;
    await sql`
      INSERT INTO michelle_work_queue (item_id, payload, status, next_action, updated_at)
      VALUES (
        ${`next-${run.runId}`},
        ${sql.json({ runId: run.runId })},
        ${run.status},
        ${run.nextAction},
        ${run.completedAt ?? new Date().toISOString()}
      )
      ON CONFLICT (item_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        status = EXCLUDED.status,
        next_action = EXCLUDED.next_action,
        updated_at = EXCLUDED.updated_at
    `;
    await insertAudit(sql, {
      what: "run_complete",
      why: run.nextAction ?? run.rowTask,
      next: { runId: run.runId, status: run.status },
    });
  });
}

export async function persistEstimate(rowId: string, payload: unknown): Promise<void> {
  const now = new Date().toISOString();
  await withMichelleTx(async (sql) => {
    await sql`
      INSERT INTO michelle_estimates (row_id, payload, updated_at)
      VALUES (${rowId}, ${sql.json(payload as JSONValue)}, ${now})
      ON CONFLICT (row_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
    `;
    await insertAudit(sql, { what: "estimate", why: `Estimate ${rowId}`, next: payload });
  });
}

export async function persistCriticalPath(payload: unknown): Promise<void> {
  const now = new Date().toISOString();
  await withMichelleTx(async (sql) => {
    await sql`
      INSERT INTO michelle_critical_path (id, payload, updated_at)
      VALUES ('current', ${sql.json(payload as JSONValue)}, ${now})
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
    `;
    await insertAudit(sql, { what: "critical_path", why: "Derived remaining critical path", next: payload });
  });
}

export async function persistRetryState(input: {
  key: string;
  retryCount: number;
  lastError: string | null;
  status: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await withMichelleTx(async (sql) => {
    await sql`
      INSERT INTO michelle_retry_state (key, retry_count, last_error, status, updated_at)
      VALUES (${input.key}, ${input.retryCount}, ${input.lastError}, ${input.status}, ${now})
      ON CONFLICT (key) DO UPDATE SET
        retry_count = EXCLUDED.retry_count,
        last_error = EXCLUDED.last_error,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `;
    await insertAudit(sql, { what: "retry_state", why: input.status, next: input });
  });
}

export async function incrementRetryState(key: string, lastError: string): Promise<{ retryCount: number; status: string }> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`
      INSERT INTO michelle_retry_state (key, retry_count, last_error, status, updated_at)
      VALUES (${key}, 1, ${lastError}, 'retrying', ${new Date().toISOString()})
      ON CONFLICT (key) DO UPDATE SET
        retry_count = michelle_retry_state.retry_count + 1,
        last_error = EXCLUDED.last_error,
        status = CASE WHEN michelle_retry_state.retry_count + 1 >= 2 THEN 'exhausted' ELSE 'retrying' END,
        updated_at = EXCLUDED.updated_at
      RETURNING retry_count, status
    `;
    const retryCount = Number(rows[0]?.retry_count ?? 1);
    const status = String(rows[0]?.status ?? "retrying");
    await insertAudit(sql, { what: "retry_increment", why: lastError, next: { key, retryCount, status } });
    return { retryCount, status };
  });
}

export async function getDecision(id: string): Promise<MichelleDecisionRecord | null> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`SELECT * FROM michelle_decisions WHERE decision_id = ${id}`;
    return rows[0] ? mapDecision(rows[0] as Record<string, unknown>) : null;
  });
}

export async function getFounderAction(id: string): Promise<FounderActionItem | null> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`SELECT * FROM michelle_founder_actions WHERE action_id = ${id}`;
    return rows[0] ? mapFounder(rows[0] as Record<string, unknown>) : null;
  });
}

export async function getRun(id: string): Promise<MichelleRunRecord | null> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`SELECT * FROM michelle_runs WHERE run_id = ${id}`;
    return rows[0] ? mapRun(rows[0] as Record<string, unknown>) : null;
  });
}

export async function getReadiness(row: string): Promise<MichelleReadinessRow | null> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`SELECT * FROM michelle_readiness WHERE row_id = ${row}`;
    if (!rows[0]) return null;
    const item = rows[0] as Record<string, unknown>;
    return {
      row: String(item.row_id),
      state: String(item.state) as MichelleReadiness,
      owner: String(item.owner),
      evidenceReferences: asStringArray(item.evidence_references),
      blockers: asStringArray(item.blockers),
      verificationState: String(item.verification_state ?? ""),
      updatedAt: new Date(String(item.updated_at)).toISOString(),
      updatedBy: String(item.updated_by),
    };
  });
}

export async function getBlocker(id: string): Promise<MichelleBlocker | null> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`SELECT * FROM michelle_blockers WHERE block_id = ${id}`;
    if (!rows[0]) return null;
    const item = rows[0] as Record<string, unknown>;
    return {
      id: String(item.block_id),
      row: String(item.row_id),
      blockingExecutive: String(item.blocking_executive),
      issue: String(item.issue),
      evidence: asStringArray(item.evidence),
      severity: String(item.severity) as MichelleBlocker["severity"],
      owner: String(item.owner),
      requiredCorrection: String(item.required_correction),
      retestRequirement: String(item.retest_requirement),
      status: String(item.status) as MichelleBlocker["status"],
      createdAt: new Date(String(item.created_at)).toISOString(),
      resolvedAt: item.resolved_at ? new Date(String(item.resolved_at)).toISOString() : null,
    };
  });
}

export async function getRetryState(key: string): Promise<{ retryCount: number; status: string; lastError: string | null } | null> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`SELECT * FROM michelle_retry_state WHERE key = ${key}`;
    if (!rows[0]) return null;
    return {
      retryCount: Number(rows[0].retry_count),
      status: String(rows[0].status),
      lastError: rows[0].last_error ? String(rows[0].last_error) : null,
    };
  });
}

export async function getHumanExpertAction(id: string): Promise<HumanExpertAction | null> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`SELECT * FROM michelle_human_expert_actions WHERE action_id = ${id}`;
    if (!rows[0]) return null;
    const item = rows[0] as Record<string, unknown>;
    return {
      id: String(item.action_id),
      row: String(item.row_id),
      expertType: String(item.expert_type),
      reason: String(item.reason),
      evidence: asStringArray(item.evidence),
      status: String(item.status) as HumanExpertAction["status"],
      createdAt: new Date(String(item.created_at)).toISOString(),
      resolvedAt: item.resolved_at ? new Date(String(item.resolved_at)).toISOString() : null,
    };
  });
}

export async function getDependency(row: string): Promise<MichelleDependencyState | null> {
  return withMichelleTx(async (sql) => {
    const rows = await sql`SELECT * FROM michelle_dependencies WHERE row_id = ${row}`;
    if (!rows[0]) return null;
    const item = rows[0] as Record<string, unknown>;
    return {
      row: String(item.row_id),
      blockedBy: asStringArray(item.blocked_by),
      unlocks: asStringArray(item.unlocks),
      parallelWith: asStringArray(item.parallel_with),
      founderDependency: Boolean(item.founder_dependency),
      humanExpertDependency: Boolean(item.human_expert_dependency),
      externalSystemDependency: item.external_system_dependency ? String(item.external_system_dependency) : null,
      updatedAt: new Date(String(item.updated_at)).toISOString(),
    };
  });
}

export async function resolveControlledTest(key: string): Promise<void> {
  const now = new Date().toISOString();
  await withMichelleTx(async (sql) => {
    await sql`UPDATE michelle_founder_actions SET status = 'resolved', resolved_at = ${now} WHERE action_id = ${`founder-${key}`}`;
    await sql`UPDATE michelle_blockers SET status = 'resolved', resolved_at = ${now} WHERE block_id = ${`block-${key}`}`;
    await sql`UPDATE michelle_human_expert_actions SET status = 'resolved', resolved_at = ${now} WHERE action_id = ${`hexp-${key}`}`;
    await sql`UPDATE michelle_readiness SET state = 'IN PROGRESS', updated_at = ${now}, updated_by = 'michelle' WHERE row_id = ${`dur-test-${key}`}`;
    await insertAudit(sql, { what: "resolve_controlled_test", why: "Clear disposable durability-test items", next: { key } });
  });
}

export { michelleBackendConfigured, redactPersistError };
