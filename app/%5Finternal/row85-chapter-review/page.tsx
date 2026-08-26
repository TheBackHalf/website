import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Row85ChapterReviewClient } from "@/components/journey/chapter-1/row85-chapter-review-client";
import { isLegacyCoreTeachingSegment } from "@/lib/journey/chapters/legacy-teaching";
import {
  isChapter1SectionId,
  type Chapter1SectionId,
} from "@/content/journey/chapter-1-awakening";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 85 human-acceptance review only.
 * URL: /_internal/row85-chapter-review?section=welcome
 * Uses the SAME Chapter1Experience + Founder media + Aliveness Project + resources.
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
  searchParams: Promise<{ section?: string }>;
};

function resolveView(
  value: string | undefined,
): Chapter1SectionId | "lumina" {
  if (value === "lumina") return "lumina";
  if (isLegacyCoreTeachingSegment(value) || value === "aliveness-project") {
    return "practice";
  }
  if (value && isChapter1SectionId(value)) return value;
  return "welcome";
}

export default async function Row85ChapterReviewPage({
  searchParams,
}: PageProps) {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  const params = await searchParams;
  const view = resolveView(params.section);

  return (
    <main
      className="min-h-screen bg-bh-cream text-bh-ink"
      data-bh-temp-qa="row85-chapter-review"
    >
      <div className="border-b border-bh-border bg-bh-cream px-4 py-3">
        <p className="mx-auto max-w-3xl font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 85 CHAPTER I REVIEW
        </p>
        <p className="mx-auto mt-1 max-w-3xl font-sans text-sm font-light text-bh-muted">
          Same production Chapter One components. Move through Founder Welcome →
          Reflection Questions → Intentional Practice → Weekly Commitment →
          Founder Closing Reflection → Complete → Discuss with
          Lumina. No production auth/payment required. Review persistence is
          local to this browser.
        </p>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Row85ChapterReviewClient view={view} />
      </div>
    </main>
  );
}
