import { mkdir, writeFile, readFile, rm, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type postgres from "postgres";
import {
  CRITICAL_PUBLIC_TABLES,
  DUMP_FILE,
  RECOVERY_DIR,
  SAFE_TABLE,
} from "@/lib/backup/catalog";
import type { ColumnDump, IsolatedRestoreResult, TableDump } from "@/lib/backup/types";

function assertTable(name: string): string {
  if (!SAFE_TABLE.test(name)) throw new Error("invalid_table");
  return name;
}

function pgType(udt: string): string {
  switch (udt) {
    case "bool":
      return "BOOLEAN";
    case "int4":
      return "INTEGER";
    case "int8":
      return "BIGINT";
    case "jsonb":
      return "JSONB";
    case "timestamptz":
      return "TIMESTAMPTZ";
    case "text":
      return "TEXT";
    default:
      return "TEXT";
  }
}

function serializeCell(udt: string, value: unknown): unknown {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (udt === "jsonb") return JSON.stringify(value);
  if (typeof value === "bigint") return value.toString();
  return value;
}

async function loadPglite(): Promise<{
  PGlite: new () => {
    exec: (sql: string) => Promise<unknown>;
    query: (
      sql: string,
      params?: unknown[],
    ) => Promise<{ rows: Array<Record<string, unknown>> }>;
    close?: () => Promise<void>;
  };
}> {
  const candidate = path.resolve(
    process.cwd(),
    RECOVERY_DIR,
    "node_modules/@electric-sql/pglite/dist/index.js",
  );
  if (existsSync(candidate)) {
    return (await import(pathToFileURL(candidate).href)) as never;
  }
  throw new Error("pglite_not_installed");
}

export async function exportPublicSchema(sql: postgres.Sql): Promise<{
  generatedAt: string;
  tables: Array<TableDump & { rows: unknown[][] }>;
}> {
  const tableRows = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const pkRows = await sql<{ table_name: string; column_name: string }[]>`
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
  `;
  const pk = new Set(pkRows.map((row) => `${row.table_name}.${row.column_name}`));
  const tables: Array<TableDump & { rows: unknown[][] }> = [];
  for (const table of tableRows) {
    const name = assertTable(table.table_name);
    const cols = await sql<{ column_name: string; udt_name: string; is_nullable: string }[]>`
      SELECT column_name, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${name}
      ORDER BY ordinal_position
    `;
    const columns: ColumnDump[] = cols.map((col) => ({
      name: assertTable(col.column_name),
      udt: col.udt_name,
      nullable: col.is_nullable === "YES",
      primaryKey: pk.has(`${name}.${col.column_name}`),
    }));
    const quoted = columns.map((col) => `"${col.name}"`).join(", ");
    const data = (await sql.unsafe(`SELECT ${quoted} FROM public."${name}"`)) as Array<
      Record<string, unknown>
    >;
    tables.push({
      name,
      columns,
      rowCount: data.length,
      rows: data.map((row) => columns.map((col) => serializeCell(col.udt, row[col.name]))),
    });
  }
  return { generatedAt: new Date().toISOString(), tables };
}

export async function writeDumpFile(dump: {
  generatedAt: string;
  tables: Array<TableDump & { rows: unknown[][] }>;
}): Promise<string> {
  await mkdir(RECOVERY_DIR, { recursive: true });
  const full = path.resolve(DUMP_FILE);
  await writeFile(full, JSON.stringify(dump), { encoding: "utf8", flag: "w" });
  try {
    await chmod(full, 0o600);
  } catch {
    // Windows may ignore chmod; file remains gitignored.
  }
  return full;
}

export async function restoreDumpToPglite(dumpPath: string): Promise<{
  restoredCounts: Record<string, number>;
  analyticsNameCounts: Record<string, number>;
  close: () => Promise<void>;
}> {
  const raw = JSON.parse(await readFile(dumpPath, "utf8")) as {
    tables: Array<TableDump & { rows: unknown[][] }>;
  };
  const { PGlite } = await loadPglite();
  const db = new PGlite();
  const restoredCounts: Record<string, number> = {};
  for (const table of raw.tables) {
    const name = assertTable(table.name);
    const pkCols = table.columns
      .filter((col) => col.primaryKey)
      .map((col) => `"${assertTable(col.name)}"`);
    const colSql = [
      ...table.columns.map((col) => {
        const type = pgType(col.udt);
        const nullSql = col.nullable || col.primaryKey ? "" : " NOT NULL";
        return `"${assertTable(col.name)}" ${type}${nullSql}`;
      }),
      pkCols.length ? `PRIMARY KEY (${pkCols.join(", ")})` : "",
    ]
      .filter(Boolean)
      .join(", ");
    await db.exec(`CREATE TABLE "${name}" (${colSql});`);
    if (table.rows.length === 0) {
      restoredCounts[name] = 0;
      continue;
    }
    const colNames = table.columns.map((col) => `"${assertTable(col.name)}"`).join(", ");
    const placeholders = table.columns.map((_, index) => `$${index + 1}`).join(", ");
    for (const row of table.rows) {
      await db.query(`INSERT INTO "${name}" (${colNames}) VALUES (${placeholders})`, row);
    }
    restoredCounts[name] = table.rows.length;
  }
  const names = await db.query(`SELECT name, COUNT(*)::int AS n FROM analytics_events GROUP BY name`);
  const analyticsNameCounts = Object.fromEntries(
    names.rows.map((row) => [String(row.name), Number(row.n)]),
  );
  return {
    restoredCounts,
    analyticsNameCounts,
    close: async () => {
      if (db.close) await db.close();
    },
  };
}

export async function runIsolatedRestore(sql: postgres.Sql): Promise<IsolatedRestoreResult> {
  const started = Date.now();
  let dumpPath = "";
  try {
    const dump = await exportPublicSchema(sql);
    dumpPath = await writeDumpFile(dump);
    const dumpDuration = Date.now() - started;
    const restoreStarted = Date.now();
    const restored = await restoreDumpToPglite(dumpPath);
    const restoreDurationMs = Date.now() - restoreStarted;
    const validationStarted = Date.now();
    const present = Object.keys(restored.restoredCounts);
    const missingCriticalTables = CRITICAL_PUBLIC_TABLES.filter(
      (name) => !present.includes(name),
    );
    const analyticsPresent = present.includes("analytics_events");
    const countsMatch = dump.tables.every(
      (table) => restored.restoredCounts[table.name] === table.rowCount,
    );
    await restored.close();
    const validationDurationMs = Date.now() - validationStarted;
    await rm(dumpPath, { force: true });
    const dumpRemoved = !existsSync(dumpPath);
    const schemaValid = missingCriticalTables.length === 0 && analyticsPresent && countsMatch;
    return {
      ok: schemaValid && dumpRemoved,
      method: "logical_export_pglite_restore",
      source: "production_supabase_postgres_public_schema",
      destination: "isolated_pglite_in_memory",
      recoveryPoint: dump.generatedAt,
      dumpPathUsed: true,
      dumpRemoved,
      restoreDurationMs: dumpDuration + restoreDurationMs,
      validationDurationMs,
      tablesRestored: present.length,
      restoredCounts: restored.restoredCounts,
      analyticsPresent,
      analyticsCount: restored.restoredCounts.analytics_events ?? 0,
      analyticsNameCounts: restored.analyticsNameCounts,
      schemaValid,
      criticalTablesPresent: CRITICAL_PUBLIC_TABLES.filter((name) => present.includes(name)),
      missingCriticalTables: [...missingCriticalTables],
      integrity: schemaValid ? "PASS" : "FAIL",
    };
  } catch (error) {
    if (dumpPath) await rm(dumpPath, { force: true }).catch(() => undefined);
    const message = error instanceof Error ? error.message : "restore_failed";
    return {
      ok: false,
      method: "logical_export_pglite_restore",
      source: "production_supabase_postgres_public_schema",
      destination: "isolated_pglite_in_memory",
      recoveryPoint: new Date().toISOString(),
      dumpPathUsed: Boolean(dumpPath),
      dumpRemoved: dumpPath ? !existsSync(dumpPath) : true,
      restoreDurationMs: Date.now() - started,
      validationDurationMs: 0,
      tablesRestored: 0,
      restoredCounts: {},
      analyticsPresent: false,
      analyticsCount: 0,
      analyticsNameCounts: {},
      schemaValid: false,
      criticalTablesPresent: [],
      missingCriticalTables: [...CRITICAL_PUBLIC_TABLES],
      integrity: "FAIL",
      error: message.slice(0, 180).replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@"),
    };
  }
}
