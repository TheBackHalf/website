import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { listSpanishFounderVideoReviewItems } from "@/content/journey/es/founder-video-scripts";
import {
  chapter1MediaPlacements,
  resolveChapter1MediaPlacement,
} from "@/content/journey/chapter-1-media";
import { getOnboardingWelcomeMediaPlacement } from "@/content/journey/onboarding-welcome-media";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 49 Founder review only.
 * URL: /_internal/row49-spanish-founder-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 49 complete.
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

export default async function Row49SpanishFounderReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  const items = listSpanishFounderVideoReviewItems();
  const englishWelcome = getOnboardingWelcomeMediaPlacement("en");
  const englishChapter1 = chapter1MediaPlacements.find(
    (entry) => entry.id === "video-2",
  );
  const englishChapter1Resolved = englishChapter1
    ? resolveChapter1MediaPlacement(englishChapter1, "en")
    : null;

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row49-spanish-founder-review"
    >
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 49 SPANISH FOUNDER VIDEOS
        </p>
        <p className="mb-2 font-sans text-sm font-light text-bh-muted">
          Same Spanish locale placements used by the Spanish Architect
          experience. English Founder videos are unchanged. Row 49 is not
          marked complete.
        </p>
        <p className="mb-10 font-sans text-sm font-light text-bh-muted">
          English onboarding video still mapped:{" "}
          {englishWelcome.src ?? "missing"}. English Chapter I video still
          mapped: {englishChapter1Resolved?.src ?? "missing"}.
        </p>

        {items.map((item) => {
          const videoLoaded =
            item.placement.assetStatus === "available" &&
            Boolean(item.placement.src);
          return (
            <section
              key={item.id}
              id={item.id}
              className="mb-14 border-t border-bh-purple/15 pt-8"
            >
              <h2 className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-ink">
                {item.heading}
              </h2>
              <p className="mt-2 font-sans text-sm font-light text-bh-muted">
                Experience / placement: {item.journeyLocation}
              </p>
              <p className="mt-1 font-sans text-sm font-light text-bh-muted">
                Spanish script title: {item.heading}
              </p>
              <p className="mt-1 font-sans text-sm font-light text-bh-muted">
                {videoLoaded
                  ? `Spanish video: ${item.placement.src}`
                  : "Spanish video: not present — English was not substituted"}
              </p>
              <div className="mt-5">
                {videoLoaded && item.placement.src ? (
                  <figure className="bh-founder-media">
                    <figcaption className="bh-founder-media-label">
                      {item.placement.label}
                    </figcaption>
                    <div className="bh-founder-media-frame">
                      <video
                        className="bh-founder-media-video"
                        src={item.placement.src}
                        controls
                        playsInline
                        preload="metadata"
                        data-bh-row49-review-video={item.id}
                      />
                    </div>
                  </figure>
                ) : (
                  <p className="font-sans text-sm font-light text-bh-muted">
                    Spanish video missing for this placement. English was not
                    substituted.
                  </p>
                )}
              </div>
              <div className="bh-founder-welcome-letter mt-6">
                <div className="bh-founder-welcome-prose">
                  {item.script.split("\n\n").map((paragraph, index) => (
                    <p key={`${item.id}-p-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
