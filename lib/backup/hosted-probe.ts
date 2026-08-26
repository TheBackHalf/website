/**
 * Hosted backup/WAL probe. Read-only against production Postgres.
 * Isolated restore destination is in-memory PGlite — never production.
 * Never logs connection strings or secrets.
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getAnalyticsSql, isHostedProduction } from "@/lib/analytics/db";
import { CRITICAL_PUBLIC_TABLES } from "@/lib/backup/catalog";
import { exportPublicSchema, restoreDumpToPglite } from "@/lib/backup/restore-test";
import { ensureDurableSchema } from "@/lib/durable/schema";
import { ensureAuthSchema } from "@/lib/auth/store/db";

const WAL_SETTING_NAMES = [
  "wal_level",
  "archive_mode",
  "archive_timeout",
  "max_wal_senders",
  "wal_keep_size",
  "hot_standby",
] as const;

function redactSetting(name: string, value: string): string {
  if (/command|connstr|password|secret|key/i.test(name) || /postgres:\/\//i.test(value)) {
    return value ? "[redacted]" : "";
  }
  return value.slice(0, 80);
}

export type HostedBackupProbeResult = {
  ok: boolean;
  hosted: boolean;
  postgresConfigured: boolean;
  productionWritten: false;
  secretsPrinted: false;
  wal: {
    readable: boolean;
    settings: Record<string, string>;
    error?: string;
  };
  schema: {
    tables: string[];
    criticalPresent: string[];
    criticalMissing: string[];
    durableTablesPresent: string[];
  };
  isolatedRestore: {
    attempted: boolean;
    ok: boolean;
    destination: "isolated_pglite_in_memory";
    tablesRestored?: number;
    missingCriticalTables?: string[];
    error?: string;
  };
};

export async function runHostedBackupProbe(): Promise<HostedBackupProbeResult> {
  const sql = getAnalyticsSql();
  const postgresConfigured = Boolean(sql);
  const result: HostedBackupProbeResult = {
    ok: false,
    hosted: isHostedProduction(),
    postgresConfigured,
    productionWritten: false,
    secretsPrinted: false,
    wal: { readable: false, settings: {} },
    schema: {
      tables: [],
      criticalPresent: [],
      criticalMissing: [...CRITICAL_PUBLIC_TABLES],
      durableTablesPresent: [],
    },
    isolatedRestore: {
      attempted: false,
      ok: false,
      destination: "isolated_pglite_in_memory",
    },
  };

  if (!sql) {
    result.isolatedRestore.error = "postgres_unconfigured";
    return result;
  }

  try {
    await ensureAuthSchema(sql);
    await ensureDurableSchema(sql);
  } catch {
    // Schema ensure is idempotent DDL; failure is reported via table list.
  }

  try {
    const rows = await sql<{ name: string; setting: string }[]>`
      SELECT name, setting
      FROM pg_settings
      WHERE name IN (
        'wal_level', 'archive_mode', 'archive_timeout',
        'max_wal_senders', 'wal_keep_size', 'hot_standby'
      )
    `;
    for (const row of rows) {
      result.wal.settings[row.name] = redactSetting(row.name, row.setting);
    }
    result.wal.readable = Object.keys(result.wal.settings).length > 0;
  } catch (error) {
    result.wal.error = error instanceof Error ? error.message.slice(0, 120) : "wal_unreadable";
  }

  try {
    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    result.schema.tables = tables.map((row) => row.table_name);
    result.schema.criticalPresent = CRITICAL_PUBLIC_TABLES.filter((name) =>
      result.schema.tables.includes(name),
    );
    result.schema.criticalMissing = CRITICAL_PUBLIC_TABLES.filter(
      (name) => !result.schema.tables.includes(name),
    );
    result.schema.durableTablesPresent = result.schema.tables.filter((name) =>
      name.startsWith("bh_"),
    );
  } catch (error) {
    result.isolatedRestore.error =
      error instanceof Error ? error.message.slice(0, 120) : "schema_unreadable";
    return result;
  }

  const dumpDir = path.join(tmpdir(), `bh-backup-probe-${process.pid}`);
  try {
    result.isolatedRestore.attempted = true;
    const dump = await exportPublicSchema(sql);
    await mkdir(dumpDir, { recursive: true });
    const dumpPath = path.join(dumpDir, "public-schema.dump.json");
    await writeFile(dumpPath, JSON.stringify(dump), "utf8");
    const restored = await restoreDumpToPglite(dumpPath);
    const present = Object.keys(restored.restoredCounts);
    const missing = CRITICAL_PUBLIC_TABLES.filter((name) => !present.includes(name));
    await restored.close();
    result.isolatedRestore.ok = missing.length === 0;
    result.isolatedRestore.tablesRestored = present.length;
    result.isolatedRestore.missingCriticalTables = [...missing];
  } catch (error) {
    result.isolatedRestore.error =
      error instanceof Error ? error.message.slice(0, 160) : "isolated_restore_failed";
  } finally {
    await rm(dumpDir, { recursive: true, force: true }).catch(() => undefined);
  }

  result.ok =
    result.wal.readable &&
    result.schema.criticalMissing.length === 0 &&
    result.isolatedRestore.ok;
  return result;
}
