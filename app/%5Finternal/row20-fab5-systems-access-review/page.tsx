import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow20ReviewModel } from "@/lib/fab-5/row20-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 20 Founder acceptance review only.
 * URL: /_internal/row20-fab5-systems-access-review
 * Localhost-only. Records Founder acceptance display from row-20-status.json.
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
  if (value === "PASS" || value === "NO" || value === "NONE" || value === "NOT REQUIRED") {
    return "text-emerald-800";
  }
  if (value === "FAIL") return "text-red-800";
  return "text-amber-900";
}

export default async function Row20Fab5SystemsAccessReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = await getRow20ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row20-fab5-systems-access-review"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 20 FAB 5 SYSTEMS AND ACCESS
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance recorded. Row 20 is Complete. Approved Fab 5 access
          matrix and least-privilege controls are preserved. Founder-only
          MFA/recovery confirmations remain operational security items and
          inputs to Row 74. Secrets, passwords, tokens, MFA codes, and recovery
          credentials are not shown.
        </p>
        <p className="mt-2 font-sans text-sm">
          Founder Acceptance Recorded:{" "}
          <span className={tone(model.founderAcceptanceRecorded ? "PASS" : "FAIL")}>
            {model.founderAcceptanceRecorded ? "YES" : "NO"}
          </span>
        </p>
        <p className={`mt-4 font-sans text-sm font-medium ${tone(model.markedComplete ? "PASS" : model.readyForFounderAcceptance ? "PASS" : "FAIL")}`}>
          {model.finalStatus}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row20-executives">
          <h2
            id="row20-executives"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Executives
          </h2>
          <div className="space-y-6">
            {model.executives.map((executive) => (
              <article
                key={executive.id}
                className="rounded-sm border border-bh-purple/15 bg-white/70 p-5"
              >
                <h3 className="font-display text-2xl">{executive.name}</h3>
                <p className="mt-1 font-sans text-sm text-bh-muted">{executive.title}</p>
                <ul className="mt-3 space-y-1 font-sans text-sm">
                  <li>
                    Verified status:{" "}
                    <span className={tone(executive.verified)}>{executive.verified}</span>
                  </li>
                  <li>
                    Least-privilege status:{" "}
                    <span className={tone(executive.leastPrivilege)}>
                      {executive.leastPrivilege}
                    </span>
                  </li>
                  <li>Result: {executive.status}</li>
                  <li>Required systems: {executive.requiredSystems.join(", ") || "none"}</li>
                  <li>Access level: {executive.accessLevel.join(" · ") || "none"}</li>
                  <li>{executive.detail}</li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-12" aria-labelledby="row20-matrix">
          <h2
            id="row20-matrix"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Authoritative access matrix
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-bh-purple/20 text-left text-bh-muted">
                  <th className="py-2 pr-3">Executive</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">System</th>
                  <th className="py-2 pr-3">Required</th>
                  <th className="py-2 pr-3">Current</th>
                  <th className="py-2 pr-3">Permission</th>
                  <th className="py-2 pr-3">Owner</th>
                  <th className="py-2 pr-3">Purpose</th>
                  <th className="py-2 pr-3">MFA</th>
                  <th className="py-2 pr-3">Test</th>
                  <th className="py-2 pr-3">Least privilege</th>
                  <th className="py-2 pr-3">Recovery</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {model.cells.map((row) => (
                  <tr
                    key={`${row.system}-${row.executive}`}
                    className="border-b border-bh-purple/10 align-top"
                  >
                    <td className="py-2 pr-3">{row.executiveName}</td>
                    <td className="py-2 pr-3">{row.title}</td>
                    <td className="py-2 pr-3">{row.system}</td>
                    <td className="py-2 pr-3">{row.requiredAccess}</td>
                    <td className="py-2 pr-3">{row.currentAccess}</td>
                    <td className="py-2 pr-3">{row.permissionLevel}</td>
                    <td className="py-2 pr-3">{row.accountAdminOwner}</td>
                    <td className="py-2 pr-3">{row.operationalPurpose}</td>
                    <td className={`py-2 pr-3 ${tone(String(row.mfaStatus))}`}>
                      {row.mfaStatus}
                    </td>
                    <td className={`py-2 pr-3 ${tone(row.accessTestResult)}`}>
                      {row.accessTestResult}
                    </td>
                    <td className={`py-2 pr-3 ${tone(row.leastPrivilegeResult)}`}>
                      {row.leastPrivilegeResult}
                    </td>
                    <td className="py-2 pr-3">{row.recoveryEscalation}</td>
                    <td className="py-2">{row.actionRequired ?? "NONE"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12" aria-labelledby="row20-scorecard">
          <h2
            id="row20-scorecard"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Scorecard
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Authoritative Access Matrix: {model.scorecard.authoritativeMatrix}</li>
            <li>Current Names/Titles Used: {model.scorecard.currentNamesTitles}</li>
            <li>Superseded Roles Avoided: {model.scorecard.supersededRolesAvoided}</li>
            <li>Website/Admin: {model.scorecard.websiteAdmin}</li>
            <li>Analytics: {model.scorecard.analytics}</li>
            <li>Instagram @backhalfco: {model.scorecard.instagram}</li>
            <li>TikTok @backhalfco: {model.scorecard.tiktok}</li>
            <li>LinkedIn Required: {model.scorecard.linkedinRequired}</li>
            <li>Google Workspace: {model.scorecard.googleWorkspace}</li>
            <li>Support: {model.scorecard.support}</li>
            <li>Payment Reporting: {model.scorecard.paymentReporting}</li>
            <li>Content Assets: {model.scorecard.contentAssets}</li>
            <li>Legal Documents: {model.scorecard.legalDocuments}</li>
            <li>Launch KPI Dashboard: {model.scorecard.launchKpi}</li>
            <li>Launch Dashboard: {model.scorecard.launchDashboard}</li>
            <li>Infrastructure/Monitoring: {model.scorecard.infrastructure}</li>
            <li>Approved AI/Automation Tools: {model.scorecard.aiTools}</li>
            <li>Cursor/Development Access: {model.scorecard.cursor}</li>
            <li>Required Executive Access Provisioned: {model.scorecard.requiredProvisioned}</li>
            <li>
              Actual Access Mechanically Verified Where Possible:{" "}
              {model.scorecard.mechanicallyVerified}
            </li>
            <li>Unauthorized Access Restricted: {model.scorecard.unauthorizedRestricted}</li>
            <li>Least Privilege: {model.scorecard.leastPrivilege}</li>
            <li>Sensitive Credentials Protected: {model.scorecard.secretsProtected}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row20-regression">
          <h2
            id="row20-regression"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Regression
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Website/Admin: {model.regression.websiteAdmin}</li>
            <li>Analytics: {model.regression.analytics}</li>
            <li>Support: {model.regression.support}</li>
            <li>Payment Reporting: {model.regression.paymentReporting}</li>
            <li>Content Assets: {model.regression.contentAssets}</li>
            <li>Legal Documents: {model.regression.legalDocuments}</li>
            <li>Monitoring: {model.regression.monitoring}</li>
            <li>Security/Privacy: {model.regression.securityPrivacy}</li>
            <li>Runtime/Console: {model.regression.runtimeConsole}</li>
            <li>Overall Regression: {model.regression.overall}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row20-founder-v">
          <h2
            id="row20-founder-v"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder verification items (Row 74 follow-up — not Row 20 blockers)
          </h2>
          {model.founderVerification.length === 0 ? (
            <p className="font-sans text-sm">NONE</p>
          ) : (
            <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
              {model.founderVerification.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-12" aria-labelledby="row20-defects">
          <h2
            id="row20-defects"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Defects corrected
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.defectsCorrected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row20-blockers">
          <h2
            id="row20-blockers"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Remaining blockers
          </h2>
          {model.remainingBlockers.length === 0 ? (
            <p className="font-sans text-sm">NONE</p>
          ) : (
            <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
              {model.remainingBlockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-12" aria-labelledby="row20-lockout">
          <h2
            id="row20-lockout"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Single-person lockout risks
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.scorecard.singlePersonRisks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row20-http">
          <h2
            id="row20-http"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Mechanical access tests
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Authorized Access: {model.websiteTests.authorizedAccess}</li>
            <li>Unauthorized Access Blocked: {model.websiteTests.unauthorizedBlocked}</li>
            <li>Admin Authentication: {model.websiteTests.adminAuthentication}</li>
            <li>Role Enforcement: {model.websiteTests.roleEnforcement}</li>
            <li>Least Privilege: {model.websiteTests.leastPrivilege}</li>
            <li>
              HTTP suite: {model.http ? "RECORDED" : "Run scripts/fab-5/row-20-access-audit.ts against localhost"}
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
