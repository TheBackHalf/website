import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  previewSampleVars,
  renderParticipantEmail,
  PARTICIPANT_EMAIL_TEMPLATE_IDS,
} from "@/lib/email/templates";
import { validateBilingualEmailLibrary } from "@/lib/email/templates/validate";

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

export default async function Row145EmailTemplatesReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const validation = validateBilingualEmailLibrary();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row145-email-templates-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 145 BILINGUAL EMAIL TEMPLATES
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 145 — Build Bilingual Email Templates
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder visual review of branded English and Spanish templates.
          Plain-text fallback is included. Launch announcement is templated and
          is not sent. Stripe is not charged. Row 145 is not marked Complete.
        </p>
        <p className="mt-3 font-sans text-sm font-medium">
          Validation: {validation.allPassed ? "PASS" : "FAIL"} · templates{" "}
          {validation.results.length} · banned claims{" "}
          {validation.results.reduce((sum, entry) => sum + entry.claims.length, 0)}
        </p>

        {PARTICIPANT_EMAIL_TEMPLATE_IDS.map((id) => {
          const en = renderParticipantEmail(id, "en", previewSampleVars(id));
          const es = renderParticipantEmail(id, "es", previewSampleVars(id));
          return (
            <section
              key={id}
              className="mt-12 rounded-2xl border border-bh-purple/10 bg-white/80 p-5 md:p-8"
              aria-labelledby={`tpl-${id}`}
            >
              <h2 id={`tpl-${id}`} className="font-display text-2xl">
                {id}
              </h2>
              <p className="mt-2 font-sans text-sm text-bh-muted">
                Category: {en.category} · Transactional:{" "}
                {en.transactional ? "yes" : "no"} · Send authorized:{" "}
                {en.sendAuthorized ? "yes" : "NO — template only"}
              </p>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-sans text-sm font-medium uppercase tracking-[0.14em]">
                    English
                  </h3>
                  <p className="mb-2 font-sans text-sm">{en.subject}</p>
                  <iframe
                    title={`${id} English preview`}
                    srcDoc={en.html}
                    className="h-[420px] w-full rounded-lg border border-bh-purple/15 bg-white"
                  />
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-xs text-bh-muted">
                    {en.text}
                  </pre>
                </div>
                <div>
                  <h3 className="mb-2 font-sans text-sm font-medium uppercase tracking-[0.14em]">
                    Español
                  </h3>
                  <p className="mb-2 font-sans text-sm">{es.subject}</p>
                  <iframe
                    title={`${id} Spanish preview`}
                    srcDoc={es.html}
                    className="h-[420px] w-full rounded-lg border border-bh-purple/15 bg-white"
                  />
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-xs text-bh-muted">
                    {es.text}
                  </pre>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
