import type postgres from "postgres";
import { SAFE_TABLE } from "@/lib/backup/catalog";

export type ProductionFingerprint = {
  capturedAt: string;
  database: string;
  walLevel: string;
  archiveMode: string;
  publicTableCount: number;
  counts: Record<string, number>;
  analytics: {
    count: number;
    distinctNames: number;
    nameCounts: Record<string, number>;
    minCreatedAt: string | null;
    maxCreatedAt: string | null;
  };
  authUsers: number;
  storageBuckets: number;
  storageObjects: number;
};

function assertTable(name: string): string {
  if (!SAFE_TABLE.test(name)) throw new Error("invalid_table");
  return name;
}

export async function captureProductionFingerprint(
  sql: postgres.Sql,
): Promise<ProductionFingerprint> {
  const ident = await sql<{ current_database: string }[]>`SELECT current_database()`;
  const wal = await sql<{ wal_level: string }[]>`SHOW wal_level`;
  const archive = await sql<{ archive_mode: string }[]>`SHOW archive_mode`;
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const counts: Record<string, number> = {};
  for (const row of tables) {
    const name = assertTable(row.table_name);
    const result = await sql.unsafe(`SELECT COUNT(*)::int AS n FROM public."${name}"`);
    counts[name] = Number(result[0]?.n ?? 0);
  }
  const analytics = await sql<
    { count: number; names: number; min: string | null; max: string | null }[]
  >`
    SELECT
      COUNT(*)::int AS count,
      COUNT(DISTINCT name)::int AS names,
      MIN(created_at)::text AS min,
      MAX(created_at)::text AS max
    FROM public.analytics_events
  `;
  const nameRows = await sql<{ name: string; n: number }[]>`
    SELECT name, COUNT(*)::int AS n
    FROM public.analytics_events
    GROUP BY name
    ORDER BY name
  `;
  const authUsers = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM auth.users`;
  const storageBuckets = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM storage.buckets
  `;
  const storageObjects = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM storage.objects
  `;
  return {
    capturedAt: new Date().toISOString(),
    database: ident[0]?.current_database ?? "postgres",
    walLevel: wal[0]?.wal_level ?? "unknown",
    archiveMode: archive[0]?.archive_mode ?? "unknown",
    publicTableCount: tables.length,
    counts,
    analytics: {
      count: analytics[0]?.count ?? 0,
      distinctNames: analytics[0]?.names ?? 0,
      nameCounts: Object.fromEntries(nameRows.map((row) => [row.name, row.n])),
      minCreatedAt: analytics[0]?.min ?? null,
      maxCreatedAt: analytics[0]?.max ?? null,
    },
    authUsers: authUsers[0]?.n ?? 0,
    storageBuckets: storageBuckets[0]?.n ?? 0,
    storageObjects: storageObjects[0]?.n ?? 0,
  };
}

export function fingerprintsMatch(
  before: ProductionFingerprint,
  after: ProductionFingerprint,
): boolean {
  if (before.publicTableCount !== after.publicTableCount) return false;
  if (before.analytics.count !== after.analytics.count) return false;
  if (before.analytics.maxCreatedAt !== after.analytics.maxCreatedAt) return false;
  const keys = new Set([...Object.keys(before.counts), ...Object.keys(after.counts)]);
  for (const key of keys) {
    if (before.counts[key] !== after.counts[key]) return false;
  }
  return true;
}
