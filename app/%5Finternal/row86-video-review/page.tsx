import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import {
  chapter2MediaPlacements,
  resolveChapter2MediaPlacement,
} from "@/content/journey/chapter-2-media";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 86 local media QA only.
 * URL: /_internal/row86-video-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only — does not alter production auth/entitlement rules.
 * Remove after Kimberly approves Chapter II Founder video audio/ending.
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

export default async function Row86VideoReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  const base = chapter2MediaPlacements.find((entry) => entry.id === "video-4");
  if (!base) {
    notFound();
  }

  // Explicit Chapter II placement for QA — never Chapter I source/label/endpoint.
  const placement = {
    ...resolveChapter2MediaPlacement(base, "en"),
    label: "CHAPTER II — THE MIRROR",
  };
  if (placement.assetStatus !== "available" || !placement.src) {
    notFound();
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-bh-cream px-4 py-10"
      data-bh-temp-qa="row86-video-review"
    >
      <div className="w-full max-w-3xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 86 FOUNDER VIDEO
        </p>
        <p className="mb-6 font-sans text-sm font-light text-bh-muted">
          Chapter II — The Mirror Founder video. Same source and playback
          component as the Chapter II Journey experience. Full original
          duration. No autoplay — click Play to review.
        </p>
        <FounderMediaPlacement locale="en" placement={placement} />
      </div>
    </main>
  );
}
