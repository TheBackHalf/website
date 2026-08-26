import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow86ReviewModel } from "@/lib/fab-5/row86-outreach";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 86 Founder strategy + contact intake review.
 * URL: /_internal/row86-outreach-review
 * Localhost-only. Does not mark Complete. Does not send or schedule outreach.
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
    value === "NONE" ||
    value === "NO" ||
    value === "APPROVED" ||
    value === "APPROVED FOR REUSE" ||
    value === "READY" ||
    value === "RECOMMENDED"
  ) {
    return "text-emerald-800";
  }
  if (value === "FAIL") return "text-red-800";
  if (
    value.includes("FOUNDER") ||
    value.includes("EXTERNAL DEPENDENCY") ||
    value.includes("UNKNOWN") ||
    value.includes("NOT YET") ||
    value.includes("READY FOR")
  ) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row86OutreachReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow86ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row86-outreach-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 86 OUTREACH
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-2 font-sans text-sm text-bh-muted">{model.period}</p>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder strategy is approved. Provide one contact dump. Message A and G
          copy still need Founder approval. No outreach has been sent. Row 86 is
          not marked Complete.
        </p>
        <p className="mt-4 font-sans text-sm font-medium text-amber-900">
          {model.finalStatus}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row86-strategy">
          <h2
            id="row86-strategy"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Approved outreach strategy
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Founder strategy:{" "}
              <span className={tone(model.founderStrategy.founderStrategy)}>
                {model.founderStrategy.founderStrategy}
              </span>
            </li>
            <li>Segments: {model.founderStrategy.segments}</li>
            <li>Prioritization: {model.founderStrategy.prioritization}</li>
            <li>Timing framework: {model.founderStrategy.timingFramework}</li>
            <li>Privacy / consent: {model.founderStrategy.privacy}</li>
            <li>Row 199 launch email: {model.founderStrategy.row199LaunchEmail}</li>
            <li>Row 199 partner note: {model.founderStrategy.row199PartnerNote}</li>
            <li>Personal Founder Note: {model.founderStrategy.messageA}</li>
            <li>Post-Launch Follow-Up: {model.founderStrategy.messageG}</li>
            <li>Contact intake: {model.founderStrategy.contactIntake}</li>
            <li>Contacts loaded: {model.contactsLoaded}</li>
            <li>
              Contacts requiring Founder input:{" "}
              {model.contactsRequiringFounderInput}
            </li>
            <li>Outreach sent: NO</li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row86-segments">
          <h2
            id="row86-segments"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Six audience segments
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            {model.segments.map((segment) => (
              <li key={segment.id}>
                {segment.name} — Priority {segment.priority}. {segment.purpose}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row86-priority">
          <h2
            id="row86-priority"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Prioritization
          </h2>
          <ul className="space-y-3 font-sans text-sm">
            {Object.values(model.priority).map((item) => (
              <li key={item.label}>
                <span className="font-medium">
                  {item.label}: {item.recommendation}
                </span>
                <span className="mt-1 block font-light text-bh-muted">{item.why}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row86-timing">
          <h2
            id="row86-timing"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Timing framework
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>PRE-LAUNCH — August 28–30</li>
            <li>LAUNCH DAY — August 31</li>
            <li>EARLY POST-LAUNCH — September 1–7</li>
            <li>FOLLOW-UP — after first contact, never after opt-out</li>
            <li>
              Partners/organizations with an existing warm relationship may be
              pre-launch or launch-day. Do not invent that relationship.
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row86-privacy">
          <h2
            id="row86-privacy"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Privacy / consent protections
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm">
            {model.privacyRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row86-intake">
          <h2
            id="row86-intake"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Consolidated contact intake table
          </h2>
          <p className="mb-4 font-sans text-sm text-bh-muted">
            One dump. Name + email/phone if you have it + organization/context if
            relevant. Missing fields are allowed. The system classifies. Do not
            build six lists.
          </p>
          {model.intake.length === 0 ? (
            <p className="font-sans text-sm">
              No contacts loaded. Table is ready. Consent status for future rows:
              CONSENT STATUS UNKNOWN. Outreach status: NOT SENT.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sans text-sm">
                <thead>
                  <tr className="border-b border-bh-purple/20 text-left">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Organization</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Relationship</th>
                    <th className="py-2 pr-3">Segment</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Message</th>
                    <th className="py-2 pr-3">Window</th>
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 pr-3">Consent</th>
                    <th className="py-2 pr-3">Outreach</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {model.intake.map((row) => (
                    <tr key={`${row.name}-${row.organization}`} className="border-b border-bh-purple/10">
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3">{row.organization}</td>
                      <td className="py-2 pr-3">{row.contactInformation}</td>
                      <td className="py-2 pr-3">{row.relationshipContext}</td>
                      <td className="py-2 pr-3">{row.recommendedSegment}</td>
                      <td className="py-2 pr-3">{row.priority}</td>
                      <td className="py-2 pr-3">{row.messageVersion}</td>
                      <td className="py-2 pr-3">{row.deliveryWindow}</td>
                      <td className="py-2 pr-3">{row.outreachChannel}</td>
                      <td className="py-2 pr-3">{row.consentStatus}</td>
                      <td className="py-2 pr-3">{row.outreachStatus}</td>
                      <td className="py-2">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-12" aria-labelledby="row86-a">
          <h2
            id="row86-a"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Message A draft
          </h2>
          <p className={`mb-3 font-sans text-sm ${tone(model.messageA.approvalStatus)}`}>
            {model.messageA.approvalStatus}
          </p>
          <pre className="whitespace-pre-wrap rounded-sm border border-bh-purple/15 bg-white/70 p-4 font-sans text-sm font-light leading-relaxed">
            {model.messageA.draftBody}
          </pre>
        </section>

        <section className="mb-12" aria-labelledby="row86-g">
          <h2
            id="row86-g"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Message G draft
          </h2>
          <p className={`mb-3 font-sans text-sm ${tone(model.messageG.approvalStatus)}`}>
            {model.messageG.approvalStatus}
          </p>
          <pre className="whitespace-pre-wrap rounded-sm border border-bh-purple/15 bg-white/70 p-4 font-sans text-sm font-light leading-relaxed">
            {model.messageG.draftBody}
          </pre>
        </section>

        <section className="mb-12" aria-labelledby="row86-reused">
          <h2
            id="row86-reused"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Existing approved Row 199 messages being reused
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            {model.reusedMessages.map((message) => (
              <li key={message.id}>
                {message.id}. {message.name} — {message.approvalStatus}. {message.source}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row86-remaining">
          <h2
            id="row86-remaining"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Remaining Founder contact-input requirement
          </h2>
          <p className="mb-4 font-sans text-sm text-bh-muted">
            Unchecked. Session-only. Not recorded as Founder acceptance. Not a send
            authorization.
          </p>
          <ul className="space-y-3 font-sans text-sm">
            {model.founderDecisions.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" defaultChecked={false} />
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="mt-1 block font-light text-bh-muted">
                      {item.recommendation}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
