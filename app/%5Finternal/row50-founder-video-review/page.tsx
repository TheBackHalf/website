import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { listFounderVideoProductionReviewItems } from "@/content/journey/founder-video-inventory";
import type { FounderVideoReviewItem } from "@/content/journey/founder-video-inventory";
import { Row50ReviewVideo } from "./row50-review-video";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 50 Founder production review only.
 * URL: /_internal/row50-founder-video-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 50 complete.
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

function ReviewVideoSection({
  item,
  index,
}: {
  item: FounderVideoReviewItem;
  index: number;
}) {
  const videoLoaded = item.assetStatus === "available" && Boolean(item.src);
  return (
    <section
      id={`${item.locale}-${item.id}`}
      className="mb-12 border-t border-bh-purple/15 pt-8"
    >
      <h3 className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-ink">
        {index + 1}. {item.title}
      </h3>
      <p className="mt-2 font-sans text-sm font-light text-bh-muted">
        Language: {item.languageLabel}
      </p>
      <p className="mt-1 font-sans text-sm font-light text-bh-muted">
        Experience / title: {item.title}
      </p>
      <p className="mt-1 font-sans text-sm font-light text-bh-muted">
        Application placement: {item.placementPath}
      </p>
      <p className="mt-1 font-sans text-sm font-light text-bh-muted">
        Captions:{" "}
        {item.captionsStatus === "available"
          ? `available (${item.captionsSrc})`
          : "missing"}
      </p>
      <p className="mt-1 font-sans text-sm font-light text-bh-muted">
        Transcript:{" "}
        {item.transcriptStatus === "available"
          ? `available (${item.transcriptSrc})`
          : "missing"}
      </p>
      <p className="mt-1 font-sans text-sm font-light text-bh-muted">
        Poster:{" "}
        {item.posterStatus === "available"
          ? `available (${item.poster})`
          : "missing"}
      </p>
      <p className="mt-1 font-sans text-sm font-light text-bh-muted">
        Accessibility complete: {item.accessibilityComplete ? "yes" : "no"}
      </p>
      <div className="mt-5">
                {videoLoaded && item.src ? (
                  <figure className="bh-founder-media">
                    <div className="bh-founder-media-frame">
                      <Row50ReviewVideo
                        id={`${item.locale}-${item.id}`}
                        locale={item.locale}
                        src={item.src}
                        captionsSrc={item.captionsSrc}
                        poster={item.poster}
                      />
                    </div>
                    {item.transcriptSrc ? (
                      <p className="bh-founder-media-transcript">
                        <a href={item.transcriptSrc}>Transcript</a>
                      </p>
                    ) : null}
                  </figure>
                ) : (
          <p className="font-sans text-sm font-light text-bh-muted">
            Video missing for this placement.
          </p>
        )}
      </div>
    </section>
  );
}

export default async function Row50FounderVideoReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  const { english, spanish } = listFounderVideoProductionReviewItems();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row50-founder-video-review"
    >
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 50 PRODUCE FOUNDER VIDEOS
        </p>
        <p className="mb-10 font-sans text-sm font-light text-bh-muted">
          Same locale-resolved Founder media used by Architect onboarding and
          Journey. Row 50 is not marked complete.
        </p>

        <h2 className="mb-6 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink">
          English Founder Videos
        </h2>
        {english.map((item, index) => (
          <ReviewVideoSection
            key={`en-${item.id}`}
            item={item}
            index={index}
          />
        ))}

        <h2 className="mb-6 mt-16 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink">
          Spanish Founder Videos
        </h2>
        {spanish.map((item, index) => (
          <ReviewVideoSection
            key={`es-${item.id}`}
            item={item}
            index={index}
          />
        ))}
      </div>
    </main>
  );
}
