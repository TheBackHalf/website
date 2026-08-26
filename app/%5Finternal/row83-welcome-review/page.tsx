import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import { getOnboardingWelcomeMediaPlacement } from "@/content/journey/onboarding-welcome-media";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 83 local media QA only.
 * URL: /_internal/row83-welcome-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only — does not alter production auth/entitlement rules.
 * Remove after Kimberly approves Founder Welcome video.
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

export default async function Row83WelcomeReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  const placement = getOnboardingWelcomeMediaPlacement();
  if (placement.assetStatus !== "available" || !placement.src) {
    notFound();
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-bh-cream px-4 py-10"
      data-bh-temp-qa="row83-welcome-review"
    >
      <div className="w-full max-w-3xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 83 FOUNDER WELCOME
        </p>
        <p className="mb-6 font-sans text-sm font-light text-bh-muted">
          Same Founder Welcome source and playback component as Architect
          onboarding. Full original duration. No autoplay — click Play to
          review.
        </p>
        <FounderMediaPlacement locale="en" placement={placement} />
      </div>
    </main>
  );
}
