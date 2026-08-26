import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow82ReviewModel } from "@/lib/fab-5/row82-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 82 Founder acceptance experience.
 * URL: /_internal/row82-social-publishing-review
 * Localhost-only. Does not mark Complete. Does not live-publish.
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
  if (value === "PASS" || value === "CONNECTED" || value === "NONE" || value === "NO") {
    return "text-emerald-800";
  }
  if (value === "FAIL" || value.startsWith("FAIL") || value === "YES") return "text-red-800";
  if (
    value.includes("FOUNDER") ||
    value.includes("EXTERNAL DEPENDENCY") ||
    value.includes("IMPLEMENTED") ||
    value.includes("DEPENDENCY")
  ) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row82SocialPublishingReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow82ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row82-social-publishing-review"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 82 SOCIAL PUBLISHING AND SCHEDULING
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 font-sans text-sm uppercase tracking-[0.12em] text-bh-muted">
          LAUNCH FAMILY: {model.launchFamily}
        </p>
        <p className="mt-2 font-sans text-sm">CHANNELS: {model.channels}</p>
        <p className="mt-1 font-sans text-sm">TIME ZONE: {model.timezone}</p>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder review of the complete publishing/scheduling experience.
          Row 82 is not marked Complete. Founder acceptance is not recorded.
          Nothing on this page publishes to Instagram or TikTok. Reply after
          you have inspected every scheduled entry.
        </p>
        <p className={`mt-4 font-sans text-sm font-medium ${tone(model.finalStatus)}`}>
          {model.finalStatus}
        </p>
        <p className="mt-2 font-sans text-sm">
          Mechanical implementation:{" "}
          <span className={tone(model.mechanicalImplementation)}>
            {model.mechanicalImplementation}
          </span>
        </p>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Artifact: {model.governanceArtifact}
        </p>
        <p className="font-sans text-sm text-bh-muted">
          Manifest: {model.publishingManifest}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row82-flags">
          <h2
            id="row82-flags"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Flags
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            <li>
              Instagram connection:{" "}
              <span className={tone(model.instagram.connected)}>
                {model.instagram.connected}
              </span>
            </li>
            <li>
              TikTok connection:{" "}
              <span className={tone(model.tiktok.connected)}>
                {model.tiktok.connected}
              </span>
            </li>
            <li>
              Founder required at posting time:{" "}
              <span className={tone(model.workflow.founderRequiredAtPostingTime)}>
                {model.workflow.founderRequiredAtPostingTime}
              </span>
            </li>
            <li>
              Live canonical CTA reachability:{" "}
              <span className={tone(model.cta.liveCanonicalReachability)}>
                {model.cta.liveCanonicalReachability}
              </span>
            </li>
            <li>
              Row 77 Option B continuity:{" "}
              <span className={tone(model.optionB.continuity)}>
                {model.optionB.continuity}
              </span>
            </li>
            <li>New vendor required: {model.workflow.newVendorRequired}</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row82-schedule">
          <h2
            id="row82-schedule"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Visual schedule
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-bh-ink/15">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Time ET</th>
                  <th className="py-2 pr-3 font-medium">Platform</th>
                  <th className="py-2 pr-3 font-medium">Post</th>
                  <th className="py-2 pr-3 font-medium">Automation</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {model.entries.map((entry) => (
                  <tr key={`sched-${entry.id}`} className="border-b border-bh-ink/10">
                    <td className="py-2 pr-3">{entry.date}</td>
                    <td className="py-2 pr-3">{entry.timeEt}</td>
                    <td className="py-2 pr-3 uppercase">{entry.platform}</td>
                    <td className="py-2 pr-3">
                      {entry.id} — {entry.campaign}
                    </td>
                    <td className={`py-2 pr-3 ${tone(entry.automation)}`}>
                      {entry.automation}
                    </td>
                    <td className="py-2">{entry.schedulingStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {model.entries.map((entry) => (
          <section
            key={entry.id}
            className="mb-14 border-t border-bh-ink/15 pt-8"
            aria-labelledby={`post-${entry.id}`}
          >
            <h2
              id={`post-${entry.id}`}
              className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
            >
              {entry.date} · {entry.timeEt} · {entry.platform} · {entry.id}
            </h2>
            <p className="mb-4 font-display text-2xl font-medium">{entry.campaign}</p>
            <ul className="mb-6 space-y-1 font-sans text-sm">
              <li>DATE: {entry.date}</li>
              <li>TIME ET: {entry.timeEt}</li>
              <li>TIME ZONE: {entry.timezoneLabel}</li>
              <li>PLATFORM: {entry.platform}</li>
              <li>ACCOUNT: {entry.account}</li>
              <li>POST/CAMPAIGN: {entry.campaign}</li>
              <li>
                AUTOMATED / MANUAL:{" "}
                <span className={tone(entry.automation)}>{entry.automation}</span>
              </li>
              <li>SCHEDULING STATUS: {entry.schedulingStatus}</li>
              <li>
                PREVIEW STATUS:{" "}
                <span className={tone(entry.previewStatus)}>{entry.previewStatus}</span>
              </li>
              <li>OWNER: {entry.owner}</li>
              <li>CTA: {entry.cta}</li>
              <li>LINK: {entry.destination}</li>
              <li>FALLBACK: {entry.fallback}</li>
            </ul>
            <p className="mb-3 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
              Asset preview
            </p>
            <div className="mb-6 flex flex-wrap gap-3 bg-bh-dusk/90 p-4">
              {entry.assets.map((asset) =>
                asset.kind === "video" ? (
                  <video
                    key={asset.filename}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-auto w-[min(220px,100%)] bg-black"
                    src={asset.previewUrl}
                  >
                    {asset.filename}
                  </video>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={asset.filename}
                    src={asset.previewUrl}
                    alt={`${entry.id} ${asset.filename}`}
                    className="h-auto w-[min(220px,100%)] bg-black"
                  />
                ),
              )}
            </div>
            <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
              Caption preview
            </p>
            <pre className="mb-4 whitespace-pre-wrap font-sans text-sm font-light leading-relaxed">
              {entry.caption}
            </pre>
            <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
              On-screen copy
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm font-light leading-relaxed text-bh-muted">
              {entry.onScreenCopy}
            </pre>
          </section>
        ))}

        <section className="mb-12" aria-labelledby="row82-checklist">
          <h2
            id="row82-checklist"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder review checklist
          </h2>
          <p className="mb-4 font-sans text-sm text-bh-muted">
            Unchecked. Session-only. Not recorded as Founder acceptance.
          </p>
          <ul className="space-y-2 font-sans text-sm">
            {model.founderChecklist.map((item) => (
              <li key={item.label}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" defaultChecked={false} />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row82-actions">
          <h2
            id="row82-actions"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder actions required
          </h2>
          <ul className="mb-4 list-disc space-y-2 pl-5 font-sans text-sm">
            {model.founderActionsDoNot.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {model.founderActions.map((item) => (
            <div key={item.platform} className="mb-6 font-sans text-sm">
              <p className="font-medium">PLATFORM: {item.platform}</p>
              <p className="mt-1">ACTION: {item.action}</p>
              <p className="mt-1">WHY: {item.why}</p>
              <p className="mt-1">EXPECTED RESULT: {item.expectedResult}</p>
            </div>
          ))}
        </section>

        <section className="mb-12" aria-labelledby="row82-optionb">
          <h2
            id="row82-optionb"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Row 77 Option B continuity evidence
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Instagram can publish without Founder at posting time:{" "}
              <span className={tone(model.optionB.instagramWithoutFounder)}>
                {model.optionB.instagramWithoutFounder}
              </span>
            </li>
            <li>
              TikTok can publish without Founder at posting time:{" "}
              <span className={tone(model.optionB.tiktokWithoutFounder)}>
                {model.optionB.tiktokWithoutFounder}
              </span>
            </li>
            <li>
              Nia publishing responsibility executable:{" "}
              <span className={tone(model.optionB.niaExecutable)}>
                {model.optionB.niaExecutable}
              </span>
            </li>
            <li>
              Row 77 Option B continuity:{" "}
              <span className={tone(model.optionB.continuity)}>
                {model.optionB.continuity}
              </span>
            </li>
            <li>Row 77 completion status unchanged: YES</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row82-regression">
          <h2
            id="row82-regression"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Regression
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>Row 76: {model.regression.row76}</li>
            <li>Row 77: {model.regression.row77}</li>
            <li>Row 79: {model.regression.row79}</li>
            <li>Row 81: {model.regression.row81}</li>
            <li>Row 83: {model.regression.row83}</li>
            <li>Row 84: {model.regression.row84}</li>
            <li>Row 199: {model.regression.row199}</li>
            <li>Row 202: {model.regression.row202}</li>
            <li>Instagram: {model.regression.instagram}</li>
            <li>TikTok: {model.regression.tiktok}</li>
            <li>Brand: {model.regression.brand}</li>
            <li>Registration CTA: {model.regression.registrationCta}</li>
            <li>Security/Privacy: {model.regression.securityPrivacy}</li>
            <li>Runtime/Console: {model.regression.runtimeConsole}</li>
            <li>Overall: {model.regression.overall}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
