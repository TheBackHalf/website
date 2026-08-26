import type { Sql } from "postgres";
import {
  getMarketingKpiSql,
  loadPostgresEnvFromLocalFile,
  marketingKpiPostgresConfigured,
} from "@/lib/marketing-kpi/db";
import { isHostedProduction } from "@/lib/analytics/db";

export { isHostedProduction };

export function emailCompliancePostgresConfigured(): boolean {
  loadPostgresEnvFromLocalFile();
  return marketingKpiPostgresConfigured();
}

export function getEmailComplianceSql(): Sql | null {
  loadPostgresEnvFromLocalFile();
  return getMarketingKpiSql();
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bh_email_suppression (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  source TEXT NOT NULL,
  suppressed_at TIMESTAMPTZ NOT NULL,
  detail TEXT,
  test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS bh_email_suppression_test_idx ON bh_email_suppression (test);

CREATE TABLE IF NOT EXISTS bh_email_consent (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  source_detail TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  method TEXT NOT NULL,
  test BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS bh_email_consent_email_idx ON bh_email_consent (email);
CREATE INDEX IF NOT EXISTS bh_email_consent_test_idx ON bh_email_consent (test);
`;

let schemaReady = false;

export async function ensureEmailComplianceSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  schemaReady = true;
}

export function resetEmailComplianceSchemaFlagForTests(): void {
  schemaReady = false;
}

export class EmailCompliancePersistenceError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "EmailCompliancePersistenceError";
    this.code = code;
  }
}
