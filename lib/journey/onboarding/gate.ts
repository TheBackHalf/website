import { redirect } from "next/navigation";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";
import {
  resolveJourneyOnboardingEligibility,
} from "@/lib/journey/onboarding/eligibility";
import { getOnboardingPath } from "@/lib/journey/onboarding/paths";
import {
  loadOnboardingForEntitledUser,
  resolveResumeStep,
} from "@/lib/journey/onboarding/service";

export { getOnboardingPath } from "@/lib/journey/onboarding/paths";

/**
 * For dashboard/journey: entitled + incomplete onboarding → resume onboarding.
 * Settings/billing/support/logout are not gated here.
 */
export async function redirectIfOnboardingIncomplete(
  userId: string,
  locale: Locale,
): Promise<void> {
  const eligibility = await resolveJourneyOnboardingEligibility(userId);
  if (eligibility.status !== "eligible") {
    return;
  }

  const loaded = await loadOnboardingForEntitledUser(userId);
  if (loaded.status !== "ok") {
    return;
  }

  if (loaded.record.status === "completed") {
    return;
  }

  const resume = resolveResumeStep(loaded.record);
  redirect(getOnboardingPath(locale, resume === "completed" ? undefined : resume));
}

export async function redirectForOnboardingAccess(
  reason: "community_only" | "not_entitled",
  locale: Locale,
): Promise<never> {
  if (reason === "community_only") {
    redirect(getLocalizedArchitectPath("dashboard", locale));
  }
  redirect(`${getLocalizedPath("/checkout", locale)}?need=journey_access`);
}
