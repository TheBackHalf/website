import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { ONBOARDING_STEPS } from "@/lib/journey/onboarding/types";
import type { OnboardingStepId } from "@/lib/journey/onboarding/types";
import type { Locale } from "@/lib/i18n/config";

type OnboardingShellProps = {
  locale: Locale;
  step: OnboardingStepId;
  children: React.ReactNode;
};

function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function OnboardingShell({
  locale,
  step,
  children,
}: OnboardingShellProps) {
  const copy = getDictionary(locale).appShell.onboarding;
  const stepNumber = ONBOARDING_STEPS.indexOf(step) + 1;
  const total = ONBOARDING_STEPS.length;
  const progressPercent = Math.round((stepNumber / total) * 100);

  return (
    <AppShellPage locale={locale} className="bh-onboarding-page">
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, copy.title)}
        description={
          <>
            {resolveAppShellLabel(locale, copy.descriptionLead)}
            <strong className="bh-onboarding-description-emphasis">
              {resolveAppShellLabel(locale, copy.descriptionEmphasis)}
            </strong>
          </>
        }
      />

      <div
        className="bh-onboarding-progress"
        role="group"
        aria-label={resolveAppShellLabel(locale, copy.progressLabel)}
      >
        <div className="bh-onboarding-progress-meta">
          <span>
            {fillTemplate(resolveAppShellLabel(locale, copy.stepOf), {
              current: stepNumber,
              total,
            })}
          </span>
        </div>
        <div
          className="bh-onboarding-progress-track"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={stepNumber}
          aria-label={resolveAppShellLabel(locale, copy.progressLabel)}
        >
          <div
            className="bh-onboarding-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="bh-onboarding-panel">{children}</div>
    </AppShellPage>
  );
}
