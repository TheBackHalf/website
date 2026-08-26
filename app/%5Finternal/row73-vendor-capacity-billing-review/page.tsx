import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow73ReviewModel } from "@/lib/fab-5/row73-review";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * TEMPORARY Row 73 Founder acceptance review only.
 * URL: /_internal/row73-vendor-capacity-billing-review
 * Localhost-only. Does not mark Row 73 complete.
 * Never displays card numbers, bank accounts, passwords, API keys, or secret values.
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
    value === "GREEN" ||
    value === "NO" ||
    value === "NONE" ||
    value.startsWith("NONE")
  ) {
    return "text-emerald-800";
  }
  if (value === "FAIL" || value === "RED" || value === "YES" || value === "INCIDENT") {
    return "text-red-800";
  }
  if (
    value === "YELLOW" ||
    value.includes("FOUNDER VERIFICATION") ||
    value === "DEGRADED"
  ) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row73VendorCapacityBillingReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = await getRow73ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row73-vendor-capacity-billing-review"
    >
      <div className="mx-auto w-full max-w-[96rem]">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 73 VENDOR CAPACITY AND BILLING
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance Review. Row 73 is not marked Complete. This page
          verifies production plan, billing, payment-method, quota, and service
          status for every Row 72 launch-critical vendor. Secrets, card numbers,
          bank details, API keys, and app passwords are not shown. Row 74 remains
          recovery. Row 75 remains domain/DNS/SSL.
        </p>
        <p
          className={`mt-4 font-sans text-sm font-medium ${model.readyForFounderAcceptance ? "text-emerald-800" : "text-red-800"}`}
        >
          {model.finalStatus}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row73-scorecard">
          <h2
            id="row73-scorecard"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Scorecard
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Overall Vendor Capacity:{" "}
              <span className={tone(model.overallVendorCapacity)}>
                {model.overallVendorCapacity}
              </span>
            </li>
            <li>
              Overall Billing Continuity:{" "}
              <span className={tone(model.overallBillingContinuity)}>
                {model.overallBillingContinuity}
              </span>
            </li>
            <li>
              Known Launch-Stopping Vendor Condition:{" "}
              <span className={tone(model.knownLaunchStoppingVendorCondition)}>
                {model.knownLaunchStoppingVendorCondition}
              </span>
            </li>
            <li>
              Registration:{" "}
              <span className={tone(model.launchFunctions.registration)}>
                {model.launchFunctions.registration}
              </span>
            </li>
            <li>
              Lumina:{" "}
              <span className={tone(model.launchFunctions.lumina)}>
                {model.launchFunctions.lumina}
              </span>
            </li>
            <li>
              Email:{" "}
              <span className={tone(model.launchFunctions.email)}>
                {model.launchFunctions.email}
              </span>
            </li>
            <li>
              Hosting:{" "}
              <span className={tone(model.launchFunctions.hosting)}>
                {model.launchFunctions.hosting}
              </span>
            </li>
            <li>
              Database:{" "}
              <span className={tone(model.launchFunctions.database)}>
                {model.launchFunctions.database}
              </span>
            </li>
            <li>
              Payments:{" "}
              <span className={tone(model.launchFunctions.payments)}>
                {model.launchFunctions.payments}
              </span>
            </li>
            <li>
              Founder Media:{" "}
              <span className={tone(model.launchFunctions.founderMedia)}>
                {model.launchFunctions.founderMedia}
              </span>
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row73-matrix">
          <h2
            id="row73-matrix"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Launch-readiness matrix
          </h2>
          <div className="overflow-x-auto rounded-sm border border-bh-purple/15 bg-white/70">
            <table className="min-w-[72rem] border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-bh-purple/15 bg-bh-cream/80">
                  {[
                    "Vendor",
                    "Launch Function",
                    "Plan",
                    "Billing",
                    "Payment Method",
                    "Usage/Quota",
                    "Service Status",
                    "Capacity Rating",
                    "Launch Risk",
                    "Founder Action Required",
                  ].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.vendorResults.map((row) => (
                  <tr key={row.vendorId} className="border-b border-bh-purple/10 align-top">
                    <td className="px-3 py-3 font-medium">{row.vendor}</td>
                    <td className="px-3 py-3">{row.launchFunction}</td>
                    <td className="px-3 py-3">{row.productionPlan}</td>
                    <td className={`px-3 py-3 ${tone(row.billing)}`}>{row.billing}</td>
                    <td className={`px-3 py-3 ${tone(row.paymentMethod)}`}>
                      {row.paymentMethod}
                    </td>
                    <td className="px-3 py-3">{row.usageQuota}</td>
                    <td className={`px-3 py-3 ${tone(row.serviceStatus)}`}>
                      {row.serviceStatus}
                    </td>
                    <td className={`px-3 py-3 font-medium ${tone(row.capacityRating)}`}>
                      {row.capacityRating}
                    </td>
                    <td className="px-3 py-3">{row.knownLaunchRisk}</td>
                    <td className="px-3 py-3">{row.founderVerificationRequired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12" aria-labelledby="row73-stripe">
          <h2
            id="row73-stripe"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Stripe live readiness
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Live Account Activated:{" "}
              <span className={tone(model.stripeLive.liveAccountActivated)}>
                {model.stripeLive.liveAccountActivated}
              </span>
            </li>
            <li>
              Live Payments Enabled:{" "}
              <span className={tone(model.stripeLive.livePaymentsEnabled)}>
                {model.stripeLive.livePaymentsEnabled}
              </span>
            </li>
            <li>
              Payout Destination Configured:{" "}
              <span className={tone(model.stripeLive.payoutDestinationConfigured)}>
                {model.stripeLive.payoutDestinationConfigured}
              </span>
            </li>
            <li>
              Production Integration:{" "}
              <span className={tone(model.stripeLive.productionIntegration)}>
                {model.stripeLive.productionIntegration}
              </span>
            </li>
            <li>
              Production Webhooks:{" "}
              <span className={tone(model.stripeLive.productionWebhooks)}>
                {model.stripeLive.productionWebhooks}
              </span>
            </li>
            <li>Known Restrictions: {model.stripeLive.knownRestrictions}</li>
            <li>No-refund policy: preserved. No charge, refund, or payout was initiated.</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row73-media">
          <h2
            id="row73-media"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder media
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              HeyGen Runtime Required August 31:{" "}
              {model.founderMediaDetail.heygenRuntimeRequiredAugust31}
            </li>
            <li>
              ElevenLabs Runtime Required August 31:{" "}
              {model.founderMediaDetail.elevenLabsRuntimeRequiredAugust31}
            </li>
            <li>
              Approved Rendered Media Preserved:{" "}
              <span className={tone(model.founderMediaDetail.approvedRenderedMediaPreserved)}>
                {model.founderMediaDetail.approvedRenderedMediaPreserved}
              </span>
            </li>
            <li>mp4 count in public/videos: {model.founderMediaDetail.mp4Count}</li>
            <li>Founder Media Launch Risk: {model.founderMediaDetail.founderMediaLaunchRisk}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row73-capacity">
          <h2
            id="row73-capacity"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Capacity ratings
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Vendors GREEN:{" "}
              <span className="text-emerald-800">{model.capacity.green.join("; ")}</span>
            </li>
            <li>
              Vendors YELLOW:{" "}
              <span className="text-amber-900">{model.capacity.yellow.join("; ")}</span>
            </li>
            <li>
              Vendors RED:{" "}
              <span className="text-red-800">{model.capacity.red.join("; ")}</span>
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row73-defects">
          <h2
            id="row73-defects"
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

        <section className="mb-12" aria-labelledby="row73-founder">
          <h2
            id="row73-founder"
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

        <section className="mb-12" aria-labelledby="row73-launch-blockers">
          <h2
            id="row73-launch-blockers"
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

        <section className="mb-12" aria-labelledby="row73-blockers">
          <h2
            id="row73-blockers"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Remaining Row 73 blockers
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.remainingRow73Blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row73-regression">
          <h2
            id="row73-regression"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Regression
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Registration: {model.regression.registration}</li>
            <li>Login/Auth: {model.regression.loginAuth}</li>
            <li>Lumina: {model.regression.lumina}</li>
            <li>Email/Support: {model.regression.emailSupport}</li>
            <li>Hosting: {model.regression.hosting}</li>
            <li>Database: {model.regression.database}</li>
            <li>Payments: {model.regression.payments}</li>
            <li>Founder Media: {model.regression.founderMedia}</li>
            <li>Row 84: {model.regression.row84}</li>
            <li>Row 150: {model.regression.row150}</li>
            <li>Row 151: {model.regression.row151}</li>
            <li>Row 153: {model.regression.row153}</li>
            <li>Security/Privacy: {model.regression.securityPrivacy}</li>
            <li>Runtime/Console: {model.regression.runtimeConsole}</li>
            <li>Overall Regression: {model.regression.overall}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
