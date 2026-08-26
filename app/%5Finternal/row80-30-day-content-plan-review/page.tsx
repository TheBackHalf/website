import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow80ReviewModel } from "@/lib/fab-5/row80-plan";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 80 Founder strategy review.
 * URL: /_internal/row80-30-day-content-plan-review
 * Localhost-only. Does not mark Complete. Does not schedule or publish.
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
  if (value === "PASS" || value === "NONE" || value === "NO") return "text-emerald-800";
  if (value === "FAIL") return "text-red-800";
  if (
    value.includes("NOT YET AVAILABLE") ||
    value.includes("EXTERNAL DEPENDENCY") ||
    value.includes("FOUNDER")
  ) {
    return "text-amber-900";
  }
  return "text-bh-ink";
}

export default async function Row80ThirtyDayContentPlanReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow80ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row80-30-day-content-plan-review"
    >
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 80 CONTENT PLAN
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          {model.title}
        </h1>
        <p className="mt-2 font-sans text-sm text-bh-muted">{model.period}</p>
        <p className="mt-4 max-w-3xl font-sans text-sm font-light leading-relaxed text-bh-muted">
          Planning only. Assets were not produced. Posts were not scheduled or
          published. The approved August 28–31 campaign was not rebuilt. Row 82
          was not changed. Row 80 is not marked Complete.
        </p>
        <p className="mt-4 font-sans text-sm font-medium text-amber-900">
          {model.finalStatus}
        </p>

        <section className="mt-10 mb-12" aria-labelledby="row80-strategy">
          <h2
            id="row80-strategy"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Recommended strategy
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            <li>Primary objective: {model.strategy.primaryObjective}</li>
            <li>Instagram cadence: {model.strategy.instagramCadence}</li>
            <li>TikTok cadence: {model.strategy.tiktokCadence}</li>
            <li>Content mix: {model.strategy.contentMix}</li>
            <li>Founder POV frequency: {model.strategy.founderPovFrequency}</li>
            <li>CTA frequency: {model.strategy.enrollmentCtaFrequency}</li>
            <li>Format mix: {model.strategy.formatMix}</li>
            <li>Community bridge: {model.strategy.communityBridge}</li>
          </ul>
          <p className="mt-4 font-sans text-sm text-bh-muted">
            CTA configuration: {model.ctaConfiguration}. Live canonical
            reachability: {model.liveCanonicalReachability}.
          </p>
        </section>

        <section className="mb-12" aria-labelledby="row80-glance">
          <h2
            id="row80-glance"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Month at a glance
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            {model.weeks.map((week) => {
              const count = model.posts.filter((post) => post.week === week.week).length;
              return (
                <li key={week.week}>
                  Week {week.week} ({week.dates}): {week.theme} — {count} posts
                </li>
              );
            })}
            <li>
              Totals: {model.counts.total} posts · Instagram {model.counts.instagram} ·
              TikTok {model.counts.tiktok} · Cross-platform ideas{" "}
              {model.counts.crossPlatform} · Direct enrollment CTAs{" "}
              {model.counts.directEnrollmentCta}
            </li>
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row80-calendar">
          <h2
            id="row80-calendar"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Detailed calendar
          </h2>
          <div className="space-y-4">
            {model.posts.map((post) => (
              <article
                key={post.id}
                className="rounded-sm border border-bh-purple/15 bg-white/70 p-4"
              >
                <p className="font-sans text-xs uppercase tracking-[0.14em] text-bh-muted">
                  {post.date} · {post.weekday} · {post.platform} · {post.pillar}
                </p>
                <h3 className="mt-2 font-display text-2xl">{post.hook}</h3>
                <p className="mt-2 font-sans text-sm font-light leading-relaxed">
                  {post.coreMessage}
                </p>
                <ul className="mt-3 space-y-1 font-sans text-sm text-bh-muted">
                  <li>Format: {post.format}</li>
                  <li>Purpose: {post.purpose}</li>
                  <li>CTA: {post.cta}</li>
                  <li>Destination: {post.destination}</li>
                  <li>Source: {post.source}</li>
                  <li>New asset required: {post.newAssetRequired}</li>
                  <li>Founder input required: {post.founderInputRequired}</li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-12" aria-labelledby="row80-checkpoints">
          <h2
            id="row80-checkpoints"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Performance checkpoints
          </h2>
          <ul className="space-y-2 font-sans text-sm">
            {model.checkpoints.map((item) => (
              <li key={item.name}>
                {item.name} ({item.when}): {item.review}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row80-decisions">
          <h2
            id="row80-decisions"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Founder decisions required
          </h2>
          <p className="mb-4 font-sans text-sm text-bh-muted">
            Unchecked. Session-only. Not recorded as Founder acceptance.
          </p>
          <ul className="space-y-3 font-sans text-sm">
            {model.founderDecisions.map((item) => (
              <li key={item.id}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" defaultChecked={false} />
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="mt-1 block font-light text-bh-muted">
                      {item.recommendation}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12" aria-labelledby="row80-validation">
          <h2
            id="row80-validation"
            className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em]"
          >
            Focused validation
          </h2>
          <ul className="space-y-1 font-sans text-sm">
            <li>
              Brand:{" "}
              <span className={tone(model.validation.brand)}>{model.validation.brand}</span>
            </li>
            <li>
              Founder messaging:{" "}
              <span className={tone(model.validation.founderMessaging)}>
                {model.validation.founderMessaging}
              </span>
            </li>
            <li>
              Journey:{" "}
              <span className={tone(model.validation.journey)}>
                {model.validation.journey}
              </span>
            </li>
            <li>
              Lumina:{" "}
              <span className={tone(model.validation.lumina)}>
                {model.validation.lumina}
              </span>
            </li>
            <li>
              Product reality:{" "}
              <span className={tone(model.validation.productReality)}>
                {model.validation.productReality}
              </span>
            </li>
            <li>
              Claims:{" "}
              <span className={tone(model.validation.claims)}>
                {model.validation.claims}
              </span>
            </li>
            <li>
              Community October 25:{" "}
              <span className={tone(model.validation.communityOctober25)}>
                {model.validation.communityOctober25}
              </span>
            </li>
            <li>
              CTA:{" "}
              <span className={tone(model.validation.cta)}>{model.validation.cta}</span>
            </li>
            <li>
              No invented social proof:{" "}
              <span className={tone(model.validation.noInventedSocialProof)}>
                {model.validation.noInventedSocialProof}
              </span>
            </li>
            <li>Defects found: {model.validation.defectsFound}</li>
            <li>Remaining blockers: {model.validation.remainingBlockers}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
