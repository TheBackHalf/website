import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow61ReviewModel } from "@/lib/monitoring/review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 61 Founder acceptance review only.
 * URL: /_internal/row61-production-monitoring-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 61 complete.
 */
function assertLocalhostOnly(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return;
  }
  notFound();
}

function Status({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const pass =
    value === "PASS" ||
    value === "armed" ||
    value === "available" ||
    value === "No";
  const warn =
    value === "DEGRADED" ||
    value === "degraded" ||
    value === "firing" ||
    value === "PENDING DEPLOY" ||
    value === "Yes";
  const fail = value === "FAIL" || value === "unavailable" || value === "not_found";
  const tone = pass
    ? "text-emerald-800"
    : fail
      ? "text-red-800"
      : warn
        ? "text-amber-800"
        : "text-bh-ink";
  return (
    <li className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-muted">{label}</span>
      <span className={`font-sans text-sm font-medium ${tone}`}>{value}</span>
    </li>
  );
}

export default async function Row61ProductionMonitoringReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const { snapshot } = await getRow61ReviewModel();
  const health = snapshot.uptime.targets.find((row) => row.id === "health");

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row61-production-monitoring-review"
    >
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 61 CONFIGURE PRODUCTION MONITORING
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 61 — Configure Production Monitoring
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance Review. Row 61 is not marked Complete. This page
          summarizes mechanically verified production monitoring. Secrets are
          not displayed.
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row61-prod">
          <h2
            id="row61-prod"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Production monitoring
          </h2>
          <p className="font-sans text-sm font-light text-bh-muted">
            Environment: {snapshot.environment}. Last verification:{" "}
            {snapshot.generatedAt}.
          </p>
          <p className="mt-1 font-sans text-sm font-light text-bh-muted">
            Canonical domain: {snapshot.canonicalOrigin} (DNS{" "}
            {snapshot.canonicalDns}).
          </p>
          <p className="mt-1 font-sans text-sm font-light text-bh-muted">
            Application origin used for probes: {snapshot.applicationOrigin}.
          </p>
        </section>

        <section className="mb-12" aria-labelledby="row61-uptime">
          <h2
            id="row61-uptime"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Uptime
          </h2>
          <ul>
            <Status label="Status" value={snapshot.uptime.status} />
            <Status label="Production target" value={snapshot.applicationOrigin} />
            <Status
              label="Last verification"
              value={snapshot.uptime.lastVerification}
            />
            <Status
              label="Monitoring / alert status"
              value={snapshot.uptime.alerting}
            />
            <Status
              label="Canonical DNS"
              value={snapshot.canonicalDns === "resolves" ? "PASS" : "FAIL"}
            />
            <Status
              label="Health endpoint on production"
              value={
                health?.ok
                  ? "PASS"
                  : health?.classified === "missing"
                    ? "PENDING DEPLOY"
                    : "FAIL"
              }
            />
            <Status
              label="Failure detection (missing path)"
              value={
                snapshot.uptime.missingPathDetection?.classified === "missing"
                  ? "PASS"
                  : "FAIL"
              }
            />
            <Status
              label="Recovery (homepage after missing path)"
              value={snapshot.uptime.recovery?.ok ? "PASS" : "FAIL"}
            />
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row61-errors">
          <h2
            id="row61-errors"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Errors
          </h2>
          <ul>
            <Status label="Status" value={snapshot.errors.status} />
            <Status label="Monitoring source" value={snapshot.errors.source} />
            <Status
              label="Controlled test verification"
              value={
                snapshot.errors.controlledTest === "verified_and_removed"
                  ? "PASS"
                  : snapshot.errors.controlledTest.toUpperCase()
              }
            />
            <Status label="Alert status" value={snapshot.errors.alerting} />
            <Status
              label="Open critical errors"
              value={String(snapshot.errors.openCritical)}
            />
            {snapshot.errors.openCriticalCategories?.length ? (
              <li className="border-b border-bh-purple/10 py-2 font-sans text-sm font-light text-bh-muted">
                Open critical categories:{" "}
                {snapshot.errors.openCriticalCategories?.join(", ")}
              </li>
            ) : null}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row61-db">
          <h2
            id="row61-db"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Database
          </h2>
          <ul>
            <Status label="Status" value={snapshot.database.status} />
            <Status
              label="Production database connectivity"
              value={snapshot.database.connected ? "PASS" : "FAIL"}
            />
            <Status
              label="Persistence verification"
              value={snapshot.database.persistenceVerified ? "PASS" : "FAIL"}
            />
            <Status
              label="Monitoring status"
              value={snapshot.database.alerting}
            />
            <Status label="Backend" value={snapshot.database.backend} />
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row61-pay">
          <h2
            id="row61-pay"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Payments
          </h2>
          <ul>
            <Status label="Status" value={snapshot.payments.status} />
            <Status
              label="Provider / infrastructure"
              value={`${snapshot.payments.provider} (${snapshot.payments.mode})`}
            />
            <Status
              label="Monitoring verification"
              value={
                snapshot.payments.configured && snapshot.payments.providerReachable
                  ? "PASS"
                  : "FAIL"
              }
            />
            <li className="border-b border-bh-purple/10 py-2 font-sans text-sm font-light text-bh-muted">
              Failure visibility: Stripe webhook recording, checkout_failed
              events, and launch_ops_errors. No charge executed. No refund
              monitoring.
            </li>
            <Status label="Alert status" value={snapshot.payments.alerting} />
            <Status
              label="Webhook configured"
              value={snapshot.payments.webhookConfigured ? "PASS" : "FAIL"}
            />
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row61-ops">
          <h2
            id="row61-ops"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Operations
          </h2>
          <ul>
            <Status
              label="Technical Owner"
              value={snapshot.operations.technicalOwner}
            />
            <Status
              label="Operational Coordination"
              value={snapshot.operations.operationalCoordination}
            />
            <Status
              label="Founder Attention"
              value={snapshot.operations.founderAttention ? "Yes" : "No"}
            />
          </ul>
        </section>

        <p className="font-sans text-xs font-light text-bh-muted">
          Row 61 remains Ready for Founder Acceptance Review until the Founder
          explicitly approves it. This page does not change Launch Roadmap or
          Founder Notes.
        </p>
      </div>
    </main>
  );
}
