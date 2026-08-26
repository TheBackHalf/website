import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow158ReviewModel } from "@/lib/fab-5/row158-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 158 Founder acceptance review only.
 * URL: /_internal/row158-voice-of-architect-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 158 complete.
 * Never displays Architect email, raw messages, passwords, or payment data.
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
  if (value === "PASS" || value === "NO" || value === "NONE" || value.startsWith("NONE")) {
    return "text-emerald-800";
  }
  if (value === "FAIL" || value === "YES") return "text-red-800";
  if (value.includes("FOUNDER") || value.includes("IMPLEMENTED")) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row158VoiceOfArchitectReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow158ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row158-voice-of-architect-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 158 VOICE-OF-ARCHITECT CAPTURE
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Founder review. Row 158 is not marked Complete. This page inspects the
          capture method for launch-day feedback, confusion, compliments, support
          themes, friction, testimonial/permission requests, and product
          opportunities. Critical issues route into defect triage. Secrets are
          not shown. Testimonials are not invented.
        </p>
        <p className={`mt-4 font-sans text-sm font-medium ${tone(model.finalStatus)}`}>
          {model.finalStatus}
        </p>
        <p className="mt-2 font-sans text-sm">
          Founder acceptance:{" "}
          <span className={tone(model.founderAcceptanceRecorded)}>
            {model.founderAcceptanceRecorded}
          </span>
        </p>
        <p className="mt-2 font-sans text-sm text-bh-muted">
          Protocol: {model.protocolPath}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row158-status">
          <h2
            id="row158-status"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Verified status
          </h2>
          <ul className="space-y-1 font-sans text-sm font-light text-bh-ink">
            <li>
              Protocol present:{" "}
              <span className={tone(model.protocolPresent)}>
                {model.protocolPresent}
              </span>
            </li>
            <li>Launch day: {model.launchDay} ({model.timezone})</li>
            <li>
              New public form:{" "}
              <span className={tone(model.newPublicForm)}>
                {model.newPublicForm}
              </span>
            </li>
            <li>
              Invented testimonials:{" "}
              <span className={tone(model.inventedTestimonial)}>
                {model.inventedTestimonial === "PASS" ? "NONE" : "FAIL"}
              </span>
            </li>
            <li>
              Stripe / DNS / auth changed:{" "}
              <span className={tone(model.stripeDnsAuthChanged)}>
                {model.stripeDnsAuthChanged}
              </span>
            </li>
            <li>
              Nia brand/curriculum ownership taken:{" "}
              <span className={tone(model.niaBrandOwnershipTaken)}>
                {model.niaBrandOwnershipTaken}
              </span>
            </li>
            <li>
              Committed live Architect entries: {model.committedLiveEntries}
            </li>
          </ul>
        </section>

        <section className="mt-10 mb-12" aria-labelledby="row158-categories">
          <h2
            id="row158-categories"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Capture categories
          </h2>
          <ul className="space-y-1 font-sans text-sm font-light text-bh-ink">
            {model.categories.map((category) => (
              <li key={category.id}>
                <span className="font-medium">{category.id}</span>
                {" — "}
                {category.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 mb-12" aria-labelledby="row158-routes">
          <h2
            id="row158-routes"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Routing
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-sans text-sm font-light">
              <thead>
                <tr className="border-b border-bh-ink/15">
                  <th className="py-2 pr-4 font-medium">Route</th>
                  <th className="py-2 pr-4 font-medium">Owner</th>
                  <th className="py-2 font-medium">Coordinator</th>
                </tr>
              </thead>
              <tbody>
                {model.routes.map((row) => (
                  <tr key={row.route} className="border-b border-bh-ink/10">
                    <td className="py-2 pr-4">{row.route}</td>
                    <td className="py-2 pr-4">{row.owner}</td>
                    <td className="py-2">{row.coordinator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 mb-12" aria-labelledby="row158-scenarios">
          <h2
            id="row158-scenarios"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Controlled TEST classification
          </h2>
          <p className="mb-4 font-sans text-sm font-light text-bh-muted">
            These rows are labeled TEST. They are not real Architect quotations.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-sans text-sm font-light">
              <thead>
                <tr className="border-b border-bh-ink/15">
                  <th className="py-2 pr-4 font-medium">Scenario</th>
                  <th className="py-2 pr-4 font-medium">Category</th>
                  <th className="py-2 pr-4 font-medium">Route</th>
                  <th className="py-2 pr-4 font-medium">Defect triage</th>
                  <th className="py-2 font-medium">Publish testimonial</th>
                </tr>
              </thead>
              <tbody>
                {model.scenarios.map((row) => (
                  <tr key={row.id} className="border-b border-bh-ink/10">
                    <td className="py-2 pr-4">{row.label}</td>
                    <td className="py-2 pr-4">{row.category}</td>
                    <td className="py-2 pr-4">{row.route}</td>
                    <td className={`py-2 pr-4 ${tone(row.defectTriage)}`}>
                      {row.defectTriage}
                    </td>
                    <td className={`py-2 ${tone(row.publishTestimonial)}`}>
                      {row.publishTestimonial}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 mb-12" aria-labelledby="row158-checklist">
          <h2
            id="row158-checklist"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink"
          >
            Founder checklist
          </h2>
          <ul className="list-disc space-y-1 pl-5 font-sans text-sm font-light text-bh-ink">
            {model.founderChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
