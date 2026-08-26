import type { Sql } from "postgres";
import {
  getLaunchDashboardSql,
  isHostedProduction,
  launchDashboardPostgresConfigured,
} from "@/lib/launch-dashboard/db";

export { isHostedProduction };

export function emailPostgresConfigured(): boolean {
  return launchDashboardPostgresConfigured();
}

export function getEmailSql(): Sql | null {
  return getLaunchDashboardSql();
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bh_email_suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS bh_email_suppressions_reason_idx ON bh_email_suppressions (reason);

CREATE TABLE IF NOT EXISTS bh_email_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL,
  message_id TEXT,
  error TEXT,
  test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS bh_email_events_created_idx ON bh_email_events (created_at);
CREATE INDEX IF NOT EXISTS bh_email_events_email_idx ON bh_email_events (email);
CREATE INDEX IF NOT EXISTS bh_email_events_type_idx ON bh_email_events (type);
`;

let schemaReady = false;

export async function ensureEmailSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  schemaReady = true;
}

export function resetEmailSchemaFlagForTests(): void {
  schemaReady = false;
}

export class EmailPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailPersistenceError";
  }
}
