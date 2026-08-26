import { getStripe, getStripeSecretKey } from "@/lib/checkout/stripe";
import { isStripeWebhookConfigured } from "@/lib/billing/webhook-verify";
import {
  getLaunchDashboardSql,
  launchDashboardPostgresConfigured,
} from "@/lib/launch-dashboard/db";
import { getLaunchDashboardStore } from "@/lib/launch-dashboard/store";
import type { AvailabilityArea, AvailabilityStatus } from "@/lib/launch-dashboard/types";
import { recordLaunchOpsError } from "@/lib/launch-ops-errors/record";
import { fingerprintOpsError } from "@/lib/launch-ops-errors/types";
import {
  ACTIVE_VERCEL_PRODUCTION_ORIGIN,
  ALERT_COOLDOWN_MS,
  CANONICAL_PRODUCTION_ORIGIN,
  MISSING_PATH,
  MONITORING_OWNERS,
  UPTIME_PATHS,
  productionCandidateOrigins,
} from "@/lib/monitoring/catalog";
import { probeHttp, type HttpProbeResult } from "@/lib/monitoring/probe";
import {
  loadMonitoringSnapshot,
  resolveOpsErrorFingerprint,
  saveMonitoringSnapshot,
  writeAndDeleteProbeRow,
  writeDatabasePing,
} from "@/lib/monitoring/snapshot";
import type {
  MonitoringAlert,
  ProductionMonitoringSnapshot,
  UptimeTargetResult,
} from "@/lib/monitoring/types";

function toTarget(result: HttpProbeResult, id: string): UptimeTargetResult {
  return {
    id,
    url: result.url,
    status: result.status,
    classified: result.classified,
    ok: result.ok,
    ms: result.ms,
    error: result.error,
  };
}

function stripeMode(): "test_sandbox" | "live" | "missing" {
  const key = getStripeSecretKey();
  if (!key) return "missing";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test_sandbox";
  return "missing";
}

function availabilityNote(status: AvailabilityStatus, detail: string): string {
  return `${status === "available" ? "SYNTHETIC production probe healthy." : "SYNTHETIC production probe."} ${detail}`.slice(
    0,
    200,
  );
}

const STATUS_RANK: Record<AvailabilityStatus, number> = {
  unavailable: 3,
  degraded: 2,
  available: 1,
  unreported: 0,
};

async function persistAvailability(
  area: AvailabilityArea,
  status: AvailabilityStatus,
  note: string,
): Promise<void> {
  const store = getLaunchDashboardStore();
  const current = (await store.read()).availability.find((row) => row.area === area);
  if (
    current?.source === "manual" &&
    STATUS_RANK[current.status] > STATUS_RANK[status]
  ) {
    return;
  }
  await store.upsertAvailability({
    area,
    status,
    note: availabilityNote(status, note),
    updatedAt: new Date().toISOString(),
    updatedBy: "row61-monitor",
    source: "automated",
  });
}

function shouldAlert(
  previous: ProductionMonitoringSnapshot | null,
  fingerprint: string,
): boolean {
  if (!previous) return true;
  const prior = previous.alerts.find(
    (alert) => `${alert.system}|${alert.failureType}|${alert.route ?? ""}` === fingerprint,
  );
  if (!prior) return true;
  return Date.parse(previous.generatedAt) + ALERT_COOLDOWN_MS < Date.now();
}

export async function runProductionMonitoring(options?: {
  includeControlledError?: boolean;
}): Promise<ProductionMonitoringSnapshot> {
  const now = new Date().toISOString();
  const previous = await loadMonitoringSnapshot().catch(() => null);
  const alerts: MonitoringAlert[] = [];

  const canonical = await probeHttp(CANONICAL_PRODUCTION_ORIGIN, "/", {
    timeoutMs: 10000,
  });
  const canonicalDns = canonical.status > 0 ? "resolves" : "not_found";

  let applicationOrigin = ACTIVE_VERCEL_PRODUCTION_ORIGIN;
  for (const origin of productionCandidateOrigins()) {
    const home = await probeHttp(origin, "/", { timeoutMs: 10000 });
    if (home.status > 0) {
      applicationOrigin = origin;
      break;
    }
  }

  const targets: UptimeTargetResult[] = [];
  for (const item of UPTIME_PATHS) {
    const result = await probeHttp(applicationOrigin, item.path, {
      acceptRedirect: item.acceptRedirect,
    });
    targets.push(toTarget(result, item.id));
  }

  const missingPathDetection = toTarget(
    await probeHttp(applicationOrigin, MISSING_PATH),
    "missing_path",
  );
  const recovery = toTarget(
    await probeHttp(applicationOrigin, "/"),
    "recovery_homepage",
  );

  const homepage = targets.find((row) => row.id === "homepage");
  const registration = targets.find((row) => row.id === "registration");
  const login = targets.find((row) => row.id === "login");
  const checkout = targets.find((row) => row.id === "checkout");
  const health = targets.find((row) => row.id === "health");

  const appUp = homepage?.ok === true && recovery.ok;
  const uptimeStatus =
    appUp && registration?.ok && login?.ok && checkout?.ok ? "PASS" : "FAIL";

  await persistAvailability(
    "website",
    appUp ? (canonicalDns === "not_found" ? "degraded" : "available") : "unavailable",
    appUp
      ? `Application origin ${applicationOrigin} HTTP ${homepage?.status}. Canonical DNS ${canonicalDns}.`
      : `Homepage probe failed (${homepage?.classified ?? "unknown"}).`,
  );
  await persistAvailability(
    "registration",
    registration?.ok ? "available" : "unavailable",
    `GET ${applicationOrigin}/register → ${registration?.status ?? 0}.`,
  );
  await persistAvailability(
    "architect_access",
    login?.ok ? "available" : "unavailable",
    `GET ${applicationOrigin}/login → ${login?.status ?? 0}.`,
  );
  await persistAvailability(
    "checkout",
    checkout?.ok ? "available" : "unavailable",
    `GET ${applicationOrigin}/checkout → ${checkout?.status ?? 0}.`,
  );

  const criticalUptimeFails = targets.filter(
    (row) => row.id !== "health" && !row.ok,
  );
  for (const fail of criticalUptimeFails) {
    const alertFingerprint = `Uptime|http_${fail.classified}|${fail.id}`;
    await recordLaunchOpsError({
      productArea:
        fail.id === "registration"
          ? "registration"
          : fail.id === "login"
            ? "auth"
            : fail.id === "checkout"
              ? "checkout"
              : "website",
      errorCategory: `uptime_${fail.classified}`,
      route: fail.id === "homepage" ? "/" : `/${fail.id}`,
      service: "uptime",
      safeCode: fail.classified,
      statusCode: fail.status || 503,
      severity: "CRITICAL",
    });
    if (shouldAlert(previous, alertFingerprint)) {
      alerts.push({
        environment: "Production",
        system: "Uptime",
        at: now,
        failureType: `http_${fail.classified}`,
        severity: "CRITICAL",
        route: fail.url,
        investigate: "/ops/admin/launch-dashboard",
        technicalOwner: MONITORING_OWNERS.technical,
        operationalCoordination: MONITORING_OWNERS.operations,
        founderAttention: true,
      });
    }
  }

  if (criticalUptimeFails.length === 0) {
    await resolveOpsErrorFingerprint(
      fingerprintOpsError({
        productArea: "website",
        errorCategory: "uptime_unreachable",
        route: "/",
        safeCode: "unreachable",
      }),
    );
  }

  let dbConnected = false;
  let persistenceVerified = false;
  try {
    const sql = getLaunchDashboardSql();
    if (sql && launchDashboardPostgresConfigured()) {
      const ping = await sql<{ ok: number }[]>`SELECT 1 as ok`;
      dbConnected = ping[0]?.ok === 1;
      const nonce = `r61-${Date.now()}`;
      persistenceVerified = await writeAndDeleteProbeRow(nonce);
      if (persistenceVerified) {
        await writeDatabasePing({ at: now, nonce });
      }
    }
  } catch {
    dbConnected = false;
    persistenceVerified = false;
  }

  const databaseStatus =
    dbConnected && persistenceVerified ? "PASS" : "FAIL";
  if (!dbConnected) {
    await recordLaunchOpsError({
      productArea: "website",
      errorCategory: "database_unavailable",
      route: "supabase_postgres",
      service: "database",
      safeCode: "unavailable",
      statusCode: 503,
      severity: "CRITICAL",
    });
    alerts.push({
      environment: "Production",
      system: "Database",
      at: now,
      failureType: "connectivity_failure",
      severity: "CRITICAL",
      investigate: "/ops/admin/launch-dashboard",
      technicalOwner: MONITORING_OWNERS.technical,
      operationalCoordination: MONITORING_OWNERS.operations,
      founderAttention: true,
    });
  } else {
    await resolveOpsErrorFingerprint(
      fingerprintOpsError({
        productArea: "website",
        errorCategory: "database_unavailable",
        route: "supabase_postgres",
        safeCode: "unavailable",
      }),
    );
  }

  const mode = stripeMode();
  let providerReachable = false;
  if (mode !== "missing") {
    try {
      await getStripe().balance.retrieve();
      providerReachable = true;
    } catch {
      providerReachable = false;
    }
  }
  const webhookConfigured = isStripeWebhookConfigured();
  const paymentsOk = mode !== "missing" && providerReachable;
  await persistAvailability(
    "payment",
    paymentsOk ? "available" : "unavailable",
    paymentsOk
      ? `Stripe ${mode} reachable. Webhook ${webhookConfigured ? "configured" : "not_configured"}. No charge executed.`
      : "Stripe provider not reachable or not configured. No charge executed.",
  );
  if (!paymentsOk) {
    await recordLaunchOpsError({
      productArea: "payment",
      errorCategory: "payment_provider_unreachable",
      route: "/api/stripe/webhook",
      service: "stripe",
      safeCode: "unreachable",
      statusCode: 503,
      severity: "CRITICAL",
    });
    alerts.push({
      environment: "Production",
      system: "Payments",
      at: now,
      failureType: "provider_unreachable",
      severity: "CRITICAL",
      route: "/api/stripe/webhook",
      investigate: "/ops/admin/launch-dashboard",
      technicalOwner: MONITORING_OWNERS.technical,
      operationalCoordination: MONITORING_OWNERS.operations,
      founderAttention: true,
    });
  } else {
    await resolveOpsErrorFingerprint(
      fingerprintOpsError({
        productArea: "payment",
        errorCategory: "payment_provider_unreachable",
        route: "/api/stripe/webhook",
        safeCode: "unreachable",
      }),
    );
  }

  let controlledTest: ProductionMonitoringSnapshot["errors"]["controlledTest"] =
    "not_run";
  if (options?.includeControlledError) {
    const recorded = await recordLaunchOpsError({
      productArea: "website",
      errorCategory: "row61_controlled_error",
      route: "/api/ops/monitoring/run",
      service: "monitoring",
      safeCode: "controlled_test",
      test: true,
      severity: "LOW",
    });
    const listed = await getLaunchDashboardStore().listOpsErrors({
      includeTest: true,
    });
    const found = listed.some(
      (row) => row.fingerprint === recorded?.fingerprint && row.test === true,
    );
    if (found && recorded) {
      await resolveOpsErrorFingerprint(recorded.fingerprint);
      controlledTest = "verified_and_removed";
    } else {
      controlledTest = "failed";
    }
  }

  const openErrors = await getLaunchDashboardStore()
    .listOpsErrors({ includeTest: false })
    .catch(() => []);
  const openCriticalRows = openErrors.filter(
    (row) => row.status === "open" && row.severity === "CRITICAL",
  );
  const openCritical = openCriticalRows.length;
  const openCriticalCategories = openCriticalRows.map(
    (row) => `${row.productArea}/${row.errorCategory}`,
  );

  const founderAttention =
    uptimeStatus === "FAIL" ||
    databaseStatus === "FAIL" ||
    !paymentsOk ||
    openCritical > 0;

  const snapshot: ProductionMonitoringSnapshot = {
    generatedAt: now,
    environment: "Production",
    canonicalOrigin: CANONICAL_PRODUCTION_ORIGIN,
    applicationOrigin,
    canonicalDns,
    uptime: {
      status: uptimeStatus,
      lastVerification: now,
      alerting: criticalUptimeFails.length ? "firing" : "armed",
      targets,
      missingPathDetection,
      recovery,
    },
    errors: {
      status:
        controlledTest === "failed"
          ? "FAIL"
          : "PASS",
      source: "launch_ops_errors + Next.js onRequestError + Stripe webhook recording",
      controlledTest,
      alerting: openCritical > 0 ? "firing" : "armed",
      openCritical,
      openCriticalCategories,
    },
    database: {
      status: databaseStatus,
      connected: dbConnected,
      persistenceVerified,
      alerting: dbConnected ? "armed" : "firing",
      backend: launchDashboardPostgresConfigured()
        ? "supabase_postgres"
        : "unconfigured",
    },
    payments: {
      status: paymentsOk ? "PASS" : "FAIL",
      provider: "Stripe",
      configured: mode !== "missing",
      mode,
      webhookConfigured,
      providerReachable,
      alerting: paymentsOk ? "armed" : "firing",
    },
    operations: {
      technicalOwner: MONITORING_OWNERS.technical,
      operationalCoordination: MONITORING_OWNERS.operations,
      founderAttention,
    },
    alerts,
    availability: [
      {
        area: "website",
        status: appUp
          ? canonicalDns === "not_found"
            ? "degraded"
            : "available"
          : "unavailable",
        note: `Canonical DNS ${canonicalDns}. Health ${health?.status ?? 0}.`,
      },
      {
        area: "registration",
        status: registration?.ok ? "available" : "unavailable",
        note: `HTTP ${registration?.status ?? 0}`,
      },
      {
        area: "architect_access",
        status: login?.ok ? "available" : "unavailable",
        note: `HTTP ${login?.status ?? 0}`,
      },
      {
        area: "checkout",
        status: checkout?.ok ? "available" : "unavailable",
        note: `HTTP ${checkout?.status ?? 0}`,
      },
      {
        area: "payment",
        status: paymentsOk ? "available" : "unavailable",
        note: `Stripe ${mode}`,
      },
    ],
  };

  await saveMonitoringSnapshot(snapshot);
  return snapshot;
}
