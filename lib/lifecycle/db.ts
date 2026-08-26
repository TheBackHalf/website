import type { Sql } from "postgres";
import {
  getMarketingKpiSql,
  loadPostgresEnvFromLocalFile,
  marketingKpiPostgresConfigured,
} from "@/lib/marketing-kpi/db";

export function lifecyclePostgresConfigured(): boolean {
  loadPostgresEnvFromLocalFile();
  return marketingKpiPostgresConfigured();
}

export function getLifecycleSql(): Sql | null {
  return getMarketingKpiSql();
}

export function isHostedProduction(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS lifecycle_dispatches (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL,
  family TEXT NOT NULL,
  user_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  channel TEXT NOT NULL,
  locale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  detail TEXT,
  payload JSONB,
  test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS lifecycle_dispatches_user_idx ON lifecycle_dispatches (user_id);
CREATE INDEX IF NOT EXISTS lifecycle_dispatches_automation_idx ON lifecycle_dispatches (automation_id);
CREATE INDEX IF NOT EXISTS lifecycle_dispatches_created_idx ON lifecycle_dispatches (created_at);
`;

let schemaReady = false;

export async function ensureLifecycleSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  schemaReady = true;
}

export function resetLifecycleSchemaFlagForTests(): void {
  schemaReady = false;
}

export class LifecyclePersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LifecyclePersistenceError";
  }
}
