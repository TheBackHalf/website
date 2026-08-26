import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auditJourneyInstructionalIntegrity } from "@/lib/journey/instructional-integrity";
import { REQUIRED_COMPONENTS } from "@/lib/journey/instructional-integrity";

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

export default async function Row196IntegrityReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const audit = auditJourneyInstructionalIntegrity({
    coreTeachingRenderedOnWelcome: true,
  });

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row196-instructional-integrity-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 196 JOURNEY INSTRUCTIONAL INTEGRITY
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 196 — Journey Instructional Integrity Audit
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Independent audit of Chapters I–VII as built. Approved curriculum was
          not rewritten. Core Teaching is restored on the Founder Welcome
          surface. Row 196 is not marked Complete.
        </p>
        <p className="mt-3 font-sans text-sm font-medium">
          Overall: {audit.overall} · curriculum rewritten: no
        </p>

        <section className="mt-10" aria-labelledby="row196-defects">
          <h2 id="row196-defects" className="font-display text-2xl">
            Defects triaged
          </h2>
          <ul className="mt-4 space-y-3 font-sans text-sm">
            {audit.defects.map((defect) => (
              <li key={`${defect.chapter}-${defect.summary}`}>
                <strong className="uppercase">{defect.severity}</strong> ·{" "}
                {defect.status} · Chapter {defect.chapter || "all"} ·{" "}
                {defect.summary}
              </li>
            ))}
          </ul>
        </section>

        {audit.results.map((result) => (
          <section
            key={result.chapter}
            className="mt-10 rounded-2xl border border-bh-purple/10 bg-white/80 p-5 md:p-8"
            aria-labelledby={`ch-${result.chapter}`}
          >
            <h2 id={`ch-${result.chapter}`} className="font-display text-2xl">
              Chapter {result.roman} — {result.titleEn}
            </h2>
            <p className="mt-1 font-sans text-sm text-bh-muted">
              {result.titleEs}
            </p>
            <p className="mt-3 font-sans text-sm">{result.progressionRole}</p>
            <ul className="mt-4 space-y-1 font-sans text-sm">
              {REQUIRED_COMPONENTS.map((component) => {
                const entry = result.components[component];
                return (
                  <li key={component}>
                    {component}: EN {entry.en ? "PASS" : "FAIL"} · ES{" "}
                    {entry.es ? "PASS" : "FAIL"} — {entry.detail}
                  </li>
                );
              })}
              <li>
                Reflection id parity: {result.idParity ? "PASS" : "FAIL"} (
                {result.reflectionCountEn}/{result.reflectionCountEs})
              </li>
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
