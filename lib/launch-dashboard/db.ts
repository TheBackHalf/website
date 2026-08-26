import type { Sql } from "postgres";
import {
  getMarketingKpiSql,
  loadPostgresEnvFromLocalFile,
  marketingKpiPostgresConfigured,
} from "@/lib/marketing-kpi/db";
import { isHostedProduction } from "@/lib/analytics/db";

export { isHostedProduction };

export function launchDashboardPostgresConfigured(): boolean {
  loadPostgresEnvFromLocalFile();
  return marketingKpiPostgresConfigured();
}

export function getLaunchDashboardSql(): Sql | null {
  return getMarketingKpiSql();
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS launch_dashboard_risks (
  id TEXT PRIMARY KEY,
  date_identified_et TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  mitigation TEXT NOT NULL,
  founder_escalation_required BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_date_et TEXT,
  test BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS launch_dashboard_availability (
  area TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  updated_by TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
);
CREATE TABLE IF NOT EXISTS launch_dashboard_snapshots (
  date_et TEXT PRIMARY KEY,
  frozen BOOLEAN NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  model JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS launch_ops_errors (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  first_seen TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  product_area TEXT NOT NULL,
  error_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  route TEXT,
  service TEXT,
  safe_code TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS launch_ops_errors_status_idx ON launch_ops_errors (status);
CREATE INDEX IF NOT EXISTS launch_ops_errors_last_seen_idx ON launch_ops_errors (last_seen);
CREATE TABLE IF NOT EXISTS launch_dashboard_support (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  test BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS support_tickets_test_idx ON support_tickets (test);
CREATE TABLE IF NOT EXISTS launch_dashboard_meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
`

let schemaReady = false;

export async function ensureLaunchDashboardSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  schemaReady = true;
}

export function resetLaunchDashboardSchemaFlagForTests(): void {
  schemaReady = false;
}

export class LaunchDashboardPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaunchDashboardPersistenceError";
  }
}
