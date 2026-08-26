import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadPostgresEnvFromLocalFile } from "@/lib/marketing-kpi/db";
import { REGRESSION_PATHS } from "@/lib/monitoring/catalog";
import { probeHttp } from "@/lib/monitoring/probe";
import { runProductionMonitoring } from "@/lib/monitoring/run";
import { loadMonitoringSnapshot } from "@/lib/monitoring/snapshot";

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

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|CRON_SECRET=|AUTH_SECRET=/i;

function containsSecrets(value: string): boolean {
  return SECRET_PATTERN.test(value);
}

async function probeLocalHealth(): Promise<{ status: number; ok: boolean }> {
  try {
    const response = await fetch("http://localhost:3000/api/ops/health", {
      signal: AbortSignal.timeout(8000),
    });
    const body = (await response.json()) as { ok?: boolean };
    return { status: response.status, ok: body.ok === true };
  } catch {
    return { status: 0, ok: false };
  }
}

async function probeReviewPage(): Promise<{ status: number; visible: boolean }> {
  try {
    const response = await fetch(
      "http://localhost:3000/_internal/row61-production-monitoring-review",
      { signal: AbortSignal.timeout(60000) },
    );
    const html = await response.text();
    return {
      status: response.status,
      visible:
        response.ok &&
        html.includes("Row 61 — Configure Production Monitoring") &&
        html.includes("data-bh-temp-qa=\"row61-production-monitoring-review\""),
    };
  } catch {
    return { status: 0, visible: false };
  }
}

async function main() {
  loadLocalEnvNames([
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "AUTH_SECRET",
    "CRON_SECRET",
  ]);
  loadPostgresEnvFromLocalFile();

  const snapshot = await runProductionMonitoring({ includeControlledError: true });
  const stored = await loadMonitoringSnapshot();

  const regression: Record<string, { status: number; ok: boolean }> = {};
  for (const path of REGRESSION_PATHS) {
    const result = await probeHttp(snapshot.applicationOrigin, path, {
      acceptRedirect: true,
    });
    regression[path] = { status: result.status, ok: result.ok };
  }

  const localHealth = await probeLocalHealth();
  const review = await probeReviewPage();
  const serialized = JSON.stringify(snapshot);
  const secretLeak = containsSecrets(serialized);

  const evidence = {
    generatedAt: new Date().toISOString(),
    applicationOrigin: snapshot.applicationOrigin,
    canonicalOrigin: snapshot.canonicalOrigin,
    canonicalDns: snapshot.canonicalDns,
    snapshotStored: Boolean(stored),
    uptime: snapshot.uptime.status,
    errors: snapshot.errors.status,
    database: snapshot.database.status,
    payments: snapshot.payments.status,
    controlledTest: snapshot.errors.controlledTest,
    missingPath: snapshot.uptime.missingPathDetection?.classified,
    recovery: snapshot.uptime.recovery?.ok === true,
    localHealth,
    review,
    regression,
    secretLeak,
    founderAttention: snapshot.operations.founderAttention,
    webhookConfigured: snapshot.payments.webhookConfigured,
    openCritical: snapshot.errors.openCritical,
    openCriticalCategories: snapshot.errors.openCriticalCategories,
    fingerprint: createHash("sha256").update(serialized).digest("hex").slice(0, 16),
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-61-production-monitoring-validation.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown";
  console.error(message.slice(0, 180));
  process.exit(1);
});
