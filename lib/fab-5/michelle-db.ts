import postgres, { type Sql, type TransactionSql } from "postgres";

import { AOS_SCHEMA_SQL } from "@/lib/fab-5/aos/schema";

function sanitizeDbError(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
    .replace(/eyJ[A-Za-z0-9_-]{20,}/g, "[redacted]");
}

function connectionUrl(): string | undefined {
  const nonPooling = process.env.POSTGRES_URL_NON_POOLING?.trim();
  const pooling = process.env.POSTGRES_URL?.trim();
  return nonPooling || pooling || undefined;
}

let client: Sql | null | undefined;
let schemaReady = false;

export function michelleBackendConfigured(): boolean {
  return Boolean(connectionUrl());
}

export function getMichelleSql(): Sql | null {
  if (client !== undefined) return client;
  const url = connectionUrl();
  if (!url) {
    client = null;
    return null;
  }
  client = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: "require",
  });
  return client;
}

/** Test-only: drop the cached client so a newly injected URL can be used. */
export function resetMichelleSqlForTests(): void {
  client = undefined;
  schemaReady = false;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS michelle_runs (
  run_id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  trigger TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  row_task TEXT,
  source_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  next_action TEXT,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT 'michelle'
);
CREATE TABLE IF NOT EXISTS michelle_decisions (
  decision_id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  row_id TEXT NOT NULL,
  workstream TEXT NOT NULL,
  decision TEXT NOT NULL,
  owner TEXT NOT NULL,
  authority_source TEXT NOT NULL,
  evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  dissent TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL,
  impact TEXT NOT NULL,
  reversibility TEXT NOT NULL,
  founder_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  human_expert_required BOOLEAN NOT NULL DEFAULT FALSE,
  supersedes TEXT,
  status TEXT NOT NULL DEFAULT 'appended',
  controlled_test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS michelle_readiness (
  row_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  owner TEXT NOT NULL,
  evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_state TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL,
  updated_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS michelle_founder_actions (
  action_id TEXT PRIMARY KEY,
  row_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason_founder_required TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  dissent TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL,
  dependency TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS michelle_founder_actions_open_uniq
  ON michelle_founder_actions (row_id, action) WHERE status = 'open';
CREATE TABLE IF NOT EXISTS michelle_human_expert_actions (
  action_id TEXT PRIMARY KEY,
  row_id TEXT NOT NULL,
  expert_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS michelle_blockers (
  block_id TEXT PRIMARY KEY,
  row_id TEXT NOT NULL,
  blocking_executive TEXT NOT NULL,
  issue TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity TEXT NOT NULL,
  owner TEXT NOT NULL,
  required_correction TEXT NOT NULL,
  retest_requirement TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS michelle_dependencies (
  row_id TEXT PRIMARY KEY,
  blocked_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  parallel_with JSONB NOT NULL DEFAULT '[]'::jsonb,
  founder_dependency BOOLEAN NOT NULL DEFAULT FALSE,
  human_expert_dependency BOOLEAN NOT NULL DEFAULT FALSE,
  external_system_dependency TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS michelle_estimates (
  row_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS michelle_critical_path (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS michelle_work_queue (
  item_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  next_action TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS michelle_retry_state (
  key TEXT PRIMARY KEY,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS michelle_audit (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent TEXT NOT NULL,
  what TEXT NOT NULL,
  why TEXT NOT NULL,
  authority TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  previous_state JSONB,
  new_state JSONB
);
CREATE TABLE IF NOT EXISTS nia_runs (
  run_id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  trigger TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  row_task TEXT,
  source_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  next_action TEXT,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT 'nia'
);
CREATE TABLE IF NOT EXISTS nia_experience_evals (
  eval_id TEXT PRIMARY KEY,
  touchpoint TEXT NOT NULL,
  expected_experience TEXT NOT NULL,
  actual_experience TEXT NOT NULL,
  triple_e JSONB NOT NULL,
  accessibility_result TEXT NOT NULL DEFAULT '',
  clarity_result TEXT NOT NULL DEFAULT '',
  usability_result TEXT NOT NULL DEFAULT '',
  content_result TEXT NOT NULL DEFAULT '',
  functional_result TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  defects JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity TEXT NOT NULL,
  owner TEXT NOT NULL,
  correction_required TEXT NOT NULL DEFAULT '',
  retest_required BOOLEAN NOT NULL DEFAULT FALSE,
  release_impact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS nia_release_blocks (
  block_id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  row_release TEXT NOT NULL,
  touchpoint TEXT NOT NULL,
  approved_requirement TEXT NOT NULL,
  actual_experience TEXT NOT NULL,
  triple_e_failure JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity TEXT NOT NULL,
  impact TEXT NOT NULL,
  correction_required TEXT NOT NULL,
  owner TEXT NOT NULL,
  retest_required BOOLEAN NOT NULL DEFAULT TRUE,
  independent_retest_pass BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL,
  resolved_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS nia_findings (
  finding_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS nia_innovation (
  item_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  launch_requirement TEXT NOT NULL DEFAULT 'NO',
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS nia_retry_state (
  key TEXT PRIMARY KEY,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS nia_research_requests (
  research_id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  requesting_executive TEXT NOT NULL,
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  why_needed TEXT NOT NULL,
  freshness_requirement TEXT NOT NULL,
  source_priority JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_search_budget INTEGER NOT NULL,
  origin TEXT NOT NULL,
  status TEXT NOT NULL,
  result JSONB,
  usage JSONB
);
CREATE TABLE IF NOT EXISTS nia_research_sources (
  source_id TEXT PRIMARY KEY,
  research_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  publication_date TEXT,
  accessed_at TIMESTAMPTZ NOT NULL,
  source_type TEXT NOT NULL,
  primary_secondary TEXT NOT NULL,
  relevant_claim TEXT NOT NULL DEFAULT '',
  reliability TEXT NOT NULL DEFAULT '',
  payload JSONB
);
CREATE UNIQUE INDEX IF NOT EXISTS nia_research_sources_url_uniq ON nia_research_sources (canonical_url);
CREATE TABLE IF NOT EXISTS nia_competitive_intel (
  intelligence_id TEXT PRIMARY KEY,
  research_id TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  competitor_or_category TEXT NOT NULL,
  observation TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS nia_watchlist (
  entity_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS nia_trend_radar (
  trend_id TEXT PRIMARY KEY,
  trend TEXT NOT NULL,
  domain TEXT NOT NULL,
  payload JSONB NOT NULL,
  next_review_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS nia_opportunities (
  opportunity_id TEXT PRIMARY KEY,
  research_id TEXT NOT NULL,
  opportunity TEXT NOT NULL,
  classification TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
`;

export async function ensureMichelleSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  await sql.unsafe(AOS_SCHEMA_SQL);
  schemaReady = true;
}

export async function withAosTx<T>(fn: (sql: TransactionSql) => Promise<T>): Promise<T> {
  const sql = getMichelleSql();
  if (!sql) {
    throw new Error("aos_backend_unconfigured");
  }
  await ensureMichelleSchema(sql);
  const result = await sql.begin(async (tx) => fn(tx));
  return result as T;
}

export async function withMichelleTx<T>(fn: (sql: TransactionSql) => Promise<T>): Promise<T> {
  const sql = getMichelleSql();
  if (!sql) {
    throw new Error("michelle_backend_unconfigured");
  }
  await ensureMichelleSchema(sql);
  const result = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('michelle-northstar'))`;
    return fn(tx);
  });
  return result as T;
}

export async function withNiaTx<T>(fn: (sql: TransactionSql) => Promise<T>): Promise<T> {
  const sql = getMichelleSql();
  if (!sql) {
    throw new Error("michelle_backend_unconfigured");
  }
  await ensureMichelleSchema(sql);
  const result = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('nia-prism'))`;
    return fn(tx);
  });
  return result as T;
}

export function redactPersistError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return sanitizeDbError(message);
}
