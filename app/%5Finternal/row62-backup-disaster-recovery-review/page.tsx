import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { loadRow62Evidence } from "@/lib/backup/review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 62 Founder acceptance review only.
 * URL: /_internal/row62-backup-disaster-recovery-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 62 complete.
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

function Status({ label, value }: { label: string; value: string }) {
  const pass =
    value === "PASS" ||
    value === "NO" ||
    value === "READY" ||
    value === "Operating" ||
    value === "true";
  const fail =
    value === "FAIL" ||
    value === "YES" ||
    value === "NOT READY" ||
    value === "false";
  const tone = pass ? "text-emerald-800" : fail ? "text-red-800" : "text-bh-ink";
  return (
    <li className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-muted">{label}</span>
      <span className={`max-w-[28rem] text-right font-sans text-sm font-medium ${tone}`}>
        {value}
      </span>
    </li>
  );
}

export default async function Row62BackupDisasterRecoveryReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = loadRow62Evidence();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row62-backup-disaster-recovery-review"
    >
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 62 TEST BACKUP AND DISASTER RECOVERY
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 62 — Test Backup and Disaster Recovery
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance Review. Row 62 is not marked Complete. This page
          summarizes the verified backup posture and the isolated restore test.
          Secrets and Architect personal data are not displayed.
        </p>

        {!model ? (
          <p className="mt-10 font-sans text-sm font-medium text-red-800">
            Restore-test evidence has not been written yet. Run{" "}
            <code>npm run fab5:row62</code> on localhost, then reload.
          </p>
        ) : (
          <>
            <section className="mt-10 mb-12" aria-labelledby="row62-backups">
              <h2
                id="row62-backups"
                className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
              >
                Automated backups
              </h2>
              <ul>
                <Status label="Production system" value={model.productionSystem} />
                <Status label="Backup status" value={model.backupStatus} />
                <Status label="Backup method" value={model.backupMethod} />
                <Status label="Frequency" value={model.frequency} />
                <Status
                  label="Recovery / retention window"
                  value={model.retentionWindow}
                />
                <Status
                  label="Latest verified recovery point"
                  value={model.latestRecoveryPoint}
                />
                <Status
                  label="WAL archive_mode"
                  value={model.before.archiveMode}
                />
                <Status label="WAL level" value={model.before.walLevel} />
              </ul>
            </section>

            <section className="mb-12" aria-labelledby="row62-restore">
              <h2
                id="row62-restore"
                className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
              >
                Restore test
              </h2>
              <ul>
                <Status label="Restore method" value={model.restore.method} />
                <Status label="Source" value={model.restore.source} />
                <Status
                  label="Destination"
                  value="ISOLATED / NON-PRODUCTION — in-memory PGlite"
                />
                <Status
                  label="Restore result"
                  value={model.restore.ok ? "PASS" : "FAIL"}
                />
                <Status
                  label="Schema validation"
                  value={model.restore.schemaValid ? "PASS" : "FAIL"}
                />
                <Status
                  label="Representative data validation"
                  value={
                    model.restore.analyticsPresent && model.restore.analyticsCount > 0
                      ? "PASS"
                      : "FAIL"
                  }
                />
                <Status label="Integrity result" value={model.restore.integrity} />
                <Status
                  label="Restore duration"
                  value={`${model.restore.restoreDurationMs} ms`}
                />
                <Status
                  label="Validation duration"
                  value={`${model.restore.validationDurationMs} ms`}
                />
                <Status
                  label="analytics_events restored"
                  value={String(model.restore.analyticsCount)}
                />
                <Status
                  label="Public tables restored"
                  value={String(model.restore.tablesRestored)}
                />
              </ul>
            </section>

            <section className="mb-12" aria-labelledby="row62-protect">
              <h2
                id="row62-protect"
                className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
              >
                Production protection
              </h2>
              <ul>
                <Status
                  label="Production modified by restore"
                  value={model.production.modifiedByRestore}
                />
                <Status
                  label="Production health after test"
                  value={
                    model.production.databaseHealthy === "PASS" &&
                    model.production.applicationHealthy === "PASS"
                      ? "PASS"
                      : "FAIL"
                  }
                />
                <Status
                  label="Security / privacy status"
                  value={
                    model.security.dumpRemoved && !model.security.secretsDisplayed
                      ? "PASS"
                      : "FAIL"
                  }
                />
                <Status
                  label="Temporary recovery data cleanup"
                  value={model.security.dumpRemoved ? "PASS" : "FAIL"}
                />
              </ul>
            </section>

            <section className="mb-12" aria-labelledby="row62-dr">
              <h2
                id="row62-dr"
                className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
              >
                Disaster recovery
              </h2>
              <ul>
                <Status
                  label="Technical owner"
                  value={model.owners.technical}
                />
                <Status
                  label="Operational coordination"
                  value={model.owners.operations}
                />
                <Status
                  label="Recovery procedure"
                  value={model.recoveryProcedure}
                />
                <Status
                  label="Founder attention required"
                  value={model.founderAttention ? "YES" : "NO"}
                />
              </ul>
              <p className="mt-4 font-sans text-sm font-light text-bh-muted">
                Remaining risks:
              </p>
              <ul className="mt-2 list-disc pl-5 font-sans text-sm font-light text-bh-muted">
                {model.remainingRisks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </section>
          </>
        )}

        <p className="font-sans text-xs font-light text-bh-muted">
          Row 62 remains Ready for Founder Acceptance Review until the Founder
          explicitly approves it. This page does not change Launch Roadmap or
          Founder Notes.
        </p>
      </div>
    </main>
  );
}
