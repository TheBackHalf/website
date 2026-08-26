import { redirect } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OnboardingStepClient } from "@/components/onboarding/onboarding-step-client";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { listIanaTimeZones } from "@/lib/account/time-zones";
import { toArchitectProfileView } from "@/lib/account/profile";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  getOnboardingPath,
  redirectForOnboardingAccess,
} from "@/lib/journey/onboarding/gate";
import {
  canAccessOnboardingStep,
  loadOnboardingForEntitledUser,
  resolveResumeStep,
} from "@/lib/journey/onboarding/service";
import { getFounderWelcomeContent } from "@/lib/journey/onboarding/welcome";
import {
  listMissingRequiredOnboardingConsents,
} from "@/lib/journey/onboarding/consent";
import {
  isOnboardingStepId,
  type OnboardingStepId,
} from "@/lib/journey/onboarding/types";
import { getLuminaMemoryStore } from "@/lib/lumina/memory/store";
import type { Locale } from "@/lib/i18n/config";

type OnboardingPageProps = {
  locale: Locale;
  stepParam?: string;
};

export async function OnboardingPage({
  locale,
  stepParam,
}: OnboardingPageProps) {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      const next = getOnboardingPath(locale, stepParam as OnboardingStepId | undefined);
      redirect(`${getLoginPath(locale)}?next=${encodeURIComponent(next)}`);
    }
    throw error;
  }

  const loaded = await loadOnboardingForEntitledUser(actor.user.id);
  if (loaded.status === "blocked") {
    await redirectForOnboardingAccess(loaded.reason === "community_only" ? "community_only" : "not_entitled", locale);
  }

  if (loaded.status !== "ok") {
    redirect(getLocalizedArchitectPath("dashboard", locale));
  }

  const record = loaded.record;
  if (record.status === "completed") {
    redirect(getLocalizedArchitectPath("journey", locale));
  }

  const resume = resolveResumeStep(record);
  if (resume === "completed") {
    redirect(getLocalizedArchitectPath("journey", locale));
  }

  let step: OnboardingStepId = resume;
  if (stepParam) {
    if (!isOnboardingStepId(stepParam)) {
      redirect(getOnboardingPath(locale, resume));
    }
    if (!canAccessOnboardingStep(record, stepParam)) {
      redirect(getOnboardingPath(locale, resume));
    }
    step = stepParam;
  } else {
    redirect(getOnboardingPath(locale, resume));
  }

  const [missingConsents, memory] = await Promise.all([
    listMissingRequiredOnboardingConsents(actor.user.id),
    getLuminaMemoryStore().findMemoryForUser(actor.user.id),
  ]);

  const profile = toArchitectProfileView(actor.user);
  const copy = getDictionary(locale).appShell.onboarding;

  return (
    <OnboardingShell locale={locale} step={step}>
      <OnboardingStepClient
        locale={locale}
        step={step}
        currentStep={resume}
        firstName={actor.user.firstName}
        welcomeParagraphs={[]}
        welcomeContent={getFounderWelcomeContent(actor.user.firstName, locale)}
        profile={profile}
        timeZones={listIanaTimeZones()}
        missingConsents={missingConsents.map((entry) => entry.document)}
        allConsentsRecorded={missingConsents.length === 0}
        luminaMemoryEnabled={Boolean(memory?.enabled)}
        assessment={record.assessment}
      />
      <p className="sr-only">{resolveAppShellLabel(locale, copy.loading)}</p>
    </OnboardingShell>
  );
}
