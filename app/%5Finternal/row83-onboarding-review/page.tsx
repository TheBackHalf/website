import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OnboardingStepClient } from "@/components/onboarding/onboarding-step-client";
import { getJourneyOnboardingConsentDocuments } from "@/lib/journey/onboarding/consent";
import { getFounderWelcomeContent } from "@/lib/journey/onboarding/welcome";
import {
  emptyAssessmentState,
  isOnboardingStepId,
  type OnboardingStepId,
} from "@/lib/journey/onboarding/types";
import { listIanaTimeZones } from "@/lib/account/time-zones";
import type { ArchitectProfileView } from "@/lib/account/profile";

export const dynamic = "force-dynamic";

const REVIEW_BASE = "/_internal/row83-onboarding-review";

/**
 * TEMPORARY Row 83 human-acceptance review only.
 * URL: /_internal/row83-onboarding-review?step=welcome
 * Uses the SAME OnboardingShell + OnboardingStepClient as production.
 * Localhost-only — does not alter production auth/entitlement.
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

const reviewProfile: ArchitectProfileView = {
  email: "review@localhost",
  firstName: "Kimberly",
  lastName: "Review",
  pronunciation: "",
  locale: "en",
  supportPreference: "",
  timeZone: "America/New_York",
  authProvider: "email",
  hasPassword: true,
  googleLinked: false,
  arcCode: "REVIEW",
  emailVerified: true,
  role: "architect",
};

type PageProps = {
  searchParams: Promise<{ step?: string }>;
};

export default async function Row83OnboardingReviewPage({
  searchParams,
}: PageProps) {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  const params = await searchParams;
  const stepParam = params.step ?? "welcome";
  const step: OnboardingStepId = isOnboardingStepId(stepParam)
    ? stepParam
    : "welcome";

  const missingConsents = getJourneyOnboardingConsentDocuments();

  return (
    <main data-bh-temp-qa="row83-onboarding-review">
      <div className="border-b border-bh-border bg-bh-cream px-4 py-3">
        <p className="mx-auto max-w-3xl font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 83 ONBOARDING REVIEW
        </p>
        <p className="mx-auto mt-1 max-w-3xl font-sans text-sm font-light text-bh-muted">
          Same production onboarding components. Step 1 = Founder Welcome.
          Continue/Back navigate this review route only — no production
          auth/payment required. Purchase confirmation is not an onboarding
          step.
        </p>
      </div>
      <OnboardingShell locale="en" step={step}>
        <OnboardingStepClient
          locale="en"
          step={step}
          currentStep={step}
          firstName="Kimberly"
          welcomeParagraphs={[]}
          welcomeContent={getFounderWelcomeContent("Kimberly")}
          profile={reviewProfile}
          timeZones={listIanaTimeZones()}
          missingConsents={[...missingConsents]}
          allConsentsRecorded={false}
          luminaMemoryEnabled={false}
          assessment={emptyAssessmentState()}
          reviewBasePath={REVIEW_BASE}
        />
      </OnboardingShell>
    </main>
  );
}
