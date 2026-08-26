import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow32ReviewModel } from "@/lib/legal/row32-review";
import type { Row32Verdict } from "@/lib/legal/row32-audit";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 32 Founder acceptance review only.
 * URL: /_internal/row32-legal-implementation-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Founder Acceptance Review for published English Version 1.0.
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

function Status({ label, value }: { label: string; value: string }) {
  const pass = value === "PASS" || value === "PUBLISHED" || value === "N/A";
  const fail = value === "FAIL" || value === "UNPUBLISHED_DRAFT";
  const tone = pass ? "text-emerald-800" : fail ? "text-red-800" : "text-bh-ink";
  return (
    <li className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-muted">{label}</span>
      <span className={`font-sans text-sm font-medium ${tone}`}>{value}</span>
    </li>
  );
}

function verdict(value: Row32Verdict | undefined): string {
  return value ?? "NOT RUN";
}

export default async function Row32LegalImplementationReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow32ReviewModel();
  const v = model.verdicts;

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row32-legal-implementation-review"
    >
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 32 COMPLETE LAUNCH LEGAL IMPLEMENTATION AUDIT
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 32 — Complete Launch Legal Implementation Audit
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance Review for Legal Version 1 publication. This page
          audits publication, links, consent, versions, AI disclosure, and
          claims against approved product reality. Spanish manuscripts remain
          pending approved translation. Community Guidelines remain a
          pre-Community-launch requirement due before October 25, 2026.
        </p>
        <p className="mt-3 font-sans text-sm font-medium text-red-800">
          {model.finalStatus}
        </p>
        {model.generatedAt ? (
          <p className="mt-2 font-sans text-xs font-light text-bh-muted">
            Mechanical suite: {model.generatedAt} · {model.origin}
          </p>
        ) : (
          <p className="mt-2 font-sans text-xs font-light text-bh-muted">
            Run <code>npm run fab5:row32</code> to attach HTTP and persistence
            evidence to this page.
          </p>
        )}

        <section className="mt-10" aria-labelledby="row32-docs">
          <h2
            id="row32-docs"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            A. Legal documents
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-bh-purple/20">
                  <th className="py-2 pr-3 font-medium">Document</th>
                  <th className="py-2 pr-3 font-medium">Version</th>
                  <th className="py-2 pr-3 font-medium">Effective</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {model.documents.map((document) => (
                  <tr key={document.id} className="border-b border-bh-purple/10">
                    <td className="py-3 pr-3 font-medium">{document.name}</td>
                    <td className="py-3 pr-3 font-light">{document.version}</td>
                    <td className="py-3 pr-3 font-light">
                      {document.effectiveDate}
                    </td>
                    <td
                      className={`py-3 pr-3 font-medium ${
                        document.publicationStatus === "PUBLISHED"
                          ? "text-emerald-800"
                          : "text-red-800"
                      }`}
                    >
                      {document.publicationStatus}
                    </td>
                    <td className="py-3">
                      <a className="bh-legal-link" href={document.publishedRouteEn}>
                        EN
                      </a>
                      {" · "}
                      <a className="bh-legal-link" href={document.publishedRouteEs}>
                        ES
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-4">
            <Status label="Privacy Policy" value={verdict(v.privacyPolicy)} />
            <Status label="Terms" value={verdict(v.terms)} />
            <Status
              label="Participant Agreement"
              value={verdict(v.participantAgreement)}
            />
            <Status
              label="Membership Agreement"
              value={verdict(v.membershipAgreement)}
            />
            <Status label="AI Disclosure" value={verdict(v.aiDisclosure)} />
            <Status
              label="Final approved content published"
              value={verdict(v.finalApprovedContentPublished)}
            />
            <Status
              label="Draft/placeholder content removed"
              value={verdict(v.draftPlaceholderRemoved)}
            />
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="row32-links">
          <h2
            id="row32-links"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            B. Legal link coverage
          </h2>
          <ul>
            {model.linkSurfaces.map((surface) => (
              <li
                key={surface.surface}
                className="border-b border-bh-purple/10 py-3"
              >
                <p className="font-sans text-sm font-medium">{surface.surface}</p>
                <p className="mt-1 font-sans text-sm font-light text-bh-muted">
                  {surface.documents.join(" · ")}
                </p>
                <p className="mt-1 font-sans text-xs font-light text-bh-muted">
                  {surface.notes}
                </p>
              </li>
            ))}
          </ul>
          <ul className="mt-4">
            <Status label="Legal routes" value={verdict(v.legalRoutes)} />
            <Status label="Footer legal links" value={verdict(v.footerLegalLinks)} />
            <Status
              label="Registration legal links"
              value={verdict(v.registrationLegalLinks)}
            />
            <Status
              label="Checkout legal links"
              value={verdict(v.checkoutLegalLinks)}
            />
            <Status
              label="Account/onboarding legal links"
              value={verdict(v.accountOnboardingLegalLinks)}
            />
            <Status label="AI legal links" value={verdict(v.aiLegalLinks)} />
            <Status
              label="Support legal links"
              value={verdict(v.supportLegalLinks)}
            />
            <Status
              label="Broken/obsolete links"
              value={verdict(v.brokenObsoleteLinks)}
            />
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="row32-consent">
          <h2
            id="row32-consent"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            C. Consent implementation
          </h2>
          <ul>
            {model.consentMoments.map((moment) => (
              <li
                key={moment.location}
                className="border-b border-bh-purple/10 py-3"
              >
                <p className="font-sans text-sm font-medium">
                  {moment.location}{" "}
                  <span className="font-light text-bh-muted">
                    {moment.required ? "(required)" : "(optional)"}
                  </span>
                </p>
                <p className="mt-1 font-sans text-xs font-light text-bh-muted">
                  Enforcement: {moment.enforcement}
                </p>
                <p className="mt-1 font-sans text-xs font-light text-bh-muted">
                  Version: {moment.versionRecording}
                </p>
                <p className="mt-1 font-sans text-xs font-light text-bh-muted">
                  Timestamp: {moment.timestampRecording}
                </p>
                <p className="mt-1 font-sans text-xs font-light text-bh-muted">
                  Persistence: {moment.persistence}
                </p>
              </li>
            ))}
          </ul>
          <ul className="mt-4">
            <Status
              label="Required consent moments identified"
              value={verdict(v.requiredConsentMomentsIdentified)}
            />
            <Status
              label="Registration/account acknowledgment"
              value={verdict(v.registrationAcknowledgment)}
            />
            <Status
              label="Checkout acknowledgment"
              value={verdict(v.checkoutAcknowledgment)}
            />
            <Status
              label="Membership acknowledgment"
              value={verdict(v.membershipAcknowledgment)}
            />
            <Status
              label="Required consent enforcement"
              value={verdict(v.requiredConsentEnforcement)}
            />
            <Status
              label="Consent bypass protection"
              value={verdict(v.consentBypassProtection)}
            />
            <Status
              label="Document version recorded"
              value={verdict(v.documentVersionRecorded)}
            />
            <Status
              label="Acceptance timestamp recorded"
              value={verdict(v.acceptanceTimestampRecorded)}
            />
            <Status
              label="Production persistence"
              value={verdict(v.productionPersistence)}
            />
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="row32-ai">
          <h2
            id="row32-ai"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            D. AI disclosure
          </h2>
          <p className="mb-4 font-sans text-sm font-light leading-relaxed text-bh-muted">
            {model.aiKimberly} English Version 1.0 AI Disclosure is published at
            /legal/ai-disclosure. Spanish /es/legal/ai-disclosure remains pending
            approved translation and is not presented as a Spanish legal
            instrument.
          </p>
          <ul>
            <Status label="Lumina disclosure" value={verdict(v.luminaDisclosure)} />
            <Status
              label="AI Kimberly disclosure"
              value={verdict(v.aiKimberlyDisclosure)}
            />
            <Status
              label="Disclosure placement"
              value={verdict(v.disclosurePlacement)}
            />
            <Status
              label="AI product-reality consistency"
              value={verdict(v.aiProductReality)}
            />
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="row32-claims">
          <h2
            id="row32-claims"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            E. Claims audit
          </h2>
          <p className="mb-4 font-sans text-sm font-light leading-relaxed text-bh-muted">
            Support copy states a typical 3-day / 72-hour response expectation,
            not 24/7, live chat, or phone support. Refund language is “no
            refunds.” Brand philosophy (Become an Architect; Magical is
            Possible) is preserved.
          </p>
          {model.claims.hits.length > 0 ? (
            <ul className="mb-4 list-disc pl-5 font-sans text-sm text-red-800">
              {model.claims.hits.map((hit) => (
                <li key={hit.id}>
                  {hit.id}: {hit.sample}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 font-sans text-sm font-light text-bh-muted">
              No excessive guarantee, credential, refund-offer, or 24/7 support
              claims were found in launch-facing dictionaries.
            </p>
          )}
          <ul>
            <Status label="Website claims" value={verdict(v.websiteClaims)} />
            <Status label="Support claims" value={verdict(v.supportClaims)} />
            <Status label="Refund claims" value={verdict(v.refundClaims)} />
            <Status
              label="Social/marketing claims"
              value={verdict(v.socialMarketingClaims)}
            />
            <Status
              label="Claims do not exceed product reality"
              value={verdict(v.claimsDoNotExceedProductReality)}
            />
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="row32-regression">
          <h2
            id="row32-regression"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            F. Regression results
          </h2>
          <ul>
            <Status label="Website" value={verdict(model.regression.website ?? v.english)} />
            <Status label="Registration" value={verdict(model.regression.registration)} />
            <Status label="Login" value={verdict(model.regression.login)} />
            <Status label="Checkout" value={verdict(model.regression.checkout)} />
            <Status label="Onboarding" value={verdict(model.regression.onboarding)} />
            <Status label="Journey" value={verdict(model.regression.journey)} />
            <Status label="Lumina" value={verdict(model.regression.lumina)} />
            <Status label="AI Kimberly" value={verdict(model.regression.aiKimberly)} />
            <Status label="Downloads" value={verdict(model.regression.downloads)} />
            <Status label="Membership" value={verdict(model.regression.membership)} />
            <Status label="Support" value={verdict(model.regression.support)} />
            <Status label="Row 51" value={verdict(model.regression.row51)} />
            <Status label="Row 84" value={verdict(model.regression.row84)} />
            <Status label="Row 150" value={verdict(model.regression.row150)} />
            <Status label="Row 151" value={verdict(model.regression.row151)} />
            <Status label="Row 153" value={verdict(model.regression.row153)} />
            <Status label="Overall regression" value={verdict(model.regression.overall)} />
            <Status label="English" value={verdict(v.english)} />
            <Status label="Spanish" value={verdict(v.spanish)} />
            <Status label="Desktop" value={verdict(v.desktop)} />
            <Status label="Mobile" value={verdict(v.mobile)} />
            <Status label="Runtime/console" value={verdict(v.runtimeConsole)} />
            <Status
              label="Privacy/data collection consistency"
              value={verdict(v.privacyDataCollectionConsistency)}
            />
            <Status
              label="Analytics consistency"
              value={verdict(v.analyticsConsistency)}
            />
            <Status
              label="Sensitive data protection"
              value={verdict(v.sensitiveDataProtection)}
            />
          </ul>
          {model.tests.length > 0 ? (
            <ul className="mt-6">
              {model.tests.map((test) => (
                <Status
                  key={test.id}
                  label={`${test.id} ${test.name}`}
                  value={test.result}
                />
              ))}
            </ul>
          ) : null}
        </section>

        <section className="mt-10" aria-labelledby="row32-defects">
          <h2
            id="row32-defects"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            G. Defects found and corrected
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm font-light leading-relaxed">
            {model.defectsCorrected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="row32-judgment">
          <h2
            id="row32-judgment"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            H. Founder/legal judgment items
          </h2>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm font-light leading-relaxed">
            {model.founderJudgment.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10 mb-16" aria-labelledby="row32-blockers">
          <h2
            id="row32-blockers"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            I. Remaining blockers
          </h2>
          <p className="mb-4 font-sans text-sm font-light leading-relaxed text-bh-muted">
            {model.row60}
          </p>
          <ul className="list-disc space-y-2 pl-5 font-sans text-sm font-light leading-relaxed">
            {model.blockers.length === 0 ? (
              <li>NONE</li>
            ) : (
              model.blockers.map((item) => <li key={item}>{item}</li>)
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
