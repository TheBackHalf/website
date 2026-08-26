import type { Locale } from "@/lib/i18n/config";
import type { OnboardingStepId } from "@/lib/journey/onboarding/types";

/** Client-safe onboarding path helper (no server imports). */
export function getOnboardingPath(
  locale: Locale,
  step?: OnboardingStepId | "completed",
): string {
  const base =
    locale === "es" ? "/es/architect/onboarding" : "/architect/onboarding";
  if (!step || step === "completed") {
    return base;
  }
  return `${base}/${step}`;
}
