import {
  ensureMarketingKpiSchema,
  getMarketingKpiSql,
  isHostedMarketingKpiRuntime,
  marketingKpiPostgresConfigured,
} from "@/lib/marketing-kpi/db";
import { getMarketingKpiDurability } from "@/lib/marketing-kpi/store";

const REQUIRED_TABLES = [
  "marketing_kpi_events",
  "marketing_kpi_social_daily",
  "marketing_kpi_purchases",
  "marketing_kpi_meta",
] as const;

const KEY_PATTERN = /^row84-durability-[a-z0-9-]{4,80}$/i;
const MARKER = "ROW84_DURABILITY_TEST";

export type KpiDurabilityAction = "write" | "retrieve" | "cleanup";

function metaKey(id: string): string {
  return `durability:${id}`;
}

function publicDurability(extra: Record<string, unknown> = {}): Record<string, unknown> {
  const durability = getMarketingKpiDurability();
  return {
    backend: durability.backend,
    dataDirIsSourceOfTruth: durability.dataDirIsSourceOfTruth,
    hosted: isHostedMarketingKpiRuntime(),
    ...extra,
  };
}

async function tablePresence(): Promise<Record<(typeof REQUIRED_TABLES)[number], boolean>> {
  const sql = getMarketingKpiSql();
  const empty = {
    marketing_kpi_events: false,
    marketing_kpi_social_daily: false,
    marketing_kpi_purchases: false,
    marketing_kpi_meta: false,
  };
  if (!sql) return empty;
  await ensureMarketingKpiSchema(sql);
  const rows = await sql<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'marketing_kpi_events',
        'marketing_kpi_social_daily',
        'marketing_kpi_purchases',
        'marketing_kpi_meta'
      )
  `;
  const present = new Set(rows.map((row) => row.tablename));
  return {
    marketing_kpi_events: present.has("marketing_kpi_events"),
    marketing_kpi_social_daily: present.has("marketing_kpi_social_daily"),
    marketing_kpi_purchases: present.has("marketing_kpi_purchases"),
    marketing_kpi_meta: present.has("marketing_kpi_meta"),
  };
}

async function launchIsolationSnapshot(): Promise<{
  historicalPurchases: number;
  launchPurchases: number;
  launchRevenueCents: number;
}> {
  const sql = getMarketingKpiSql();
  if (!sql) {
    return { historicalPurchases: 0, launchPurchases: 0, launchRevenueCents: 0 };
  }
  await ensureMarketingKpiSchema(sql);
  const historical = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM marketing_kpi_purchases
    WHERE status = 'paid'
      AND (classification = 'historical' OR period = 'pre_launch_historical')
  `;
  const launch = await sql<{ count: string; revenue: string }[]>`
    SELECT COUNT(*)::text AS count, COALESCE(SUM(amount_cents), 0)::text AS revenue
    FROM marketing_kpi_purchases
    WHERE status = 'paid'
      AND period = 'launch_campaign'
      AND test = FALSE
      AND classification <> 'test'
  `;
  return {
    historicalPurchases: Number(historical[0]?.count ?? 0),
    launchPurchases: Number(launch[0]?.count ?? 0),
    launchRevenueCents: Number(launch[0]?.revenue ?? 0),
  };
}

export async function runKpiDurability(input: {
  action: KpiDurabilityAction;
  key: string;
}): Promise<Record<string, unknown>> {
  const key = input.key.trim();
  if (!KEY_PATTERN.test(key)) {
    return { ok: false, error: "invalid_durability_key" };
  }

  if (!marketingKpiPostgresConfigured() || !getMarketingKpiSql()) {
    return publicDurability({
      ok: false,
      error: "postgres_unconfigured",
      action: input.action,
    });
  }

  const sql = getMarketingKpiSql();
  if (!sql) {
    return publicDurability({
      ok: false,
      error: "postgres_unconfigured",
      action: input.action,
    });
  }

  await ensureMarketingKpiSchema(sql);
  const tables = await tablePresence();
  const storageKey = metaKey(key);

  if (input.action === "write") {
    const value = {
      test: true,
      classification: "test",
      excludeFromLaunchKpi: true,
      marker: MARKER,
      id: key,
      writtenAt: new Date().toISOString(),
    };
    await sql`
      INSERT INTO marketing_kpi_meta (key, value, updated_at)
      VALUES (${storageKey}, ${sql.json(value)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
    return publicDurability({
      ok: true,
      action: "write",
      id: key,
      stored: true,
      tables,
    });
  }

  if (input.action === "retrieve") {
    const rows = await sql<{ key: string; value: { id?: string; marker?: string; test?: boolean } }[]>`
      SELECT key, value FROM marketing_kpi_meta WHERE key = ${storageKey} LIMIT 1
    `;
    const row = rows[0];
    const idMatch = row?.value?.id === key;
    const found = Boolean(row) && idMatch && row?.value?.marker === MARKER && row?.value?.test === true;
    const snapshot = await launchIsolationSnapshot();
    return publicDurability({
      ok: found,
      action: "retrieve",
      id: key,
      found,
      idMatch,
      storedValueMatches: found,
      tables,
      historicalPurchases: snapshot.historicalPurchases,
      launchPurchases: snapshot.launchPurchases,
      launchRevenueCents: snapshot.launchRevenueCents,
    });
  }

  const deleted = await sql<{ key: string }[]>`
    DELETE FROM marketing_kpi_meta
    WHERE key = ${storageKey}
      AND value->>'test' = 'true'
      AND value->>'marker' = ${MARKER}
    RETURNING key
  `;
  const remaining = await sql<{ key: string }[]>`
    SELECT key FROM marketing_kpi_meta WHERE key = ${storageKey} LIMIT 1
  `;
  return publicDurability({
    ok: deleted.length > 0 && remaining.length === 0,
    action: "cleanup",
    id: key,
    deleted: deleted.length > 0,
    remaining: remaining.length > 0,
    tables,
  });
}
