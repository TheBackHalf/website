import {
  ensureLaunchDashboardSchema,
  getLaunchDashboardSql,
} from "@/lib/launch-dashboard/db";
import { SNAPSHOT_META_KEY } from "@/lib/monitoring/catalog";
import type { ProductionMonitoringSnapshot } from "@/lib/monitoring/types";

export async function saveMonitoringSnapshot(
  snapshot: ProductionMonitoringSnapshot,
): Promise<void> {
  const sql = getLaunchDashboardSql();
  if (!sql) {
    throw new Error("monitoring_postgres_unconfigured");
  }
  await ensureLaunchDashboardSchema(sql);
  await sql`
    INSERT INTO launch_dashboard_meta (key, value, updated_at)
    VALUES (${SNAPSHOT_META_KEY}, ${sql.json(snapshot)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export async function loadMonitoringSnapshot(): Promise<ProductionMonitoringSnapshot | null> {
  const sql = getLaunchDashboardSql();
  if (!sql) return null;
  await ensureLaunchDashboardSchema(sql);
  const rows = await sql<{ value: ProductionMonitoringSnapshot }[]>`
    SELECT value FROM launch_dashboard_meta WHERE key = ${SNAPSHOT_META_KEY} LIMIT 1
  `;
  return rows[0]?.value ?? null;
}

export async function writeDatabasePing(value: {
  at: string;
  nonce: string;
}): Promise<void> {
  const sql = getLaunchDashboardSql();
  if (!sql) throw new Error("monitoring_postgres_unconfigured");
  await ensureLaunchDashboardSchema(sql);
  await sql`
    INSERT INTO launch_dashboard_meta (key, value, updated_at)
    VALUES ('row61_db_ping', ${sql.json(value)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export async function readDatabasePing(): Promise<{ at?: string; nonce?: string } | null> {
  const sql = getLaunchDashboardSql();
  if (!sql) return null;
  await ensureLaunchDashboardSchema(sql);
  const rows = await sql<{ value: { at?: string; nonce?: string } }[]>`
    SELECT value FROM launch_dashboard_meta WHERE key = 'row61_db_ping' LIMIT 1
  `;
  return rows[0]?.value ?? null;
}

export async function deleteDatabasePing(): Promise<void> {
  const sql = getLaunchDashboardSql();
  if (!sql) return;
  await ensureLaunchDashboardSchema(sql);
  await sql`DELETE FROM launch_dashboard_meta WHERE key = 'row61_db_probe_test'`;
}

export async function writeAndDeleteProbeRow(nonce: string): Promise<boolean> {
  const sql = getLaunchDashboardSql();
  if (!sql) throw new Error("monitoring_postgres_unconfigured");
  await ensureLaunchDashboardSchema(sql);
  const payload = { nonce, at: new Date().toISOString() };
  await sql`
    INSERT INTO launch_dashboard_meta (key, value, updated_at)
    VALUES ('row61_db_probe_test', ${sql.json(payload)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  const rows = await sql<{ value: { nonce?: string } }[]>`
    SELECT value FROM launch_dashboard_meta WHERE key = 'row61_db_probe_test' LIMIT 1
  `;
  const matched = rows[0]?.value?.nonce === nonce;
  await sql`DELETE FROM launch_dashboard_meta WHERE key = 'row61_db_probe_test'`;
  return matched;
}

export async function resolveOpsErrorFingerprint(fingerprint: string): Promise<void> {
  const sql = getLaunchDashboardSql();
  if (!sql) return;
  await ensureLaunchDashboardSchema(sql);
  await sql`
    UPDATE launch_ops_errors
    SET status = 'resolved'
    WHERE fingerprint = ${fingerprint}
  `;
}
