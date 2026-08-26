import type { Sql } from "postgres";
import {
  getMarketingKpiSql,
  loadPostgresEnvFromLocalFile,
  marketingKpiPostgresConfigured,
} from "@/lib/marketing-kpi/db";

export function analyticsPostgresConfigured(): boolean {
  loadPostgresEnvFromLocalFile();
  return marketingKpiPostgresConfigured();
}

export function getAnalyticsSql(): Sql | null {
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
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  user_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload JSONB,
  test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events (name);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx ON analytics_events (user_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS analytics_events_test_idx ON analytics_events (test);
`;

let schemaReady = false;

export async function ensureAnalyticsSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  schemaReady = true;
}

export function resetAnalyticsSchemaFlagForTests(): void {
  schemaReady = false;
}

export class AnalyticsPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsPersistenceError";
  }
}
