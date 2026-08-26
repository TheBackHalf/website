import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import {
  CHAPTER_1_VIDEO_2_LETS_BEGIN_END_SECONDS,
  chapter1MediaPlacements,
  resolveChapter1MediaPlacement,
} from "@/content/journey/chapter-1-media";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 85 local media QA only.
 * URL: /_internal/row85-video-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only — does not alter production auth/entitlement rules.
 * Remove after Kimberly approves Founder Video 2 audio.
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

export default async function Row85VideoReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  const base = chapter1MediaPlacements.find((entry) => entry.id === "video-2");
  if (!base) {
    notFound();
  }
  const placement = resolveChapter1MediaPlacement(base, "en");
  if (placement.assetStatus !== "available" || !placement.src) {
    notFound();
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-bh-cream px-4 py-10"
      data-bh-temp-qa="row85-video-review"
    >
      <div className="w-full max-w-3xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          Temporary local QA — Row 85 Founder Video 2
        </p>
        <p className="mb-6 font-sans text-sm font-light text-bh-muted">
          Same Chapter I source + playback component. Stops after “it is the
          beginning” (end of “beginning” at{" "}
          {CHAPTER_1_VIDEO_2_LETS_BEGIN_END_SECONDS.toFixed(2)}s). No autoplay —
          click Play to review.
        </p>
        <FounderMediaPlacement locale="en" placement={placement} />
      </div>
    </main>
  );
}
