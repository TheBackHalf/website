import { redirect } from "next/navigation";
import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import { AlivenessAssessmentExperience } from "@/components/assessment/aliveness-assessment-experience";
import { AlivenessResultsView } from "@/components/assessment/aliveness-results-view";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { getLocalizedPath } from "@/lib/i18n/routing";
import {
  getAlivenessAssessmentPath,
} from "@/lib/journey/assessments/paths";
import { loadAlivenessAssessmentForUser } from "@/lib/journey/assessments/service";
import { getOnboardingPath } from "@/lib/journey/onboarding/paths";
import type { Locale } from "@/lib/i18n/config";

type AlivenessAssessmentPageProps = {
  locale: Locale;
  view: "questions" | "results";
};

export async function AlivenessAssessmentPage({
  locale,
  view,
}: AlivenessAssessmentPageProps) {
  const questionsPath = getAlivenessAssessmentPath(locale, "questions");
  const resultsPath = getAlivenessAssessmentPath(locale, "results");
  const copy = getDictionary(locale).appShell.assessment;
  const onboarding = getDictionary(locale).appShell.onboarding;

  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      const next = view === "results" ? resultsPath : questionsPath;
      redirect(`${getLoginPath(locale)}?next=${encodeURIComponent(next)}`);
    }
    throw error;
  }

  const loaded = await loadAlivenessAssessmentForUser(actor.user.id);
  if (loaded.status === "blocked") {
    if (loaded.reason === "community_only") {
      redirect(getLocalizedArchitectPath("dashboard", locale));
    }
    redirect(`${getLocalizedPath("/checkout", locale)}?need=journey_access`);
  }

  const { assessment, complete, record } = loaded;
  const onboardingComplete = record.status === "completed";
  const nextHref = onboardingComplete
    ? getLocalizedArchitectPath("journey", locale)
    : getOnboardingPath(locale, "awakening");
  const nextLabel = onboardingComplete
    ? resolveAppShellLabel(locale, copy.continueJourney)
    : resolveAppShellLabel(locale, onboarding.awakeningBegin);

  if (view === "results") {
    if (!complete) {
      redirect(questionsPath);
    }
    return (
      <AppShellPage locale={locale}>
        <AppShellPageHeader
          title={resolveAppShellLabel(locale, copy.resultsTitle)}
          description={resolveAppShellLabel(locale, copy.resultsDescription)}
        />
        <div className="bh-onboarding-panel">
          <AlivenessResultsView
            locale={locale}
            assessment={assessment}
            nextHref={nextHref}
            nextLabel={nextLabel}
          />
        </div>
      </AppShellPage>
    );
  }

  if (complete) {
    redirect(resultsPath);
  }

  return (
    <AppShellPage locale={locale}>
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, onboarding.assessmentTitle)}
        description={resolveAppShellLabel(locale, copy.questionsDescription)}
      />
      <div className="bh-onboarding-panel">
        <AlivenessAssessmentExperience
          locale={locale}
          assessment={assessment}
          resultsPath={resultsPath}
        />
      </div>
    </AppShellPage>
  );
}
