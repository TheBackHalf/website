import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow79ReviewModel } from "@/lib/fab-5/row79-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 79 Founder acceptance review only.
 * URL: /_internal/row79-launch-day-social-campaign-review
 * Localhost-only. Displays Founder acceptance from row-79-status.json.
 * Does not rebuild, rewrite, or regenerate the approved campaign.
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
    value === "PASS" ||
    value === "YES" ||
    value === "NO" ||
    value === "NONE" ||
    value === "100%" ||
    value === "Complete" ||
    value === "ROW 79 — COMPLETE"
  ) {
    return "text-emerald-800";
  }
  if (value === "FAIL") return "text-red-800";
  if (value.includes("EXTERNAL DEPENDENCY") || value.includes("NOT YET COMPLETE")) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row79LaunchDaySocialCampaignReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow79ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row79-launch-day-social-campaign-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 79 LAUNCH-DAY SOCIAL CAMPAIGN
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance recorded. Row 79 is Complete. The Founder-approved
          August 28–31 Instagram and TikTok campaign was not rebuilt, rewritten,
          or regenerated. LinkedIn is not required. X was not added. Row 75
          canonical DNS/SSL remains independently tracked.
        </p>
        <p className={`mt-4 font-sans text-sm font-medium ${tone(model.finalStatus)}`}>
          {model.finalStatus}
        </p>
        <p className="mt-2 font-sans text-sm">
          Founder Acceptance Recorded:{" "}
          <span className={tone(model.founderAcceptanceRecorded)}>
            {model.founderAcceptanceRecorded}
          </span>
        </p>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Launch Readiness: {model.recordedLaunchReadiness}
        </p>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Archive: {model.authoritativeArchive}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row79-closure">
          <h2
            id="row79-closure"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Closure record
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Completion:{" "}
              <span className={tone(model.closure.completion)}>{model.closure.completion}</span>
            </li>
            <li>
              Status:{" "}
              <span className={tone(model.closure.status)}>{model.closure.status}</span>
            </li>
            <li>
              Founder Acceptance:{" "}
              <span className={tone(model.closure.founderAcceptance)}>
                {model.closure.founderAcceptance}
              </span>
            </li>
            <li>Campaign Changed During Closure: {model.closure.campaignChangedDuringClosure}</li>
            <li>Assets Changed During Closure: {model.closure.assetsChangedDuringClosure}</li>
            <li>Copy Changed During Closure: {model.closure.copyChangedDuringClosure}</li>
            <li>Launch Roadmap Changed: {model.closure.launchRoadmapChanged}</li>
            <li>Founder Notes Changed: {model.closure.founderNotesChanged}</li>
            <li>Row 75 Changed: {model.closure.row75Changed}</li>
            <li>Other Rows Changed: {model.closure.otherRowsChanged}</li>
            <li>Unexpected Changes: {model.closure.unexpectedChanges}</li>
            <li>Existing Approved Campaign Preserved: {model.closure.existingApprovedCampaignPreserved}</li>
            <li>Approved CTA Preserved: {model.closure.approvedCtaPreserved}</li>
            <li>
              Approved Enrollment Destination Preserved:{" "}
              {model.closure.approvedEnrollmentDestinationPreserved}
            </li>
            <li>
              Row 75 Dependency Preserved Separately:{" "}
              {model.closure.row75DependencyPreservedSeparately}
            </li>
          </ul>
        </section>

        <section className="mt-10 mb-12" aria-labelledby="row79-existing">
          <h2
            id="row79-existing"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Existing campaign
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Located:{" "}
              <span className={tone(model.existingCampaign.located)}>
                {model.existingCampaign.located}
              </span>
            </li>
            <li>Reused: {model.existingCampaign.reused}</li>
            <li>Rebuilt: {model.existingCampaign.rebuilt}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row79-platforms">
          <h2
            id="row79-platforms"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Platforms
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Instagram @backhalfco: {model.platforms.instagram}</li>
            <li>TikTok @backhalfco: {model.platforms.tiktok}</li>
            <li>LinkedIn Required: {model.platforms.linkedinRequired}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row79-requirements">
          <h2
            id="row79-requirements"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Row 79 content requirements
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Launch Announcement: {model.requirements.launchAnnouncement}</li>
            <li>Founder Message: {model.requirements.founderMessage}</li>
            <li>Enrollment CTA: {model.requirements.enrollmentCta}</li>
            <li>Founding Architect Offer: {model.requirements.foundingArchitectOffer}</li>
            <li>Product Explanation: {model.requirements.productExplanation}</li>
            <li>Lumina/Journey Introduction: {model.requirements.luminaJourney}</li>
            <li>Follow-Up Posts: {model.requirements.followUpPosts}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row79-cta">
          <h2
            id="row79-cta"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            CTA validation
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Approved CTA: {model.cta.approvedCta}</li>
            <li>Approved Destination: {model.cta.approvedDestination}</li>
            <li>
              Every Enrollment CTA Correct:{" "}
              <span className={tone(model.cta.everyEnrollmentCtaCorrect)}>
                {model.cta.everyEnrollmentCtaCorrect}
              </span>
            </li>
            <li>
              Live Canonical Reachability:{" "}
              <span className={tone(String(model.cta.liveCanonicalReachability))}>
                {model.cta.liveCanonicalReachability}
              </span>
            </li>
            <li>Incorrect/Dead CTA References: {model.cta.incorrectDead}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row79-assets">
          <h2
            id="row79-assets"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Assets and reconciliation
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Images: {model.assets.images}</li>
            <li>Videos: {model.assets.videos}</li>
            <li>Copy Records: {model.assets.copyRecords}</li>
            <li>Broken References: {model.assets.brokenReferences}</li>
            <li>August 31 Launch: {model.reconciliation.august31}</li>
            <li>Community October 25: {model.reconciliation.communityOctober25}</li>
            <li>First Six Months Community Benefit: {model.reconciliation.firstSixMonths}</li>
            <li>Obsolete Active References: {model.reconciliation.obsoleteActive}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row79-regression">
          <h2
            id="row79-regression"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Regression
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Social Channel Setup: {model.regression.socialChannelSetup}</li>
            <li>Social Launch Campaign: {model.regression.socialLaunchCampaign}</li>
            <li>Row 77 Governance: {model.regression.row77}</li>
            <li>Social Engagement Protocol: {model.regression.engagementProtocol}</li>
            <li>KPI Dashboard: {model.regression.kpiDashboard}</li>
            <li>Launch Communications: {model.regression.launchCommunications}</li>
            <li>Launch-Day Runbook: {model.regression.launchDayRunbook}</li>
            <li>Brand: {model.regression.brand}</li>
            <li>Registration CTA: {model.regression.registrationCta}</li>
            <li>Overall Regression: {model.regression.overall}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row79-actions">
          <h2
            id="row79-actions"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder actions
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.founderActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
