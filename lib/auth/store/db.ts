import type { Sql } from "postgres";
import {
  analyticsPostgresConfigured,
  getAnalyticsSql,
  isHostedProduction,
} from "@/lib/analytics/db";

export { isHostedProduction };

export class AuthPersistenceError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "AuthPersistenceError";
    this.code = code;
  }
}

export function authPostgresConfigured(): boolean {
  return analyticsPostgresConfigured();
}

export function getAuthSql(): Sql | null {
  return getAnalyticsSql();
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bh_auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT,
  auth_provider TEXT NOT NULL,
  google_id TEXT UNIQUE,
  arc_code TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  locale TEXT NOT NULL,
  role TEXT NOT NULL,
  pronunciation TEXT,
  support_preference TEXT,
  time_zone TEXT,
  age_eligible BOOLEAN,
  age_eligible_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS bh_auth_users_created_idx ON bh_auth_users (created_at);

CREATE TABLE IF NOT EXISTS bh_auth_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES bh_auth_users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  document_version TEXT,
  document_effective_date TEXT,
  publication_status TEXT,
  consented_at TIMESTAMPTZ NOT NULL,
  session_id TEXT,
  locale TEXT
);
CREATE INDEX IF NOT EXISTS bh_auth_consents_user_idx ON bh_auth_consents (user_id);

CREATE TABLE IF NOT EXISTS bh_auth_verification_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES bh_auth_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS bh_auth_verification_tokens_user_idx
  ON bh_auth_verification_tokens (user_id);

CREATE TABLE IF NOT EXISTS bh_auth_password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES bh_auth_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS bh_auth_password_reset_tokens_user_idx
  ON bh_auth_password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS bh_auth_resend_timestamps (
  email TEXT PRIMARY KEY,
  last_resend_at TIMESTAMPTZ NOT NULL
);
`;

let schemaReady = false;

export async function ensureAuthSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  schemaReady = true;
}

export function resetAuthSchemaFlagForTests(): void {
  schemaReady = false;
}

function errorField(error: unknown, key: string): string {
  if (!error || typeof error !== "object" || !(key in error)) {
    return "";
  }
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function isDuplicateEmailConstraint(error: unknown): boolean {
  if (error instanceof Error && error.message === "DUPLICATE_EMAIL") {
    return true;
  }
  if (errorField(error, "code") !== "23505") {
    return false;
  }
  const constraint = `${errorField(error, "constraint")}${errorField(error, "constraint_name")}${errorField(error, "detail")}`;
  return /email/i.test(constraint);
}

export function isFilesystemPersistError(error: unknown): boolean {
  const code = errorField(error, "code");
  return (
    code === "EROFS" ||
    code === "EACCES" ||
    code === "EPERM" ||
    code === "ENOSPC" ||
    code === "EROFS"
  );
}
