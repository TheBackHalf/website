import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Row84AlivenessReviewClient,
  type Row84ReviewView,
} from "@/components/assessment/row84-aliveness-review-client";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 84 human-acceptance review only.
 * URL: /_internal/row84-aliveness-review?view=questions
 * Uses the SAME Aliveness assessment form + results + Lumina stub context path.
 * Localhost-only — no production auth/payment required.
 * Persistence uses browser localStorage for this review session only.
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

type PageProps = {
  searchParams: Promise<{ view?: string }>;
};

function resolveView(value: string | undefined): Row84ReviewView {
  if (value === "results" || value === "lumina") {
    return value;
  }
  return "questions";
}

export default async function Row84AlivenessReviewPage({
  searchParams,
}: PageProps) {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  const params = await searchParams;
  const view = resolveView(params.view);

  return (
    <main
      className="min-h-screen bg-bh-cream text-bh-ink"
      data-bh-temp-qa="row84-aliveness-review"
    >
      <div className="border-b border-bh-border bg-bh-cream px-4 py-3">
        <p className="mx-auto max-w-3xl font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 84 ALIVENESS ASSESSMENT REVIEW
        </p>
        <p className="mx-auto mt-1 max-w-3xl font-sans text-sm font-light text-bh-muted">
          Same production Aliveness Index components. Start at questions → save
          → complete → results → Discuss with Lumina. No production
          auth/payment required. Review persistence is local to this browser.
        </p>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Row84AlivenessReviewClient view={view} />
      </div>
    </main>
  );
}
