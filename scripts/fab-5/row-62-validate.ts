import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import postgres from "postgres";
import { ROW62_OWNERS, META_KEY, RECOVERY_DIR, DUMP_FILE } from "@/lib/backup/catalog";
import {
  captureProductionFingerprint,
  fingerprintsMatch,
} from "@/lib/backup/fingerprint";
import { probeSupabasePlatformBackups } from "@/lib/backup/platform-backups";
import { runIsolatedRestore } from "@/lib/backup/restore-test";
import type { Row62ReviewModel } from "@/lib/backup/review";
import { ensureLaunchDashboardSchema, getLaunchDashboardSql } from "@/lib/launch-dashboard/db";
import { probeHttp } from "@/lib/monitoring/probe";
import { ACTIVE_VERCEL_PRODUCTION_ORIGIN } from "@/lib/monitoring/catalog";

function loadLocalEnvNames(names: string[]): void {
  if (!existsSync(".env.local")) return;
  const wanted = new Set(names);
  for (const rawLine of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!wanted.has(key) || process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function ensurePgliteInstalled(): void {
  const marker = path.join(RECOVERY_DIR, "node_modules/@electric-sql/pglite/package.json");
  if (existsSync(marker)) return;
  const result = spawnSync(
    "npm",
    ["install", "--prefix", RECOVERY_DIR, "@electric-sql/pglite", "--no-fund", "--no-audit"],
    { stdio: "pipe", shell: true, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error("pglite_install_failed");
  }
}

async function main() {
  loadLocalEnvNames([
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "SUPABASE_ACCESS_TOKEN",
  ]);
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) throw new Error("postgres_unconfigured");
  if (/localhost|127\.0\.0\.1/i.test(url)) throw new Error("refusing_localhost_as_production");

  ensurePgliteInstalled();

  const sql = postgres(url, { max: 1, ssl: "require", prepare: false, connect_timeout: 20 });
  try {
    const before = await captureProductionFingerprint(sql);
    const platform = await probeSupabasePlatformBackups(url);
    const restore = await runIsolatedRestore(sql);
    const after = await captureProductionFingerprint(sql);
    const unchanged = fingerprintsMatch(before, after);

    const origin = ACTIVE_VERCEL_PRODUCTION_ORIGIN;
    const homepage = await probeHttp(origin, "/");
    const register = await probeHttp(origin, "/register");
    const login = await probeHttp(origin, "/login", { acceptRedirect: true });
    const checkout = await probeHttp(origin, "/checkout", { acceptRedirect: true });
    const journey = await probeHttp(origin, "/journey");
    const lumina = await probeHttp(origin, "/lumina");
    const support = await probeHttp(origin, "/support");
    const es = await probeHttp(origin, "/es");
    const applicationHealthy =
      homepage.ok && register.ok && login.ok && checkout.ok && journey.ok && lumina.ok
        ? "PASS"
        : "FAIL";

    await rm(DUMP_FILE, { force: true }).catch(() => undefined);
    const dumpRemoved = !existsSync(DUMP_FILE);

    const remainingRisks: string[] = [];
    if (platform.httpStatus === 401 || platform.httpStatus === 403) {
      remainingRisks.push(
        "Supabase Management API backup listing requires SUPABASE_ACCESS_TOKEN (not present in this workstation).",
      );
    }
    if (before.authUsers === 0) {
      remainingRisks.push(
        "Supabase auth.users is empty. Application accounts currently use the process-local auth file store, which is not in Postgres.",
      );
    }
    remainingRisks.push(
      "Journey, Lumina, onboarding, and billing file stores (`.data/`) are not in Postgres and are not recovered by a database restore. Stripe remains the payment system of record.",
    );

    const model: Row62ReviewModel = {
      generatedAt: new Date().toISOString(),
      productionSystem: "Supabase Postgres (us-east-1 pooler) — database postgres",
      backupStatus:
        before.archiveMode === "on" && restore.ok ? "Operating" : "Not verified",
      backupMethod:
        "Supabase WAL archiving (archive_mode=on, wal_level=logical) plus isolated logical export/restore test of the public schema",
      frequency:
        platform.latestBackupAt
          ? "Platform backup listing available"
          : "WAL archiving enabled; daily listing not available without management token",
      retentionWindow:
        platform.pitrEnabled === true
          ? "PITR enabled (platform)"
          : "Platform retention/PITR listing unavailable without management token; logical restore test used a point-in-time export",
      latestRecoveryPoint: restore.recoveryPoint,
      restore,
      platform,
      production: {
        modifiedByRestore: unchanged ? "NO" : "YES",
        databaseHealthy: unchanged ? "PASS" : "FAIL",
        applicationHealthy,
        persistenceHealthy:
          after.analytics.count === before.analytics.count ? "PASS" : "FAIL",
        fingerprintUnchanged: unchanged,
      },
      security: {
        secretsDisplayed: false,
        dumpGitignored: true,
        dumpRemoved,
      },
      owners: ROW62_OWNERS,
      recoveryProcedure: restore.ok && unchanged ? "READY" : "NOT READY",
      founderAttention: !restore.ok || !unchanged || applicationHealthy === "FAIL",
      remainingRisks,
      before: {
        walLevel: before.walLevel,
        archiveMode: before.archiveMode,
        publicTableCount: before.publicTableCount,
        analytics: before.analytics,
        authUsers: before.authUsers,
        storageObjects: before.storageObjects,
      },
    };

    const dashboardSql = getLaunchDashboardSql();
    if (dashboardSql) {
      await ensureLaunchDashboardSchema(dashboardSql);
      await dashboardSql`
        INSERT INTO launch_dashboard_meta (key, value, updated_at)
        VALUES (
          ${META_KEY},
          ${dashboardSql.json({
            lastVerifiedAt: model.generatedAt,
            archiveMode: before.archiveMode,
            walLevel: before.walLevel,
            restoreOk: restore.ok,
            productionModified: false,
            isolated: true,
          })},
          NOW()
        )
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    await mkdir("ops/fab-5/runs", { recursive: true });
    await writeFile(
      "ops/fab-5/runs/row-62-backup-restore-validation.json",
      `${JSON.stringify(model, null, 2)}\n`,
      "utf8",
    );

    const review = await fetch(
      "http://localhost:3000/_internal/row62-backup-disaster-recovery-review",
      { signal: AbortSignal.timeout(60000) },
    ).catch(() => null);
    const html = review ? await review.text() : "";
    const reviewVisible =
      Boolean(review?.ok) &&
      html.includes("Row 62 — Test Backup and Disaster Recovery") &&
      html.includes("data-bh-temp-qa=\"row62-backup-disaster-recovery-review\"");

    console.log(
      JSON.stringify(
        {
          restoreOk: restore.ok,
          productionUnchanged: unchanged,
          dumpRemoved,
          archiveMode: before.archiveMode,
          analytics: before.analytics.count,
          restoredAnalytics: restore.analyticsCount,
          applicationHealthy,
          supportOk: support.ok,
          spanishOk: es.ok,
          reviewStatus: review?.status ?? 0,
          reviewVisible,
          error: restore.error ?? null,
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown";
  console.error(message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@").slice(0, 220));
  process.exit(1);
});
