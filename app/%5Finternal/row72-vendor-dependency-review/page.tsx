import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow72ReviewModel } from "@/lib/fab-5/row72-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 72 Founder acceptance review only.
 * URL: /_internal/row72-vendor-dependency-review
 * Localhost-only. Closure is recorded in row-72-status.json.
 * Never displays passwords, tokens, MFA codes, backup codes, or secret env values.
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

function tone(value: string) {
  if (value === "PASS" || value === "NO" || value === "NONE") return "text-emerald-800";
  if (value === "FAIL") return "text-red-800";
  if (value.includes("FOUNDER VERIFICATION") || value === "HIGH" || value === "MEDIUM") {
    return "text-amber-900";
  }
  if (value === "CRITICAL") return "text-red-800";
  return "text-bh-ink";
}

export default async function Row72VendorDependencyReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = await getRow72ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row72-vendor-dependency-review"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 72 VENDOR AND SAAS DEPENDENCY REGISTER
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          {model.founderAcceptanceRecorded
            ? "Founder Acceptance recorded. Row 72 is Complete. Vendor findings are preserved. FOUNDER VERIFICATION REQUIRED plan/quota fields were not converted to PASS. thebackhalf.org SOA-only DNS finding remains a Row 75 follow-up and is not marked resolved. Row 73 remains capacity/billing. Row 74 remains recovery. Secrets, passwords, tokens, MFA codes, and recovery credentials are not shown."
            : "Founder Acceptance Review. Row 72 is not marked Complete. This page is the single inspection surface for launch-critical vendors. Secrets, passwords, tokens, MFA codes, and recovery credentials are not shown. Row 73 remains capacity/billing verification. Row 74 remains recovery."}
        </p>
        <p
          className={`mt-4 font-sans text-sm font-medium ${
            model.founderAcceptanceRecorded || model.readyForFounderAcceptance
              ? "text-emerald-800"
              : "text-red-800"
          }`}
        >
          {model.finalStatus}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row72-scorecard">
          <h2
            id="row72-scorecard"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Scorecard
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Authoritative Vendor Register:{" "}
              <span className={tone(model.scorecard.authoritativeVendorRegister)}>
                {model.scorecard.authoritativeVendorRegister}
              </span>
            </li>
            <li>
              Launch-Critical Dependencies Identified:{" "}
              {model.scorecard.launchCriticalDependenciesIdentified}
            </li>
            <li>
              Production Architecture Reconciled:{" "}
              {model.scorecard.productionArchitectureReconciled}
            </li>
            <li>
              Obsolete/Superseded Vendors Excluded:{" "}
              {model.scorecard.obsoleteVendorsExcluded}
            </li>
            <li>
              Account Ownership Documented: {model.scorecard.accountOwnershipDocumented}
            </li>
            <li>
              Billing Ownership Documented: {model.scorecard.billingOwnershipDocumented}
            </li>
            <li>Plan Levels Documented: {model.scorecard.planLevelsDocumented}</li>
            <li>
              Renewal/Billing Documented: {model.scorecard.renewalBillingDocumented}
            </li>
            <li>
              Usage Limits/Quotas Documented: {model.scorecard.usageLimitsDocumented}
            </li>
            <li>
              Credential Ownership Documented:{" "}
              {model.scorecard.credentialOwnershipDocumented}
            </li>
            <li>MFA Ownership Documented: {model.scorecard.mfaOwnershipDocumented}</li>
            <li>Secrets Exposed: {model.scorecard.secretsExposed}</li>
            <li>
              Least Privilege Preserved: {model.scorecard.leastPrivilegePreserved}
            </li>
            <li>Support Paths Documented: {model.scorecard.supportPathsDocumented}</li>
            <li>Status Pages Documented: {model.scorecard.statusPagesDocumented}</li>
            <li>Fallbacks Documented: {model.scorecard.fallbacksDocumented}</li>
            <li>
              Failure Impacts Classified: {model.scorecard.failureImpactsClassified}
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row72-vendors">
          <h2
            id="row72-vendors"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Launch-critical and documented vendors
          </h2>
          <div className="space-y-6">
            {model.vendors.map((vendor) => (
              <article
                key={vendor.id}
                className="rounded-sm border border-bh-purple/15 bg-white/70 p-5"
              >
                <h3 className="font-display text-2xl">{vendor.vendorService}</h3>
                <p className="mt-1 font-sans text-sm text-bh-muted">
                  Launch-critical: {vendor.launchCritical}
                </p>
                <ul className="mt-3 space-y-1 font-sans text-sm">
                  <li>Function: {vendor.function}</li>
                  <li>Production use: {vendor.productionUse}</li>
                  <li>Account owner: {vendor.accountOwner}</li>
                  <li>Billing owner: {vendor.billingOwner}</li>
                  <li>Operational owner: {vendor.operationalOwner}</li>
                  <li>Plan level: {vendor.currentPlanLevel}</li>
                  <li>Renewal/billing: {vendor.renewalBillingDateOrMethod}</li>
                  <li>Auto-renewal: {vendor.autoRenewalStatus}</li>
                  <li>Payment method: {vendor.paymentMethodStatus}</li>
                  <li>Usage limit/capacity: {vendor.usageLimitQuota}</li>
                  <li>Current capacity: {vendor.currentCapacityStatus}</li>
                  <li>
                    Support path:{" "}
                    {vendor.supportPath.startsWith("http") ? (
                      <a className="underline" href={vendor.supportPath}>
                        {vendor.supportPath}
                      </a>
                    ) : (
                      vendor.supportPath
                    )}
                  </li>
                  <li>
                    Status page:{" "}
                    {vendor.statusPage.startsWith("http") ? (
                      <a className="underline" href={vendor.statusPage.split(" —")[0]}>
                        {vendor.statusPage}
                      </a>
                    ) : (
                      vendor.statusPage
                    )}
                  </li>
                  <li>Credential owner: {vendor.credentialOwner}</li>
                  <li>MFA owner: {vendor.mfaOwner}</li>
                  <li>Backup admin/recovery: {vendor.backupAdminRecoveryOwner}</li>
                  <li>Fallback: {vendor.fallbackContingency}</li>
                  <li>
                    Failure impact:{" "}
                    <span className={tone(vendor.failureImpact.split(" ")[0] ?? "")}>
                      {vendor.failureImpact}
                    </span>
                  </li>
                  <li>
                    Verification:{" "}
                    <span className={tone(vendor.verificationStatus)}>
                      {vendor.verificationStatus}
                    </span>
                  </li>
                  <li>Founder action required: {vendor.founderActionRequired}</li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-12" aria-labelledby="row72-excluded">
          <h2
            id="row72-excluded"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Obsolete / superseded vendors excluded
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.register.excludedVendors.map((row) => (
              <li key={row.vendor}>
                {row.vendor}: {row.reason}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row72-regression">
          <h2
            id="row72-regression"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Regression
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Row 20: {model.regression.row20}</li>
            <li>Row 61: {model.regression.row61}</li>
            <li>Row 62: {model.regression.row62}</li>
            <li>Row 84: {model.regression.row84}</li>
            <li>Row 150: {model.regression.row150}</li>
            <li>Row 151: {model.regression.row151}</li>
            <li>Row 153: {model.regression.row153}</li>
            <li>Security/Privacy: {model.regression.securityPrivacy}</li>
            <li>Runtime/Console: {model.regression.runtimeConsole}</li>
            <li>Overall Regression: {model.regression.overall}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row72-defects">
          <h2
            id="row72-defects"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Defects found and corrected
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.defectsCorrected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row72-founder">
          <h2
            id="row72-founder"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder verification required
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.founderVerification.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row72-launch-blockers">
          <h2
            id="row72-launch-blockers"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Actual launch blockers
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.actualLaunchBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row72-blockers">
          <h2
            id="row72-blockers"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Remaining Row 72 blockers
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.remainingRow72Blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
