import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow74ReviewModel } from "@/lib/fab-5/row74-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 74 Founder acceptance review only.
 * URL: /_internal/row74-credential-recovery-review
 * Localhost-only Founder inspection surface for Row 74.
 * Never displays passwords, MFA secrets, backup codes, recovery phone numbers, or API keys.
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
  if (
    value.startsWith("INACTIVE") ||
    value.includes("FOUNDER RISK ACCEPTED")
  ) {
    return "text-amber-900";
  }
  if (
    value === "PASS" ||
    value === "NO" ||
    value === "NONE" ||
    value === "GREEN" ||
    value === "ENABLED" ||
    value === "MITIGATED" ||
    value.startsWith("NONE") ||
    value.startsWith("PASS") ||
    value.startsWith("ENABLED") ||
    value.startsWith("MITIGATED") ||
    value.startsWith("GREEN")
  ) {
    return "text-emerald-800";
  }
  if (value === "FAIL" || value === "YES" || value === "RED" || value.startsWith("RED")) {
    return "text-red-800";
  }
  if (
    value === "YELLOW" ||
    value.startsWith("YELLOW") ||
    value.includes("FOUNDER VERIFICATION") ||
    value.includes("FOUNDER CONSOLE") ||
    value.includes("NOT RUNTIME") ||
    value.includes("NOT APPLICABLE")
  ) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row74CredentialRecoveryReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow74ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row74-credential-recovery-review"
    >
      <div className="mx-auto w-full max-w-[96rem]">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 74 CREDENTIAL AND ACCOUNT RECOVERY
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          {model.closedOut
            ? "Row 74 is Complete. Founder accepted 2026-08-25. Stripe MFA is PASS — Founder verified. Cloudflare MFA is INACTIVE — Founder risk accepted; that exception is not a technical MFA PASS. This page is the inspection surface for account recovery — not a second Row 20 access matrix and not a second Row 72 vendor register. Passwords, MFA secrets, backup codes, recovery phone numbers, and API keys are not shown."
            : "Founder Acceptance Review. Row 74 is not marked Complete. This page is the inspection surface for account recovery — not a second Row 20 access matrix and not a second Row 72 vendor register. Passwords, MFA secrets, backup codes, recovery phone numbers, and API keys are not shown. Reply CONFIRMED or name the failed item. Do not send secret values."}
        </p>
        <p
          className={`mt-4 font-sans text-sm font-medium ${model.closedOut || model.readyForFounderAcceptance ? "text-emerald-800" : "text-red-800"}`}
        >
          {model.finalStatus}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row74-scorecard">
          <h2
            id="row74-scorecard"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Scorecard
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Authoritative Recovery Register:{" "}
              <span className={tone(model.scorecard.authoritativeRecoveryRegister)}>
                {model.scorecard.authoritativeRecoveryRegister}
              </span>
            </li>
            <li>
              All Launch-Critical Accounts Included:{" "}
              <span className={tone(model.scorecard.allLaunchCriticalAccountsIncluded)}>
                {model.scorecard.allLaunchCriticalAccountsIncluded}
              </span>
            </li>
            <li>
              Human Account Owners Documented:{" "}
              {model.scorecard.humanAccountOwnersDocumented}
            </li>
            <li>
              Operational Owners Documented:{" "}
              {model.scorecard.operationalOwnersDocumented}
            </li>
            <li>
              MFA Coverage:{" "}
              <span className={tone(model.scorecard.mfaCoverage)}>
                {model.scorecard.mfaCoverage}
              </span>
            </li>
            <li>
              Recovery Email Coverage:{" "}
              <span className={tone(model.scorecard.recoveryEmailCoverage)}>
                {model.scorecard.recoveryEmailCoverage}
              </span>
            </li>
            <li>
              Recovery Phone Coverage:{" "}
              <span className={tone(model.scorecard.recoveryPhoneCoverage)}>
                {model.scorecard.recoveryPhoneCoverage}
              </span>
            </li>
            <li>Backup Recovery Methods: {model.scorecard.backupRecoveryMethods}</li>
            <li>
              Backup Administrative Access Where Appropriate:{" "}
              {model.scorecard.backupAdministrativeAccessWhereAppropriate}
            </li>
            <li>Recovery Procedures: {model.scorecard.recoveryProcedures}</li>
            <li>
              Stripe MFA:{" "}
              <span className={tone(model.scorecard.stripeMfa)}>
                {model.scorecard.stripeMfa}
              </span>
            </li>
            <li>
              Cloudflare MFA:{" "}
              <span className={tone(model.scorecard.cloudflareMfa)}>
                {model.scorecard.cloudflareMfa}
              </span>
            </li>
            <li>
              Raw Passwords Stored:{" "}
              <span className={tone(model.scorecard.rawPasswordsStored)}>
                {model.scorecard.rawPasswordsStored}
              </span>
            </li>
            <li>
              Secrets/Backup Codes Stored:{" "}
              <span className={tone(model.scorecard.secretsBackupCodesStored)}>
                {model.scorecard.secretsBackupCodesStored}
              </span>
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row74-workspace">
          <h2
            id="row74-workspace"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Google Workspace pressure test
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Primary Human Owner: {model.workspaceHighPriority.primaryHumanOwner}</li>
            <li>Super Admin Exists: {model.workspaceHighPriority.superAdminExists}</li>
            <li>
              Super Admin MFA:{" "}
              <span className={tone(model.workspaceHighPriority.superAdminMfa)}>
                {model.workspaceHighPriority.superAdminMfa}
              </span>
            </li>
            <li>
              Recovery Email Configured:{" "}
              <span className={tone(model.workspaceHighPriority.recoveryEmailConfigured)}>
                {model.workspaceHighPriority.recoveryEmailConfigured}
              </span>
            </li>
            <li>
              Recovery Phone Configured:{" "}
              <span className={tone(model.workspaceHighPriority.recoveryPhoneConfigured)}>
                {model.workspaceHighPriority.recoveryPhoneConfigured}
              </span>
            </li>
            <li>
              Backup Administrative Recovery:{" "}
              <span className={tone(model.workspaceHighPriority.backupAdministrativeRecovery)}>
                {model.workspaceHighPriority.backupAdministrativeRecovery}
              </span>
            </li>
            <li>
              Account Recovery Procedure:{" "}
              {model.workspaceHighPriority.accountRecoveryProcedure}
            </li>
            <li>
              Single-Person Lockout Risk:{" "}
              <span className={tone(model.workspaceHighPriority.singlePersonLockoutRisk)}>
                {model.workspaceHighPriority.singlePersonLockoutRisk}
              </span>
            </li>
            <li>
              Independent Google Workspace Recovery:{" "}
              <span className={tone(model.lockout.independentGoogleWorkspaceRecovery)}>
                {model.lockout.independentGoogleWorkspaceRecovery}
              </span>
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row74-accounts">
          <h2
            id="row74-accounts"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Account results
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Google Workspace: {model.accountResults.googleWorkspace}</li>
            <li>Stripe: {model.accountResults.stripe}</li>
            <li>Vercel: {model.accountResults.vercel}</li>
            <li>Supabase: {model.accountResults.supabase}</li>
            <li>Domain Registrar: {model.accountResults.domainRegistrar}</li>
            <li>DNS Provider: {model.accountResults.dnsProvider}</li>
            <li>Instagram @backhalfco: {model.accountResults.instagram}</li>
            <li>TikTok @backhalfco: {model.accountResults.tiktok}</li>
            <li>OpenAI / Production AI: {model.accountResults.openai}</li>
            <li>GitHub: {model.accountResults.github}</li>
            <li>Google Cloud/OAuth: {model.accountResults.googleCloudOauth}</li>
            <li>HeyGen: {model.accountResults.heygen}</li>
            <li>ElevenLabs: {model.accountResults.elevenlabs}</li>
            <li>Cursor: {model.accountResults.cursor}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row74-matrix">
          <h2
            id="row74-matrix"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Recovery register
          </h2>
          <div className="overflow-x-auto rounded-sm border border-bh-purple/15 bg-white/70">
            <table className="min-w-[80rem] border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-bh-purple/15 bg-bh-cream/80">
                  {[
                    "Service",
                    "Human Owner",
                    "Operational Owner",
                    "MFA",
                    "Recovery",
                    "Backup Access",
                    "Recovery Procedure",
                    "Single-Person Lockout",
                    "Circular Recovery",
                    "Status",
                    "Founder Action",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.accounts.map((row) => {
                  const edge = model.register.recoveryDependencyMap.edges.find(
                    (item) => item.from === row.id,
                  );
                  const circularLabel =
                    row.id === "google_workspace"
                      ? "HUB — independent Google Account recovery PASS (Row 77)"
                      : row.id === "instagram" || row.id === "tiktok"
                        ? "MITIGATED — named mailbox is Workspace; independent recovery PASS"
                        : row.id === "elevenlabs"
                          ? "NOT APPLICABLE"
                          : edge?.to === "cloudflare"
                            ? "CLOUDFLARE ACCOUNT (registrar + DNS)"
                            : edge?.to === "google_workspace"
                              ? "LIKELY — recovery via Workspace hub (independent recovery PASS)"
                              : edge?.to === "unknown"
                                ? "INDEPENDENT OF WORKSPACE MAP"
                                : "See dependency map";
                  return (
                    <tr key={row.id} className="border-b border-bh-purple/10 align-top">
                      <td className="px-3 py-3 font-medium">{row.service}</td>
                      <td className="px-3 py-3">{row.humanAccountOwner}</td>
                      <td className="px-3 py-3">{row.operationalOwner}</td>
                      <td className={`px-3 py-3 ${tone(row.mfaStatus)}`}>{row.mfaStatus}</td>
                      <td className="px-3 py-3">
                        Email: {row.recoveryEmailStatus}. Phone: {row.recoveryPhoneStatus}. Codes:{" "}
                        {row.backupCodesStatus}.
                      </td>
                      <td className="px-3 py-3">{row.backupAdminRecoveryPerson}</td>
                      <td className="px-3 py-3">
                        Detect: {row.accountRecoveryProcedure.detect} Initiate:{" "}
                        {row.accountRecoveryProcedure.initiate} Method:{" "}
                        {row.accountRecoveryProcedure.method}
                      </td>
                      <td className="px-3 py-3">{row.singlePersonLockoutRisk}</td>
                      <td className="px-3 py-3">{circularLabel}</td>
                      <td className={`px-3 py-3 ${tone(row.status)}`}>{row.status}</td>
                      <td className="px-3 py-3">{row.founderVerificationRequired}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12" aria-labelledby="row74-map">
          <h2
            id="row74-map"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Recovery dependency map
          </h2>
          <p className="mb-3 font-sans text-sm">
            Hub: {model.register.recoveryDependencyMap.hub}. Independent hub recovery:{" "}
            {model.register.recoveryDependencyMap.independentHubRecovery}
          </p>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.register.recoveryDependencyMap.edges.map((edge) => (
              <li key={`${edge.from}-${edge.to}`}>
                {edge.from} → {edge.to}: {edge.via}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row74-lockout">
          <h2
            id="row74-lockout"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Lockout / circular recovery
          </h2>
          <p className="mb-2 font-sans text-sm font-medium">Single-person lockout risks found</p>
          <ul className="mb-4 list-disc space-y-2 pl-5 font-sans text-sm">
            {model.lockout.found.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mb-2 font-sans text-sm font-medium">Formally mitigated</p>
          <ul className="mb-4 list-disc space-y-2 pl-5 font-sans text-sm">
            {model.lockout.resolved.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mb-2 font-sans text-sm font-medium">Unresolved</p>
          <ul className="mb-4 list-disc space-y-2 pl-5 font-sans text-sm">
            {model.lockout.unresolved.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mb-2 font-sans text-sm font-medium">Circular recovery dependencies</p>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.lockout.circular.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row74-defects">
          <h2
            id="row74-defects"
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

        <section className="mb-12" aria-labelledby="row74-founder">
          <h2
            id="row74-founder"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            {model.closedOut
              ? "Documented YELLOW vendor MFA — not Row 74 closeout blockers"
              : "Founder verification — reply CONFIRMED or name the failed item"}
          </h2>
          {model.closedOut ? (
            <p className="mb-3 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
              Stripe MFA and Cloudflare MFA are closed. Remaining YELLOW vendor
              MFA items stay documented coverage and were not converted to PASS.
            </p>
          ) : null}
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.founderVerification.length === 0 ? (
              <li>NONE</li>
            ) : (
              model.founderVerification.map((item) => (
                <li key={item}>{item}</li>
              ))
            )}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row74-actions">
          <h2
            id="row74-actions"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            {model.closedOut ? "Founder closeout record" : "Founder actions required"}
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.founderActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row74-launch-blockers">
          <h2
            id="row74-launch-blockers"
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

        <section className="mb-12" aria-labelledby="row74-blockers">
          <h2
            id="row74-blockers"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Remaining Row 74 blockers
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.remainingRow74Blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row74-regression">
          <h2
            id="row74-regression"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Regression
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Website/Admin: {model.regression.websiteAdmin}</li>
            <li>Registration/Login: {model.regression.registrationLogin}</li>
            <li>Email: {model.regression.email}</li>
            <li>Support: {model.regression.support}</li>
            <li>Payments: {model.regression.payments}</li>
            <li>Database: {model.regression.database}</li>
            <li>Hosting: {model.regression.hosting}</li>
            <li>Lumina/AI: {model.regression.luminaAi}</li>
            <li>Source Control: {model.regression.sourceControl}</li>
            <li>Monitoring: {model.regression.monitoring}</li>
            <li>Security/Privacy: {model.regression.securityPrivacy}</li>
            <li>Runtime/Console: {model.regression.runtimeConsole}</li>
            <li>Overall Regression: {model.regression.overall}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
