import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow77ReviewModel } from "@/lib/fab-5/row77-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 77 Founder acceptance / action review only.
 * URL: /_internal/row77-social-channel-governance-review
 * Localhost-only. Does not mark Row 77 complete.
 * Never displays passwords, MFA secrets, backup codes, recovery phone numbers, or API keys.
 * Does not log into Instagram or TikTok. Does not live-publish.
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
  if (value === "PASS" || value === "NO" || value === "NONE" || value.startsWith("NONE")) {
    return "text-emerald-800";
  }
  if (value === "FAIL" || value.startsWith("FAIL") || value === "YES") return "text-red-800";
  if (
    value.includes("FOUNDER VERIFICATION") ||
    value.includes("FOUNDER ACTION") ||
    value.includes("IMPLEMENTED")
  ) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row77SocialChannelGovernanceReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow77ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row77-social-channel-governance-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 77 LAUNCH SOCIAL CHANNEL GOVERNANCE
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          {model.rowMarkedComplete
            ? "Founder Acceptance recorded. Row 77 is Complete. Option B is preserved. Nia Prism remains Social Operating Owner. Native Instagram/TikTok schedule load remains a Row 82 execution dependency and does not prevent completion of this governance row. Secrets are not shown."
            : "Founder review. Row 77 is not marked Complete. This page inspects repository governance and the Option B publishing queue only. It does not log into Instagram or TikTok, does not live-publish, and does not show secrets. Do not repeat MFA or Workspace recovery."}
        </p>
        <p className={`mt-4 font-sans text-sm font-medium ${tone(model.finalStatus)}`}>
          {model.finalStatus}
        </p>
        <p className="mt-2 font-sans text-sm">
          Mechanical documentation:{" "}
          <span className={tone(model.mechanicalDocumentation)}>
            {model.mechanicalDocumentation}
          </span>
        </p>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Artifact: {model.governanceArtifact}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row77-decision">
          <h2
            id="row77-decision"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder decision and current state
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            <li>
              FOUNDER DECISION: {model.founderDecision}
            </li>
            <li>
              SOCIAL OPERATING OWNER: {model.socialOperatingOwner}
            </li>
            <li>
              Instagram MFA:{" "}
              <span className={tone(model.instagramMfa)}>{model.instagramMfa}</span>
            </li>
            <li>
              TikTok MFA:{" "}
              <span className={tone(model.tiktokMfa)}>{model.tiktokMfa}</span>
            </li>
            <li>
              Workspace Independent Recovery:{" "}
              <span className={tone(model.workspaceIndependentRecovery)}>
                {model.workspaceIndependentRecovery}
              </span>
            </li>
            <li>
              Instagram Publishing Continuity:{" "}
              <span className={tone(model.instagramPublishingContinuity)}>
                {model.instagramPublishingContinuity}
              </span>
            </li>
            <li>
              TikTok Publishing Continuity:{" "}
              <span className={tone(model.tiktokPublishingContinuity)}>
                {model.tiktokPublishingContinuity}
              </span>
            </li>
            <li>
              Founder Required at Posting Time:{" "}
              <span className={tone(model.founderRequiredAtPostingTime)}>
                {model.founderRequiredAtPostingTime}
              </span>
            </li>
            <li>
              Scenario H:{" "}
              <span className={tone(model.scenarioH)}>{model.scenarioH}</span>
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row77-mechanism">
          <h2
            id="row77-mechanism"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Publishing mechanism
          </h2>
          <p className="mb-2 font-sans text-sm">
            Existing Mechanism Found: {model.publishingMechanism.existingMechanismFound}
          </p>
          <p className="mb-2 font-sans text-sm">
            Mechanism: {model.publishingMechanism.mechanism}
          </p>
          <p className="mb-2 font-sans text-sm">
            New Vendor Required: {model.publishingMechanism.newVendorRequired}
          </p>
          <p className="mb-2 font-sans text-sm">
            Nia Social Update Execution:{" "}
            <span className={tone(model.publishingMechanism.niaSocialUpdateExecution)}>
              {model.publishingMechanism.niaSocialUpdateExecution}
            </span>
          </p>
          <p className="mb-2 font-sans text-sm">
            Logging / Failure Visibility:{" "}
            <span className={tone(model.publishingMechanism.loggingFailureVisibility)}>
              {model.publishingMechanism.loggingFailureVisibility}
            </span>
          </p>
          <p className="mb-2 font-sans text-sm">
            Pause / Cancel Capability:{" "}
            <span className={tone(model.publishingMechanism.pauseCancelCapability)}>
              {model.publishingMechanism.pauseCancelCapability}
            </span>
          </p>
          <p className="mb-4 font-sans text-sm">
            Live publish during this row: {model.publishingMechanism.livePublishEnabled}{" "}
            (attempted: {model.publishingMechanism.livePublishAttempted})
          </p>
          <ul className="space-y-1 font-sans text-sm">
            {model.publishingMechanism.jobs.map((job) => (
              <li key={job.id}>
                {job.id} · {job.platform} · {job.publishAtEt} · {job.status} · paused{" "}
                {job.paused}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row77-ownership">
          <h2
            id="row77-ownership"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Account ownership
          </h2>
          <p className="mb-3 font-sans text-sm">Instagram: {model.accountOwnership.instagram}</p>
          <p className="font-sans text-sm">TikTok: {model.accountOwnership.tiktok}</p>
        </section>

        <section className="mb-12" aria-labelledby="row77-admin">
          <h2
            id="row77-admin"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Administrator / backup access
          </h2>
          <p className="mb-3 font-sans text-sm">
            Instagram: {model.administratorBackupAccess.instagram}
          </p>
          <p className="font-sans text-sm">TikTok: {model.administratorBackupAccess.tiktok}</p>
        </section>

        <section className="mb-12" aria-labelledby="row77-recovery">
          <h2
            id="row77-recovery"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Credential and recovery
          </h2>
          <p className="font-sans text-sm">{model.credentialRecovery}</p>
        </section>

        <section className="mb-12" aria-labelledby="row77-mfa">
          <h2
            id="row77-mfa"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            MFA
          </h2>
          <p className="mb-2 font-sans text-sm">{model.mfa.requirement}</p>
          <p className={`font-sans text-sm ${tone(model.mfa.instagram)}`}>
            Instagram: {model.mfa.instagram}
          </p>
          <p className={`font-sans text-sm ${tone(model.mfa.tiktok)}`}>
            TikTok: {model.mfa.tiktok}
          </p>
          <p className={`font-sans text-sm ${tone(model.mfa.workspaceIndependentRecovery)}`}>
            Workspace Independent Recovery: {model.mfa.workspaceIndependentRecovery}
          </p>
        </section>

        <section className="mb-12" aria-labelledby="row77-posting">
          <h2
            id="row77-posting"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Posting authority
          </h2>
          <p className="font-sans text-sm">{model.postingAuthority}</p>
        </section>

        <section className="mb-12" aria-labelledby="row77-engagement">
          <h2
            id="row77-engagement"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Comments / DMs
          </h2>
          <p className="font-sans text-sm">{model.commentsDms}</p>
        </section>

        <section className="mb-12" aria-labelledby="row77-brand">
          <h2
            id="row77-brand"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Brand standards and approval thresholds
          </h2>
          <p className="mb-3 font-sans text-sm">{model.brandStandards}</p>
          <p className="font-sans text-sm">{model.approvalThresholds}</p>
        </section>

        <section className="mb-12" aria-labelledby="row77-emergency">
          <h2
            id="row77-emergency"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Emergency access
          </h2>
          <p className="font-sans text-sm">{model.emergencyAccess}</p>
        </section>

        <section className="mb-12" aria-labelledby="row77-spof">
          <h2
            id="row77-spof"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder sole-point-of-failure test
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            <li>
              A: <span className={tone(model.solePointOfFailureTest.A)}>{model.solePointOfFailureTest.A}</span>
            </li>
            <li>
              B: <span className={tone(model.solePointOfFailureTest.B)}>{model.solePointOfFailureTest.B}</span>
            </li>
            <li>
              C: <span className={tone(model.solePointOfFailureTest.C)}>{model.solePointOfFailureTest.C}</span>
            </li>
            <li>
              D: <span className={tone(model.solePointOfFailureTest.D)}>{model.solePointOfFailureTest.D}</span>
            </li>
            <li>
              E: <span className={tone(model.solePointOfFailureTest.E)}>{model.solePointOfFailureTest.E}</span>
            </li>
            <li>
              F: <span className={tone(model.solePointOfFailureTest.F)}>{model.solePointOfFailureTest.F}</span>
            </li>
            <li>
              G: <span className={tone(model.solePointOfFailureTest.G)}>{model.solePointOfFailureTest.G}</span>
            </li>
            <li>
              H: <span className={tone(model.solePointOfFailureTest.H)}>{model.solePointOfFailureTest.H}</span>
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row77-conflicts">
          <h2
            id="row77-conflicts"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Defects corrected
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.conflictsFoundAndCorrected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row77-founder">
          <h2
            id="row77-founder"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Remaining Founder verification — reply CONFIRMED or name the failed item
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.founderVerificationRequired.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row77-actions">
          <h2
            id="row77-actions"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder actions required
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.founderActionsRequired.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row77-blockers">
          <h2
            id="row77-blockers"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Actual blockers
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.actualBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row77-regression">
          <h2
            id="row77-regression"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Regression
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Row 20: <span className={tone(model.regression.row20)}>{model.regression.row20}</span>
            </li>
            <li>
              Row 74: <span className={tone(model.regression.row74)}>{model.regression.row74}</span>
            </li>
            <li>
              Row 76: <span className={tone(model.regression.row76)}>{model.regression.row76}</span>
            </li>
            <li>
              Row 81: <span className={tone(model.regression.row81)}>{model.regression.row81}</span>
            </li>
            <li>
              Row 83: <span className={tone(model.regression.row83)}>{model.regression.row83}</span>
            </li>
            <li>
              Row 202:{" "}
              <span className={tone(model.regression.row202)}>{model.regression.row202}</span>
            </li>
            <li>
              Instagram @backhalfco:{" "}
              <span className={tone(model.regression.instagram)}>{model.regression.instagram}</span>
            </li>
            <li>
              TikTok @backhalfco:{" "}
              <span className={tone(model.regression.tiktok)}>{model.regression.tiktok}</span>
            </li>
            <li>
              Brand: <span className={tone(model.regression.brand)}>{model.regression.brand}</span>
            </li>
            <li>
              Security/Privacy:{" "}
              <span className={tone(model.regression.securityPrivacy)}>
                {model.regression.securityPrivacy}
              </span>
            </li>
            <li>
              Runtime/Console:{" "}
              <span className={tone(model.regression.runtimeConsole)}>
                {model.regression.runtimeConsole}
              </span>
            </li>
            <li>
              Overall:{" "}
              <span className={tone(model.regression.overall)}>{model.regression.overall}</span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
