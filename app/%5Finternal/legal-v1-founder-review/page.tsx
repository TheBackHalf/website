import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  LEGAL_V1_PUBLICATION_STATUS,
  MEMBERSHIP_SECTION_4_PREVIOUS,
  MEMBERSHIP_SECTION_4_UPDATED,
  communityGuidelinesPrep,
  legalV1Audit,
  legalV1FounderDecisionsApplied,
  legalV1LaunchCandidates,
  proposedBillingAcknowledgment,
  proposedConsentLabels,
  refundPolicyImplementation,
  type LegalV1Candidate,
} from "@/content/legal/v1-candidates";

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

function Meta({ candidate }: { candidate: LegalV1Candidate }) {
  return (
    <dl className="grid gap-2 font-sans text-sm font-light text-bh-ink md:grid-cols-2">
      <div>
        Version: <strong>{candidate.version}</strong>
      </div>
      <div>
        Effective Date: <strong>{candidate.effectiveDate}</strong>
      </div>
      <div>
        Status: <strong>{candidate.status}</strong>
      </div>
      <div>
        Publication Status: <strong>{candidate.publicationStatus}</strong>
      </div>
      <div>
        Contact information: <strong>{candidate.contactInformation}</strong>
      </div>
      <div>
        Mailboxes:{" "}
        <strong>
          {candidate.mailboxes.length > 0
            ? candidate.mailboxes.join(", ")
            : "None in this instrument"}
        </strong>
      </div>
      <div className="md:col-span-2">
        Applicable 18+ provision: {candidate.ageProvision}
      </div>
      <div className="md:col-span-2">
        Applicable no-refund provision/reference: {candidate.noRefundProvision}
      </div>
      <div className="md:col-span-2">
        Applicable Community provision: {candidate.communityProvision}
      </div>
      <div>
        Candidate Created: <strong>{candidate.candidateCreated}</strong>
      </div>
      <div>
        Approved Base Preserved:{" "}
        <strong>{candidate.approvedBasePreserved}</strong>
      </div>
      <div>
        Mailbox Corrections: <strong>{candidate.mailboxCorrections}</strong>
      </div>
      <div>
        18+ Consistency: <strong>{candidate.ageConsistency}</strong>
      </div>
      <div>
        No-Refund Consistency:{" "}
        <strong>{candidate.noRefundConsistency}</strong>
      </div>
      <div>
        Founder Final Approval Required: <strong>NO — APPROVED AND PUBLISHED</strong>
      </div>
    </dl>
  );
}

function DocumentCard({ candidate }: { candidate: LegalV1Candidate }) {
  return (
    <Card id={candidate.id} title={candidate.title}>
      <p className="font-sans text-xs font-light text-bh-muted">
        Base: {candidate.baseSource}
      </p>
      <Meta candidate={candidate} />
      <div>
        <h3 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-muted">
          Changes made from approved base
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-sm font-light">
          {candidate.changesFromBase.map((change) => (
            <li key={change.detail}>
              <span className="font-medium">{change.category}:</span>{" "}
              {change.detail}
            </li>
          ))}
        </ul>
      </div>
      <article className="max-w-3xl space-y-4 font-sans text-sm font-light leading-relaxed text-bh-ink">
        <h3 className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-muted">
          Complete published Version 1 English text
        </h3>
        {candidate.sections.map((section, index) => (
          <section key={`${candidate.id}-${index}`}>
            {section.heading ? (
              <h3 className="mb-2 font-serif text-xl text-bh-ink">
                {section.heading}
              </h3>
            ) : null}
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${candidate.id}-${index}-${paragraphIndex}`} className="mb-2">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </Card>
  );
}

export default async function LegalV1FounderReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink md:px-8 md:py-16"
      data-bh-temp-qa="legal-v1-founder-review"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-4">
          <p className="bh-eyebrow">
            Legal Version 1 · Founder-approved · Published
          </p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            Official Version 1 Legal Package
          </h1>
          <p className="max-w-3xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            Founder-approved English Version 1.0 is published. Consent labels
            and the billing acknowledgment are activated. Spanish legal
            manuscripts remain pending approved translation. Community
            Guidelines remain a pre-Community-launch requirement due before
            October 25, 2026.
          </p>
          <p className="font-sans text-sm font-medium text-bh-ink">
            Publication Status: {LEGAL_V1_PUBLICATION_STATUS}
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 font-sans text-xs tracking-wide uppercase text-bh-muted">
          {[
            ["founder-decisions", "Founder decisions"],
            ["privacy-policy", "Privacy"],
            ["terms-of-use", "Terms"],
            ["participant-agreement", "Participant"],
            ["membership-agreement", "Membership"],
            ["ai-disclosure", "AI Disclosure"],
            ["membership-s4", "Membership §4"],
            ["proposed-consent", "Consent"],
            ["proposed-billing", "Billing"],
            ["no-refund-implementation", "No refunds"],
            ["community-guidelines", "Community Guidelines"],
            ["spanish", "Spanish"],
            ["consistency", "Consistency"],
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

        <Card id="founder-decisions" title="Founder Decisions — Applied">
          <p className="font-sans text-sm font-light text-bh-muted">
            These decisions are settled. They are not open questions.
          </p>
          <ul className="space-y-2 font-sans text-sm font-light">
            {legalV1FounderDecisionsApplied.map((item) => (
              <li key={item.id}>
                {item.label}: <strong>{item.result}</strong>
              </li>
            ))}
          </ul>
        </Card>

        {legalV1LaunchCandidates.map((candidate) => (
          <DocumentCard key={candidate.id} candidate={candidate} />
        ))}

        <Card id="membership-s4" title="Membership Agreement §4">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
            Previous language
          </p>
          <p className="font-sans text-sm font-light">{MEMBERSHIP_SECTION_4_PREVIOUS}</p>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
            Updated professional language
          </p>
          <p className="font-sans text-sm font-light">{MEMBERSHIP_SECTION_4_UPDATED}</p>
          <p className="font-sans text-xs font-light text-bh-muted">
            Smallest wording correction. Underlying contractual meaning
            unchanged. The remainder of §4 is unchanged.
          </p>
        </Card>

        <Card id="proposed-consent" title="Approved Consent Checkbox Language">
          <p className="font-sans text-sm font-medium text-emerald-800">
            APPROVED — ACTIVATED
          </p>
          <p className="font-sans text-sm font-light text-bh-muted">
            Exact Founder-approved wording for each required consent moment.
            Document names are the linked document titles.
          </p>
          <ul className="space-y-4 font-sans text-sm font-light">
            {proposedConsentLabels.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-bh-purple/10 p-4"
              >
                <p>
                  DOCUMENT / MOMENT:
                  <br />
                  {item.moment}
                </p>
                <p className="mt-3">
                  CHECKBOX:
                  <br />
                  &quot;{item.label}&quot;
                </p>
                <p className="mt-3">
                  LINKED DOCUMENT:
                  <br />
                  {item.linkedDocument}
                </p>
                <p className="mt-3">
                  STATUS:
                  <br />
                  {item.status}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          id="proposed-billing"
          title="Billing/Purchase Acknowledgment"
        >
          <p className="font-sans text-sm font-medium text-emerald-800">
            {proposedBillingAcknowledgment.status}
          </p>
          <p className="font-sans text-sm font-light">
            BILLING/PURCHASE ACKNOWLEDGMENT:
          </p>
          <p className="max-w-3xl font-sans text-sm font-light leading-relaxed">
            &quot;{proposedBillingAcknowledgment.label}&quot;
          </p>
          <p className="font-sans text-sm font-light">
            Activated. Material purchase terms remain visible on the checkout
            offer before this checkbox.
          </p>
          <p className="font-sans text-xs font-light text-bh-muted">
            Checkout continues to display applicable price, Architect Community
            access and timing, and NO REFUNDS above this acknowledgment.
          </p>
        </Card>

        <Card id="no-refund-implementation" title="No-Refund Implementation">
          <p className="font-sans text-sm font-light">
            Standalone Version 1 No-Refund Policy created:{" "}
            <strong>
              {refundPolicyImplementation.standaloneInstrumentCreated
                ? "YES"
                : "NO"}
            </strong>
          </p>
          <p className="font-sans text-sm font-light">
            {refundPolicyImplementation.method}
          </p>
          <p className="font-sans text-sm font-light">
            Operative language: {refundPolicyImplementation.operativeLanguage}
          </p>
          <p className="font-sans text-sm font-light">
            {refundPolicyImplementation.obsoleteBillingMailbox}
          </p>
        </Card>

        <Card id="community-guidelines" title="Community Guidelines">
          <p className="font-sans text-sm font-medium">
            Requirement: {communityGuidelinesPrep.requirement}
          </p>
          <p className="font-sans text-sm font-light">
            Deadline: {communityGuidelinesPrep.deadline}
          </p>
          <p className="font-sans text-sm font-light">
            August 31 Blocker:{" "}
            <strong>
              {communityGuidelinesPrep.august31Blocker ? "YES" : "NO"}
            </strong>
          </p>
          <p className="font-sans text-sm font-light">
            Community launch: {communityGuidelinesPrep.communityTarget}
          </p>
          <p className="font-sans text-sm font-light">
            Status: {communityGuidelinesPrep.status}
          </p>
          <p className="font-sans text-sm font-light text-bh-muted">
            {communityGuidelinesPrep.baseSource}
          </p>
          <p className="font-sans text-sm font-light">
            If later published, mailbox:{" "}
            {communityGuidelinesPrep.mailboxIfPublished}
          </p>
          <p className="font-sans text-sm font-light">
            Related approved legal: {communityGuidelinesPrep.relatedApprovedLegal}
          </p>
          <p className="font-sans text-sm font-light text-bh-muted">
            {communityGuidelinesPrep.note}
          </p>
        </Card>

        <Card id="spanish" title="Spanish Legal Status">
          <p className="font-sans text-sm font-medium">
            {legalV1Audit.spanishLegalManuscripts}
          </p>
          <p className="font-sans text-sm font-light text-bh-muted">
            Spanish titles on /es/legal/... are not operative Spanish
            agreements. Current Spanish routing was not overwritten. Do not
            auto-translate these documents.
          </p>
        </Card>

        <Card id="consistency" title="Cross-Document Consistency">
          <ul className="space-y-1 font-sans text-sm font-light">
            <li>
              Incorrect First-Year Community References Remaining:{" "}
              {legalV1Audit.incorrectFirstYearCommunityInActiveLegalAndCheckout}
            </li>
            <li>
              Incorrect 12-Month Community References Remaining:{" "}
              {legalV1Audit.incorrectTwelveMonthCommunityInActiveLegalAndCheckout}
            </li>
            <li>
              Obsolete October 19 Active References (Legal V1 candidates):{" "}
              {legalV1Audit.obsoleteOctober19InCandidates}
            </li>
            <li>
              Obsolete August 19 Active References (Legal V1 candidates):{" "}
              {legalV1Audit.obsoleteAugust19InCandidates}
            </li>
            <li>
              Obsolete legal@ Active References (Legal V1 candidates):{" "}
              {legalV1Audit.obsoleteLegalAtInCandidates}
            </li>
            <li>
              Obsolete billing@ Active References (Legal V1 candidates):{" "}
              {legalV1Audit.obsoleteBillingAtInCandidates}
            </li>
            <li>
              Dead Refund Policy References (Legal V1 candidates):{" "}
              {legalV1Audit.deadRefundPolicyReferencesInCandidates}
            </li>
            <li>
              Published to website: {legalV1Audit.publishedToWebsite ? "YES" : "NO"}
            </li>
            <li>
              Consent labels activated:{" "}
              {legalV1Audit.consentLabelsActivated ? "YES" : "NO"}
            </li>
            <li>
              Billing acknowledgment activated:{" "}
              {legalV1Audit.billingAcknowledgmentActivated ? "YES" : "NO"}
            </li>
            <li>
              Row 32 marked Complete: {legalV1Audit.row32MarkedComplete ? "YES" : "NO"}
            </li>
            <li>Launch Roadmap altered: NO</li>
            <li>Founder Notes altered: NO</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
