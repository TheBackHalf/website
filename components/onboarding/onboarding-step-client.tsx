"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  FormError,
  FormField,
  FormInput,
  FormLabel,
  FormSelect,
  StatusNotice,
} from "@/components/design-system";
import {
  ConsentCheckbox,
  ConsentFieldset,
} from "@/components/legal/consent-controls";
import { AlivenessAssessmentForm } from "@/components/assessment/aliveness-assessment-form";
import { AlivenessResultsView } from "@/components/assessment/aliveness-results-view";
import { AwakeningEntry } from "@/components/journey/awakening-entry";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import { getOnboardingWelcomeMediaPlacement } from "@/content/journey/onboarding-welcome-media";
import { luminaPage } from "@/content/lumina";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { LegalDocument } from "@/content/legal/documents";
import { updateArchitectProfileAction } from "@/lib/account/actions/update-profile";
import { useArchitectProfile } from "@/lib/account/use-architect-profile";
import type { ArchitectProfileView } from "@/lib/account/profile";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { advanceJourneyOnboardingAction } from "@/lib/journey/onboarding/actions";
import { getOnboardingPath } from "@/lib/journey/onboarding/paths";
import type {
  AlivenessAssessmentState,
  OnboardingStepId,
} from "@/lib/journey/onboarding/types";
import { ONBOARDING_STEPS } from "@/lib/journey/onboarding/types";
import type { Locale } from "@/lib/i18n/config";

type OnboardingStepClientProps = {
  locale: Locale;
  step: OnboardingStepId;
  /** Authoritative current step — continue on past steps resumes here. */
  currentStep: OnboardingStepId;
  firstName: string;
  welcomeParagraphs: string[];
  /** Structured Founder Welcome (body + signature). Preferred over flat list. */
  welcomeContent?: {
    bodyParagraphs: string[];
    signatureLines: readonly string[];
  };
  profile: ArchitectProfileView;
  timeZones: string[];
  missingConsents: LegalDocument[];
  allConsentsRecorded: boolean;
  luminaMemoryEnabled: boolean;
  assessment: AlivenessAssessmentState;
  /**
   * Localhost human-acceptance review only.
   * When set, Continue/Back navigate within this base path (?step=)
   * using the same UI — no production auth/entitlement advance.
   */
  reviewBasePath?: string;
};

export function OnboardingStepClient({
  locale,
  step,
  currentStep,
  firstName,
  welcomeParagraphs,
  welcomeContent,
  profile,
  timeZones,
  missingConsents,
  allConsentsRecorded,
  luminaMemoryEnabled,
  assessment,
  reviewBasePath,
}: OnboardingStepClientProps) {
  const router = useRouter();
  const copy = getDictionary(locale).appShell.onboarding;
  const settings = getDictionary(locale).appShell.settings;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [consentChecks, setConsentChecks] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(missingConsents.map((document) => [document.id, false])),
  );
  const [memoryOptIn, setMemoryOptIn] = useState(luminaMemoryEnabled);
  const [responses, setResponses] = useState<Record<string, number>>(
    () => assessment.responses,
  );

  const {
    form,
    errors,
    formError,
    isPending: profilePending,
    updateField,
  } = useArchitectProfile(profile);

  const stepIndex = ONBOARDING_STEPS.indexOf(step);
  const previousStep =
    stepIndex > 0 ? ONBOARDING_STEPS[stepIndex - 1] : null;
  const nextReviewStep =
    stepIndex >= 0 && stepIndex < ONBOARDING_STEPS.length - 1
      ? ONBOARDING_STEPS[stepIndex + 1]
      : null;

  function stepHref(target: OnboardingStepId) {
    if (reviewBasePath) {
      return `${reviewBasePath}?step=${target}`;
    }
    return getOnboardingPath(locale, target);
  }

  function navigateTo(next: OnboardingStepId | "completed") {
    if (next === "completed") {
      if (reviewBasePath) {
        router.replace(`${reviewBasePath}?step=awakening`);
        return;
      }
      router.replace(getLocalizedArchitectPath("journey", locale));
      return;
    }
    router.replace(stepHref(next));
    router.refresh();
  }

  async function runAdvance(extra?: {
    consents?: Array<{ documentId: string; accepted: boolean }>;
    assessmentResponses?: Record<string, unknown>;
    luminaMemoryEnabled?: boolean;
  }): Promise<boolean> {
    setError(null);

    if (reviewBasePath) {
      if (nextReviewStep) {
        navigateTo(nextReviewStep);
        return true;
      }
      navigateTo("completed");
      return true;
    }

    const result = await advanceJourneyOnboardingAction({
      step,
      ...extra,
    });
    if (result.status !== "ok") {
      setError(
        result.code === "incomplete_assessment"
          ? resolveAppShellLabel(locale, copy.assessmentCompleteHint)
          : resolveAppShellLabel(locale, copy.error),
      );
      return false;
    }
    navigateTo(result.currentStep);
    return true;
  }

  function advance(extra?: {
    consents?: Array<{ documentId: string; accepted: boolean }>;
    assessmentResponses?: Record<string, unknown>;
    luminaMemoryEnabled?: boolean;
  }) {
    startTransition(() => {
      void runAdvance(extra);
    });
  }

  return (
    <div className="bh-onboarding-step">
      {error ? (
        <StatusNotice variant="error">
          <p role="alert">{error}</p>
        </StatusNotice>
      ) : null}

      {step === "welcome" ? (
        <section
          aria-labelledby="onboarding-welcome-title"
          className="bh-founder-welcome"
        >
          <h2
            id="onboarding-welcome-title"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.welcomeTitle)}
          </h2>
          <FounderMediaPlacement
            locale={locale}
            placement={getOnboardingWelcomeMediaPlacement(locale)}
          />
          <div className="bh-founder-welcome-letter">
            <div className="bh-founder-welcome-prose">
              {(welcomeContent?.bodyParagraphs ?? welcomeParagraphs).map(
                (paragraph, index) => (
                  <p key={`welcome-body-${index}`}>{paragraph}</p>
                ),
              )}
            </div>
            {welcomeContent?.signatureLines?.length ? (
              <footer className="bh-founder-welcome-signature">
                {welcomeContent.signatureLines.map((line, index) => (
                  <p
                    key={`welcome-sign-${index}`}
                    className={
                      index === 0
                        ? "bh-founder-welcome-signature-begin"
                        : undefined
                    }
                  >
                    {line}
                  </p>
                ))}
              </footer>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "preferences" ? (
        <section aria-labelledby="onboarding-preferences-title">
          <h2
            id="onboarding-preferences-title"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.preferencesTitle)}
          </h2>
          <p className="bh-onboarding-step-body">
            {resolveAppShellLabel(locale, copy.preferencesBody)}
          </p>
          <div className="bh-app-settings-grid">
            <FormField>
              <FormLabel htmlFor="onboarding-first-name">
                {settings.firstName}
              </FormLabel>
              <FormInput
                id="onboarding-first-name"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                autoComplete="given-name"
              />
              {errors.firstName ? (
                <FormError>{errors.firstName}</FormError>
              ) : null}
            </FormField>
            <FormField>
              <FormLabel htmlFor="onboarding-last-name">
                {settings.lastName}
              </FormLabel>
              <FormInput
                id="onboarding-last-name"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                autoComplete="family-name"
              />
              {errors.lastName ? (
                <FormError>{errors.lastName}</FormError>
              ) : null}
            </FormField>
            <FormField className="bh-app-settings-span-2">
              <FormLabel htmlFor="onboarding-locale">
                {settings.language}
              </FormLabel>
              <FormSelect
                id="onboarding-locale"
                value={form.locale}
                onChange={(event) =>
                  updateField(
                    "locale",
                    event.target.value === "es" ? "es" : "en",
                  )
                }
              >
                <option value="en">{settings.languageEnglish}</option>
                <option value="es">{settings.languageSpanish}</option>
              </FormSelect>
            </FormField>
            <FormField className="bh-app-settings-span-2">
              <FormLabel htmlFor="onboarding-timezone">
                {settings.timeZone}
              </FormLabel>
              <FormSelect
                id="onboarding-timezone"
                value={form.timeZone}
                onChange={(event) => updateField("timeZone", event.target.value)}
              >
                {timeZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </div>
          {formError ? <FormError>{formError}</FormError> : null}
        </section>
      ) : null}

      {step === "consent" ? (
        <section aria-labelledby="onboarding-consent-title">
          <h2
            id="onboarding-consent-title"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.consentTitle)}
          </h2>
          <p className="bh-onboarding-step-body">
            {resolveAppShellLabel(locale, copy.consentBody)}
          </p>
          {allConsentsRecorded ? (
            <StatusNotice variant="success">
              <p>{resolveAppShellLabel(locale, copy.consentAllRecorded)}</p>
            </StatusNotice>
          ) : (
            <ConsentFieldset
              legend={resolveAppShellLabel(locale, copy.consentTitle)}
              hideLegend
            >
              {missingConsents.map((document) => (
                <ConsentCheckbox
                  key={document.id}
                  id={`onboarding-consent-${document.id}`}
                  document={document}
                  locale={locale}
                  checked={Boolean(consentChecks[document.id])}
                  onChange={(accepted) =>
                    setConsentChecks((current) => ({
                      ...current,
                      [document.id]: accepted,
                    }))
                  }
                />
              ))}
            </ConsentFieldset>
          )}
          <label className="bh-app-memory-toggle mt-6 flex items-start gap-3">
            <input
              type="checkbox"
              className="bh-consent-checkbox mt-1"
              checked={memoryOptIn}
              onChange={(event) => setMemoryOptIn(event.target.checked)}
            />
            <span className="font-sans text-sm font-light text-bh-ink">
              {resolveAppShellLabel(locale, copy.consentLuminaMemoryOptional)}
            </span>
          </label>
        </section>
      ) : null}

      {step === "lumina" ? (
        <section aria-labelledby="onboarding-lumina-title">
          <h2 id="onboarding-lumina-title" className="bh-onboarding-step-title">
            {luminaPage.title}
          </h2>
          <p className="bh-onboarding-step-body">
            {resolveAppShellLabel(locale, copy.luminaBody)}
          </p>
          <Link
            href={getLocalizedArchitectPath("lumina", locale)}
            className="bh-cta bh-cta-secondary inline-flex"
          >
            {resolveAppShellLabel(locale, copy.luminaOpen)}
          </Link>
        </section>
      ) : null}

      {step === "assessment" ? (
        <section aria-labelledby="onboarding-assessment-title">
          <h2
            id="onboarding-assessment-title"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.assessmentTitle)}
          </h2>

          {assessment.resultsSnapshot || assessment.completedAt ? (
            <AlivenessResultsView
              locale={locale}
              assessment={assessment}
              nextHref={getOnboardingPath(locale, "awakening")}
              nextLabel={resolveAppShellLabel(locale, copy.awakeningBegin)}
            />
          ) : (
            <AlivenessAssessmentForm
              locale={locale}
              assessment={assessment}
              mode="onboarding"
              reviewOnly={false}
              showSaveButton
              showCompleteButton={false}
              onResponsesChange={setResponses}
            />
          )}
        </section>
      ) : null}

      {step === "awakening" ? (
        <AwakeningEntry
          locale={locale}
          firstName={firstName}
          showBeginCta={false}
        />
      ) : null}

      <div className="bh-onboarding-actions">
        {previousStep ? (
          <Link
            href={stepHref(previousStep)}
            className="bh-cta bh-cta-secondary inline-flex"
          >
            {resolveAppShellLabel(locale, copy.back)}
          </Link>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="bh-cta inline-flex"
          disabled={pending || profilePending}
          onClick={() => {
            // Viewing a prior step: resume the authoritative current step (no re-advance).
            if (!reviewBasePath && step !== currentStep) {
              navigateTo(currentStep);
              return;
            }

            if (step === "preferences") {
              if (reviewBasePath) {
                advance();
                return;
              }
              startTransition(() => {
                void (async () => {
                  const result = await updateArchitectProfileAction({
                    ...form,
                    preserveSupportPreference: true,
                    preservePronunciation: true,
                  });
                  if (result.status !== "success") {
                    if (result.status === "validation_error") {
                      setError(
                        Object.values(result.errors)[0] ??
                          resolveAppShellLabel(locale, copy.error),
                      );
                    } else {
                      setError(resolveAppShellLabel(locale, copy.error));
                    }
                    return;
                  }
                  await runAdvance();
                })();
              });
              return;
            }

            if (step === "consent") {
              advance({
                consents: missingConsents.map((document) => ({
                  documentId: document.id,
                  accepted: Boolean(consentChecks[document.id]),
                })),
                luminaMemoryEnabled: memoryOptIn,
              });
              return;
            }

            if (step === "assessment") {
              advance({ assessmentResponses: responses });
              return;
            }

            advance();
          }}
        >
          {step === "awakening"
            ? resolveAppShellLabel(locale, copy.awakeningBegin)
            : step === "preferences"
              ? resolveAppShellLabel(locale, copy.saveAndContinue)
              : resolveAppShellLabel(locale, copy.continue)}
        </button>
      </div>
    </div>
  );
}
