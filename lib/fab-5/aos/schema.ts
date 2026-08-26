/** Permanent Agent Operating System tables on the existing production Postgres. */

export const AOS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS aos_work_items (
  work_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  owner_agent TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  blocked_reason TEXT,
  dependency_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_work_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  lease_token TEXT,
  lease_expires_at TIMESTAMPTZ,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  founder_gate_required BOOLEAN NOT NULL DEFAULT FALSE,
  founder_decision_id TEXT,
  next_action TEXT,
  error_state TEXT,
  checkpoint JSONB,
  resource_key TEXT,
  action_class TEXT NOT NULL DEFAULT 'A',
  runtime_class TEXT NOT NULL DEFAULT 'hosted',
  controlled_test BOOLEAN NOT NULL DEFAULT FALSE,
  synthetic BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS aos_work_items_owner_status_idx
  ON aos_work_items (owner_agent, status, priority, created_at);
CREATE INDEX IF NOT EXISTS aos_work_items_parent_idx ON aos_work_items (parent_work_id);
CREATE TABLE IF NOT EXISTS aos_resource_locks (
  resource_key TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  owner_agent TEXT NOT NULL,
  lease_expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS aos_heartbeats (
  agent TEXT PRIMARY KEY,
  last_heartbeat TIMESTAMPTZ NOT NULL,
  current_work_id TEXT,
  queue_depth INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_completion_at TIMESTAMPTZ,
  last_checkpoint JSONB,
  runtime_error TEXT
);
CREATE TABLE IF NOT EXISTS aos_founder_decisions (
  decision_id TEXT PRIMARY KEY,
  requesting_agent TEXT NOT NULL,
  work_id TEXT NOT NULL,
  decision_required TEXT NOT NULL,
  agent_recommendation TEXT NOT NULL,
  reason TEXT NOT NULL,
  risk_if_delayed TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  allowed_response TEXT NOT NULL DEFAULT 'APPROVE | REJECT | REVIEW',
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  founder_response TEXT,
  execution_resumed_at TIMESTAMPTZ,
  severity TEXT NOT NULL DEFAULT 'normal',
  controlled_test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS aos_notifications (
  notification_id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  severity TEXT NOT NULL,
  destination_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS aos_audit (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent TEXT NOT NULL,
  action TEXT NOT NULL,
  work_id TEXT,
  result TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS aos_audit_work_idx ON aos_audit (work_id, at);
CREATE TABLE IF NOT EXISTS aos_cost_events (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent TEXT NOT NULL,
  work_id TEXT,
  kind TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS aos_engineering_jobs (
  job_id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  source_reference TEXT NOT NULL DEFAULT '',
  owner_agent TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'cursor_cloud_agent',
  provider_agent_id TEXT,
  provider_run_id TEXT,
  repository TEXT NOT NULL,
  branch TEXT,
  pr_url TEXT,
  commit_sha TEXT,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL,
  heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  files_changed JSONB NOT NULL DEFAULT '[]'::jsonb,
  commands JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  founder_decision_required BOOLEAN NOT NULL DEFAULT FALSE,
  controlled_test BOOLEAN NOT NULL DEFAULT FALSE,
  synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS aos_engineering_jobs_work_idx ON aos_engineering_jobs (work_id);
CREATE INDEX IF NOT EXISTS aos_engineering_jobs_status_idx ON aos_engineering_jobs (status);
`;
