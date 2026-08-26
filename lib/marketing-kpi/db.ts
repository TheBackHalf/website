import { existsSync, readFileSync } from "node:fs";
import type { Sql } from "postgres";
import {
  getMichelleSql,
  michelleBackendConfigured,
} from "@/lib/fab-5/michelle-db";

const POSTGRES_ENV_NAMES = [
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
] as const;

function normalizeSecret(value: string): string {
  let next = value.trim().replace(/^\uFEFF/, "");
  if (
    (next.startsWith('"') && next.endsWith('"')) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    next = next.slice(1, -1).trim();
  }
  return next;
}

/** Load Postgres URLs into process.env for CLI scripts. Never logs values. */
export function loadPostgresEnvFromLocalFile(): void {
  // Vercel injects POSTGRES_URL. Do not refill deleted/missing production env
  // from a workstation .env.local — that would hide an unconfigured deploy.
  if (
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    return;
  }
  // Relative path only. path.join(process.cwd(), ...) makes Turbopack NFT
  // the whole project and can stall Vercel "Deploying outputs".
  const filePath = ".env.local";
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!POSTGRES_ENV_NAMES.includes(key as (typeof POSTGRES_ENV_NAMES)[number])) {
      continue;
    }
    if (process.env[key]) continue;
    const value = normalizeSecret(line.slice(eq + 1));
    if (value.length > 0) process.env[key] = value;
  }
  if (!process.env.POSTGRES_URL?.trim()) {
    const fallback =
      process.env.POSTGRES_URL_NON_POOLING?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_PRISMA_URL?.trim();
    if (fallback) process.env.POSTGRES_URL = fallback;
  }
}

export function marketingKpiPostgresConfigured(): boolean {
  loadPostgresEnvFromLocalFile();
  return michelleBackendConfigured();
}

export function getMarketingKpiSql(): Sql | null {
  loadPostgresEnvFromLocalFile();
  return getMichelleSql();
}

export function isHostedMarketingKpiRuntime(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  );
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS marketing_kpi_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  date_et TEXT NOT NULL,
  attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  path TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_event_id TEXT,
  amount_cents INTEGER,
  currency TEXT,
  test BOOLEAN NOT NULL DEFAULT FALSE,
  period TEXT NOT NULL,
  classification TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS marketing_kpi_events_date_et_idx
  ON marketing_kpi_events (date_et);
CREATE INDEX IF NOT EXISTS marketing_kpi_events_period_idx
  ON marketing_kpi_events (period);

CREATE TABLE IF NOT EXISTS marketing_kpi_social_daily (
  id TEXT PRIMARY KEY,
  date_et TEXT NOT NULL,
  channel TEXT NOT NULL,
  reach INTEGER,
  impressions INTEGER,
  engagements INTEGER,
  followers INTEGER,
  follower_growth INTEGER,
  link_clicks INTEGER,
  entered_by TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL,
  source_system TEXT NOT NULL,
  verified_by TEXT,
  notes TEXT,
  UNIQUE (date_et, channel)
);

CREATE TABLE IF NOT EXISTS marketing_kpi_purchases (
  id TEXT PRIMARY KEY,
  billing_purchase_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_event_id TEXT,
  amount_cents INTEGER,
  currency TEXT,
  paid_at TIMESTAMPTZ NOT NULL,
  date_et TEXT NOT NULL,
  attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  test BOOLEAN NOT NULL DEFAULT FALSE,
  livemode BOOLEAN,
  period TEXT NOT NULL,
  classification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid'
);
CREATE UNIQUE INDEX IF NOT EXISTS marketing_kpi_purchases_session_uniq
  ON marketing_kpi_purchases (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS marketing_kpi_purchases_intent_uniq
  ON marketing_kpi_purchases (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL AND stripe_checkout_session_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS marketing_kpi_purchases_billing_uniq
  ON marketing_kpi_purchases (billing_purchase_id)
  WHERE billing_purchase_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketing_kpi_meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

let schemaReady = false;

export async function ensureMarketingKpiSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  schemaReady = true;
}

export function resetMarketingKpiSchemaFlagForTests(): void {
  schemaReady = false;
}
