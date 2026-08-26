import type { Sql } from "postgres";
import { requireDurableSql } from "@/lib/durable/db";

export const DURABLE_PUBLIC_TABLES = [
  "bh_durable_documents",
  "bh_lumina_conversations",
  "bh_lumina_memories",
  "bh_rate_limits",
  "bh_billing_stripe_events",
  "bh_billing_entitlements",
  "bh_billing_purchases",
  "bh_billing_account_access",
  "bh_billing_notifications",
] as const;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bh_durable_documents (
  collection TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (collection, doc_id)
);
CREATE INDEX IF NOT EXISTS bh_durable_documents_collection_idx
  ON bh_durable_documents (collection);

CREATE TABLE IF NOT EXISTS bh_lumina_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS bh_lumina_conversations_user_uidx
  ON bh_lumina_conversations (user_id);

CREATE TABLE IF NOT EXISTS bh_lumina_memories (
  user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bh_rate_limits (
  bucket TEXT NOT NULL,
  rate_key TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  PRIMARY KEY (bucket, rate_key)
);

CREATE TABLE IF NOT EXISTS bh_billing_stripe_events (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bh_billing_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS bh_billing_entitlements_user_idx
  ON bh_billing_entitlements (user_id);

CREATE TABLE IF NOT EXISTS bh_billing_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS bh_billing_purchases_user_idx
  ON bh_billing_purchases (user_id);

CREATE TABLE IF NOT EXISTS bh_billing_account_access (
  user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bh_billing_notifications (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
`;

let schemaReady = false;

export async function ensureDurableSchema(sql?: Sql): Promise<Sql> {
  const client = sql ?? requireDurableSql();
  if (!schemaReady) {
    await client.unsafe(SCHEMA_SQL);
    schemaReady = true;
  }
  return client;
}

export function resetDurableSchemaFlagForTests(): void {
  schemaReady = false;
}
