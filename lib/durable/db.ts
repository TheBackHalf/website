import type { Sql } from "postgres";
import {
  analyticsPostgresConfigured,
  getAnalyticsSql,
  isHostedProduction,
} from "@/lib/analytics/db";

export { isHostedProduction };

export class DurablePersistenceError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "DurablePersistenceError";
    this.code = code;
  }
}

export function durablePostgresConfigured(): boolean {
  return analyticsPostgresConfigured();
}

export function getDurableSql(): Sql | null {
  return getAnalyticsSql();
}

export function requireDurableSql(): Sql {
  const sql = getDurableSql();
  if (!sql) {
    throw new DurablePersistenceError("durable_postgres_unconfigured");
  }
  return sql;
}

export type DurableBackend =
  | "supabase_postgres"
  | "file_local_development"
  | "unconfigured_production";

export function resolveDurableBackend(): DurableBackend {
  if (durablePostgresConfigured()) return "supabase_postgres";
  if (isHostedProduction()) return "unconfigured_production";
  return "file_local_development";
}
