import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow60ReviewModel } from "@/lib/eligibility/review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 60 Founder acceptance review only.
 * URL: /_internal/row60-age-eligibility-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 60 complete.
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
  const pass = value === "PASS" || value === "APPROVED" || value === "18+ ONLY";
  const fail = value === "FAIL";
  const tone = pass ? "text-emerald-800" : fail ? "text-red-800" : "text-bh-ink";
  return (
    <li className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-muted">{label}</span>
      <span className={`font-sans text-sm font-medium ${tone}`}>{value}</span>
    </li>
  );
}

export default async function Row60AgeEligibilityReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = await getRow60ReviewModel();
  const report = model.report;
  const categories = report?.categories ?? {};

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row60-age-eligibility-review"
    >
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 60 PARTICIPANT AGE ELIGIBILITY
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 60 — Participant Age Eligibility and Minor Access Policy
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder Acceptance Review. Row 60 is not marked Complete. Platform
          participation at launch is 18+. The company message can still resonate
          with people of many ages. No COPPA, minor, teen, parent/guardian, or
          date-of-birth collection was implemented.
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row60-decision">
          <h2
            id="row60-decision"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder decision
          </h2>
          <ul>
            <Status
              label="Minimum Participant Age"
              value={String(model.policy.minimumParticipantAge)}
            />
            <Status
              label="Launch Eligibility Decision"
              value={model.policy.launchEligibilityDecision}
            />
            <Status
              label="Founder Age Decision"
              value={model.policy.founderAgeDecision}
            />
            <Status
              label="Mechanical overall"
              value={report?.overall ?? "PENDING"}
            />
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row60-report">
          <h2
            id="row60-report"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Acceptance report
          </h2>
          <ul>
            <Status
              label="Explicit Policy Decision"
              value={categories.explicitPolicyDecision ?? "PENDING"}
            />
            <Status
              label="Marketing Consistency"
              value={categories.marketingConsistency ?? "PENDING"}
            />
            <Status
              label="Checkout Enforcement"
              value={categories.checkoutEnforcement ?? "PENDING"}
            />
            <Status
              label="Registration Enforcement"
              value={categories.registrationEnforcement ?? "PENDING"}
            />
            <Status
              label="Age Gate"
              value={categories.ageGate ?? "PENDING"}
            />
            <Status
              label="Age Gate Bypass Protection"
              value={categories.ageGateBypassProtection ?? "PENDING"}
            />
            <Status
              label="Privacy Policy"
              value={categories.privacyPolicy ?? "PENDING"}
            />
            <Status label="Terms" value={categories.terms ?? "PENDING"} />
            <Status
              label="Participant Agreement/Consent"
              value={categories.participantAgreement ?? "PENDING"}
            />
            <Status
              label="Lumina Enforcement"
              value={categories.luminaEnforcement ?? "PENDING"}
            />
            <Status
              label="AI Kimberly Enforcement"
              value={categories.aiKimberlyEnforcement ?? "PENDING"}
            />
            <Status
              label="Support Handling"
              value={categories.supportHandling ?? "PENDING"}
            />
            <Status
              label="Data Collection/Data Minimization"
              value={categories.dataCollection ?? "PENDING"}
            />
            <Status
              label="Analytics Compatibility"
              value={categories.analyticsCompatibility ?? "PENDING"}
            />
            <Status
              label="English Experience"
              value={categories.englishExperience ?? "PENDING"}
            />
            <Status
              label="Spanish Experience"
              value={categories.spanishExperience ?? "PENDING"}
            />
            <Status label="Desktop" value={categories.desktop ?? "PENDING"} />
            <Status label="Mobile" value={categories.mobile ?? "PENDING"} />
            <Status
              label="Row 150 Regression"
              value={categories.row150 ?? "PENDING"}
            />
            <Status
              label="Row 151 Regression"
              value={categories.row151 ?? "PENDING"}
            />
            <Status
              label="Row 153 Regression"
              value={categories.row153 ?? "PENDING"}
            />
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row60-age-tests">
          <h2
            id="row60-age-tests"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Age-gate tests
          </h2>
          <ul>
            <Status
              label="Eligible Participant (18 and over 18)"
              value={categories.eligibleParticipant ?? "PENDING"}
            />
            <Status
              label="Ineligible Participant (17 and under 18)"
              value={categories.ineligibleParticipant ?? "PENDING"}
            />
            <Status
              label="Boundary Age"
              value={categories.boundaryAge ?? "PENDING"}
            />
            <Status
              label="Direct URL Bypass"
              value={categories.directUrlBypass ?? "PENDING"}
            />
            <Status
              label="Registration Bypass"
              value={categories.registrationBypass ?? "PENDING"}
            />
            <Status
              label="Checkout Bypass"
              value={categories.checkoutBypass ?? "PENDING"}
            />
            <Status
              label="AI Experience Bypass"
              value={categories.aiExperienceBypass ?? "PENDING"}
            />
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row60-experiences">
          <h2
            id="row60-experiences"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            How to verify the experience
          </h2>
          <ol className="list-decimal space-y-2 pl-5 font-sans text-sm font-light leading-relaxed text-bh-muted">
            <li>
              Eligible: open{" "}
              <a className="underline" href="/register">
                /register
              </a>{" "}
              and choose “Yes, I am 18 or older.” The registration form appears.
              Repeat on{" "}
              <a className="underline" href="/es/register">
                /es/register
              </a>
              .
            </li>
            <li>
              Ineligible: choose “No, I am under 18.” You are taken to{" "}
              <a className="underline" href="/not-eligible">
                /not-eligible
              </a>{" "}
              and cannot open registration, checkout, Lumina, or AI Kimberly URLs.
            </li>
            <li>
              Direct URLs to try after an under-18 confirmation: /architect/lumina,
              /architect/ai-kimberly, /checkout/blueprint, /checkout/community.
            </li>
            <li>
              Marketing pages such as / and /lumina remain readable. They now
              disclose that participants must be at least 18 to register or
              purchase. They do not say The Back Half is “for adults only.”
            </li>
          </ol>
        </section>

        <section className="mb-12" aria-labelledby="row60-legal">
          <h2
            id="row60-legal"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Legal eligibility language
          </h2>
          {model.legal.map((document) => (
            <article key={document.slug} className="mb-6">
              <h3 className="font-sans text-sm font-medium">
                {document.slug}: {document.heading}
              </h3>
              {document.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="mt-2 font-sans text-sm font-light leading-relaxed text-bh-muted"
                >
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
        </section>

        <section className="mb-12" aria-labelledby="row60-ai">
          <h2
            id="row60-ai"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Lumina and AI Kimberly
          </h2>
          <p className="font-sans text-sm font-light leading-relaxed text-bh-muted">
            Lumina conversation is /architect/lumina and requires an eligible
            Architect account. Public /lumina remains a marketing page. There is
            no public AI Kimberly participant chat at launch. Direct URLs such as
            /architect/ai-kimberly are still age-gated so an ineligible visitor
            cannot enter a participant AI experience.
          </p>
        </section>

        <section className="mb-12" aria-labelledby="row60-tests-list">
          <h2
            id="row60-tests-list"
            className="mb-3 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Mechanical tests
          </h2>
          {report ? (
            <>
              <p className="mb-3 font-sans text-sm font-light text-bh-muted">
                Last run {report.generatedAt}. {report.summary.pass}/
                {report.summary.total} passed against {report.origin}.
              </p>
              <ul>
                {report.tests.map((test) => (
                  <Status
                    key={test.id}
                    label={`${test.name} — ${test.detail}`}
                    value={test.result}
                  />
                ))}
              </ul>
            </>
          ) : (
            <p className="font-sans text-sm font-light text-bh-muted">
              Validation JSON has not been generated yet. Run{" "}
              <code>npx tsx scripts/fab-5/row-60-validate.ts</code>.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
