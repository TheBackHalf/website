import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow34ReviewModel } from "@/lib/legal/row34-review";

export const dynamic = "force-dynamic";

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
  if (value === "PASS" || value === "CORRECTED" || value === "NOT APPLICABLE" || value === "RESOLVED" || value === "ACCEPTED RISK") {
    return "text-emerald-800";
  }
  if (value === "FAIL" || value === "INCONSISTENCY FOUND") return "text-red-800";
  if (value === "CRITICAL") return "text-red-800";
  if (value === "HIGH") return "text-orange-800";
  return "text-amber-900";
}

function Card({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-bh-purple/10 bg-white/80 p-5 shadow-sm md:p-8"
    >
      <h2 className="font-serif text-2xl text-bh-ink md:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default async function Row34HumanLegalLaunchReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow34ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink md:px-8 md:py-16"
      data-bh-temp-qa="row34-human-legal-launch-review"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-4">
          <p className="bh-eyebrow">Row 34 · Founder Legal Launch Risk Review</p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            {model.title}
          </h1>
          <p className="max-w-3xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            Version {model.version} reconciled {model.auditDate} against CURRENT
            English Version 1.0. This is a Founder legal launch risk review. It is
            not independent legal counsel. Attorney review is not claimed. Row 34
            is not marked Complete in this verification. Founder acceptance of
            this current review is not recorded.
          </p>
          <p className={`font-sans text-sm font-medium ${tone(model.readyForFounderAcceptance ? "PASS" : "FAIL")}`}>
            {model.finalStatus}
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 font-sans text-xs tracking-wide uppercase text-bh-muted">
          {[
            ["summary", "Summary"],
            ["documents", "Documents"],
            ["implementation", "Implementation"],
            ["ip", "IP"],
            ["checkout", "Checkout"],
            ["matrix", "Matrix"],
            ["risks", "Risk register"],
            ["defects", "Defects"],
            ["judgment", "Judgment"],
            ["counsel", "Counsel"],
            ["blockers", "Blockers"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="rounded-full border border-bh-purple/15 px-3 py-1 hover:border-bh-purple/40"
            >
              {label}
            </a>
          ))}
        </nav>

        <Card id="summary" title="A. Executive legal readiness summary">
          <ul className="grid gap-3 md:grid-cols-2">
            <li className="font-sans text-sm font-light">
              Overall review status:{" "}
              <strong className={tone(model.readyForFounderAcceptance ? "PASS" : "FAIL")}>
                {model.finalStatus}
              </strong>
            </li>
            <li className="font-sans text-sm font-light">
              Critical risks: <strong className={tone("CRITICAL")}>{model.counts.critical}</strong>
            </li>
            <li className="font-sans text-sm font-light">
              High risks: <strong className={tone("HIGH")}>{model.counts.high}</strong>
            </li>
            <li className="font-sans text-sm font-light">
              Medium risks: <strong>{model.counts.medium}</strong>
            </li>
            <li className="font-sans text-sm font-light">
              Low risks: <strong>{model.counts.low}</strong>
            </li>
            <li className="font-sans text-sm font-light">
              Accepted remaining: <strong>{model.counts.acceptedRemaining}</strong>
            </li>
            <li className="font-sans text-sm font-light">
              Pre-Community-launch: <strong>{model.counts.preCommunityLaunch}</strong>
            </li>
            <li className="font-sans text-sm font-light">
              Post-launch follow-up: <strong>{model.counts.postLaunchFollowUp}</strong>
            </li>
            <li className="font-sans text-sm font-light">
              Founder decisions required: {model.founderJudgment.length}
            </li>
            <li className="font-sans text-sm font-light md:col-span-2">
              Independent counsel: {model.independentCounsel.status}. Required for
            launch: NO. This is not a Row 34 closure blocker.{" "}
            {model.independentCounsel.statement}
            </li>
          </ul>
          <div className="space-y-3 font-sans text-sm font-light text-bh-muted">
            <p>{model.row32}</p>
            <p>{model.row33}</p>
            <p>{model.row60}</p>
          </div>
        </Card>

        <Card id="documents" title="B. Legal document review">
          <div className="space-y-6">
            {model.documents.map((document) => (
              <article
                key={document.id}
                className="border-t border-bh-purple/10 pt-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl">{document.title}</h3>
                  <span className={`font-sans text-sm font-medium ${tone(document.published ? "PASS" : "FAIL")}`}>
                    {document.published ? "PUBLISHED" : "UNPUBLISHED DRAFT"}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 font-sans text-sm font-light md:grid-cols-2">
                  <div>
                    <dt className="text-bh-muted">Version</dt>
                    <dd>{document.version}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Effective date</dt>
                    <dd>{document.effectiveDate}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Review status</dt>
                    <dd>{document.reviewStatus}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Spanish title</dt>
                    <dd>{document.spanishTitle} — Spanish body PENDING APPROVED TRANSLATION</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-bh-muted">Implementation</dt>
                    <dd>{document.implementation}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-bh-muted">Material concern</dt>
                    <dd>{document.materialConcern}</dd>
                  </div>
                </dl>
                <p className="mt-3 flex flex-wrap gap-3 font-sans text-sm">
                  <a className="bh-legal-link" href={document.routeEn}>
                    Open English
                  </a>
                  <a className="bh-legal-link" href={document.routeEs}>
                    Open Spanish
                  </a>
                </p>
              </article>
            ))}
            <article className="border-t border-bh-purple/10 pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-xl">{model.communityGuidelines.title}</h3>
                <span className={`font-sans text-sm font-medium ${tone(model.communityGuidelines.status)}`}>
                  {model.communityGuidelines.status}
                </span>
              </div>
              <p className="mt-2 font-sans text-sm font-light">
                {model.communityGuidelines.implementation}
              </p>
              <p className="mt-2 font-sans text-sm font-light text-bh-muted">
                {model.communityGuidelines.materialConcern}
              </p>
            </article>
          </div>
        </Card>

        <Card id="implementation" title="C. Implementation review">
          <ul className="space-y-2 font-sans text-sm font-light">
            <li>Registration consent: required checkboxes for Terms, Privacy, Participant Agreement, AI Disclosure using Founder-approved Version 1.0 labels. Locale-aware links. Server-enforced.</li>
            <li>Checkout consent: Terms, Participant Agreement, Membership Agreement, plus billing acknowledgment shown after material purchase terms. Server-enforced before Stripe session. No real charges in this review.</li>
            <li>Version/timestamp: Version 1.0, Effective Date August 31, 2026, publicationStatus published, locale, and consentedAt are recorded.</li>
            <li>AI disclosure: Version 1.0 published. Lumina public page and Architect chat link to /legal/ai-disclosure. AI Kimberly has no public chat; URLs are age-gated. Identity convention remains Kimberly M. Walker (AI) for AI Founder surfaces.</li>
            <li>Footer: five catalog documents linked on English and Spanish routes. Community Guidelines not linked because it has no route.</li>
            <li>Support: form + support@thebackhalf.org. Typical 3-day / 72-hour goal. No 24/7, live chat, or phone. No refund ticket category.</li>
            <li>Social/marketing: Row 33 campaign audit reused. Active launch channels are Instagram and TikTok. LinkedIn is a future enhancement and is not an August 31 requirement. MAGICAL IS POSSIBLE preserved. No testimonials invented.</li>
            <li>Refunds: checkout displays the approved no-refund policy before purchase. Version 1 instruments state no refunds. No standalone Refund Policy.</li>
          </ul>
        </Card>

        <Card id="ip" title="D. IP / trademark review">
          <p className="font-sans text-sm font-light">{model.ip.trademarkPosture}</p>
          <p className="font-sans text-sm font-light">{model.ip.copyrightPosture}</p>
          <p className="font-sans text-sm font-medium">Assets reviewed</p>
          <ul className="list-disc space-y-1 pl-5 font-sans text-sm font-light">
            {model.ip.brandAssets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="font-sans text-sm font-medium">License / provenance</p>
          <ul className="list-disc space-y-1 pl-5 font-sans text-sm font-light">
            {model.ip.licenseConcerns.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card id="checkout" title="E. Checkout disclosure review">
          <ul className="grid gap-2 font-sans text-sm font-light md:grid-cols-2">
            <li>Product named: {model.checkout.productNamed ? "Yes" : "No"}</li>
            <li>Price shown: {model.checkout.priceShown ? "Yes" : "No"}</li>
            <li>Billing cadence shown: {model.checkout.cadenceShown ? "Yes" : "No"}</li>
            <li>One-time vs recurring: {model.checkout.oneTimeVsRecurring ? "Yes" : "No"}</li>
            <li>Refund policy shown: {model.checkout.refundPolicyShown ? "Yes" : "No"}</li>
            <li>Required agreements linked: {model.checkout.requiredAgreementsLinked ? "Yes" : "No"}</li>
            <li>Acknowledgments enforced: {model.checkout.acknowledgmentsEnforced ? "Yes" : "No"}</li>
            <li>AI Disclosure at checkout: {model.checkout.aiDisclosureAtCheckout ? "Yes" : "No — see R34-H5"}</li>
          </ul>
          <p className="font-sans text-sm font-light text-bh-muted">
            {model.checkout.taxesNote}
          </p>
          <p className="font-sans text-sm font-light">
            Mechanical test: missing acknowledgments are rejected; complete sets
            are accepted; Stripe session is not created without consent. No live
            charge was placed for this review.
          </p>
        </Card>

        <Card id="matrix" title="F. Cross-document consistency matrix">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-bh-purple/20">
                  {[
                    "Topic",
                    "Terms",
                    "Privacy",
                    "Participant",
                    "Membership",
                    "AI",
                    "Community",
                    "Checkout",
                    "Registration",
                    "Support",
                    "Marketing",
                  ].map((heading) => (
                    <th key={heading} className="px-2 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.matrix.map((row) => (
                  <tr key={row.topic} className="border-b border-bh-purple/10 align-top">
                    <td className="px-2 py-2 font-medium">{row.topic}</td>
                    <td className={`px-2 py-2 ${tone(row.terms)}`}>{row.terms}</td>
                    <td className={`px-2 py-2 ${tone(row.privacy)}`}>{row.privacy}</td>
                    <td className={`px-2 py-2 ${tone(row.participant)}`}>{row.participant}</td>
                    <td className={`px-2 py-2 ${tone(row.membership)}`}>{row.membership}</td>
                    <td className={`px-2 py-2 ${tone(row.ai)}`}>{row.ai}</td>
                    <td className={`px-2 py-2 ${tone(row.community)}`}>{row.community}</td>
                    <td className={`px-2 py-2 ${tone(row.checkout)}`}>{row.checkout}</td>
                    <td className={`px-2 py-2 ${tone(row.registration)}`}>{row.registration}</td>
                    <td className={`px-2 py-2 ${tone(row.support)}`}>{row.support}</td>
                    <td className={`px-2 py-2 ${tone(row.marketing)}`}>{row.marketing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5 font-sans text-sm font-light text-bh-muted">
            {model.matrix.map((row) => (
              <li key={`${row.topic}-note`}>
                <strong>{row.topic}:</strong> {row.note}
              </li>
            ))}
          </ul>
        </Card>

        <Card id="risks" title="G. Founder legal launch risk register">
          <div className="space-y-6">
            {model.risks.map((risk) => (
              <article key={risk.id} className="border-t border-bh-purple/10 pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl">
                    {risk.id} · {risk.area}
                  </h3>
                  <span className={`font-sans text-sm font-medium ${tone(risk.severity)}`}>
                    {risk.severity}
                  </span>
                </div>
                <dl className="mt-3 space-y-2 font-sans text-sm font-light">
                  <div>
                    <dt className="text-bh-muted">Issue</dt>
                    <dd>{risk.issue}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Why it matters</dt>
                    <dd>{risk.whyItMatters}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Launch impact</dt>
                    <dd>{risk.launchImpact}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Existing mitigation</dt>
                    <dd>{risk.existingMitigation}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Founder decision required</dt>
                    <dd>{risk.founderDecisionRequired}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Post-launch counsel recommended</dt>
                    <dd>{risk.postLaunchCounselRecommended ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Historical status</dt>
                    <dd>{risk.status}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Current classification</dt>
                    <dd>{risk.currentClassification}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </Card>

        <Card id="defects" title="H. Defects found and corrected">
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm font-light">
            {model.defectsCorrected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card id="judgment" title="I. Founder / legal judgment items">
          <ol className="list-decimal space-y-2 pl-5 font-sans text-sm font-light">
            {model.founderJudgment.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </Card>

        <Card id="counsel" title="J. Post-launch counsel recommendations">
          <p className="font-sans text-sm font-light text-bh-muted">
            Recommended. Not required to mark Row 34 complete. No attorney review
            is claimed.
          </p>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm font-light">
            {model.counselRecommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card id="blockers" title="K. Remaining blockers">
          {model.blockers.length === 0 ? (
            <p className="font-sans text-sm font-light">
              No unpublished-manuscript launch blockers remain. Independent
              counsel is not a Row 34 launch requirement. Founder acceptance of
              this current Version 1.0-aligned review is not recorded, so Row 34
              is not silently marked Complete.
            </p>
          ) : (
            <ul className="list-disc space-y-2 pl-5 font-sans text-sm font-light">
              {model.blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="scorecard" title="Row 34 scorecard">
          <ul>
            {Object.entries(model.verdicts)
              .filter(([label]) => !["consentLabelsPending", "blueprintCopyrightPresent", "row33StandardPresent"].includes(label))
              .map(([label, value]) => (
                <li
                  key={label}
                  className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2"
                >
                  <span className="font-sans text-sm font-light text-bh-muted">
                    {label}
                  </span>
                  <span className={`text-right font-sans text-sm font-medium ${tone(value)}`}>
                    {value}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
