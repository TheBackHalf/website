"use client";

import { useMemo, useState, useTransition } from "react";
import { StatusNotice } from "@/components/design-system";
import {
  listAlivenessStatementIds,
  scoreAlivenessTotal,
} from "@/content/journey/aliveness-index";
import { getAlivenessIndexLocalized } from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  completeAlivenessAssessmentAction,
  saveAlivenessAssessmentAction,
} from "@/lib/journey/assessments/actions";
import { saveOnboardingAssessmentAction } from "@/lib/journey/onboarding/actions";
import type { AlivenessAssessmentState } from "@/lib/journey/onboarding/types";
import type { Locale } from "@/lib/i18n/config";

type PersistResult =
  | { status: "ok" }
  | { status: "error"; code: string };

type AlivenessAssessmentFormProps = {
  locale: Locale;
  assessment: AlivenessAssessmentState;
  /** When true, radios are disabled and save/complete are blocked. */
  reviewOnly?: boolean;
  /**
   * onboarding — persist via onboarding action; parent handles advance.
   * experience — persist via assessment actions; calls onComplete when done.
   * local — parent-provided adapters (Row 84 human review / offline QA).
   */
  mode?: "onboarding" | "experience" | "local";
  onResponsesChange?: (responses: Record<string, number>) => void;
  onSaved?: () => void;
  onComplete?: () => void;
  /** Local-mode save adapter. */
  onLocalSave?: (
    responses: Record<string, number>,
  ) => Promise<PersistResult>;
  /** Local-mode complete adapter. */
  onLocalComplete?: (
    responses: Record<string, number>,
  ) => Promise<PersistResult>;
  /** Hide the built-in save button (onboarding uses outer actions). */
  showSaveButton?: boolean;
  showCompleteButton?: boolean;
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

export function AlivenessAssessmentForm({
  locale,
  assessment,
  reviewOnly = false,
  mode = "experience",
  onResponsesChange,
  onSaved,
  onComplete,
  onLocalSave,
  onLocalComplete,
  showSaveButton = true,
  showCompleteButton = false,
}: AlivenessAssessmentFormProps) {
  const copy = getDictionary(locale).appShell.onboarding;
  const assessmentCopy = getDictionary(locale).appShell.assessment;
  const index = getAlivenessIndexLocalized(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [responses, setResponses] = useState<Record<string, number>>(
    () => assessment.responses,
  );

  const statementIds = useMemo(() => listAlivenessStatementIds(), []);
  const answeredCount = useMemo(
    () => statementIds.filter((id) => responses[id] != null).length,
    [responses, statementIds],
  );
  const totalStatements = statementIds.length;
  const totalScore = scoreAlivenessTotal(responses);
  const locked = reviewOnly || Boolean(assessment.completedAt);

  function firstUnansweredId(): string | null {
    return statementIds.find((id) => responses[id] == null) ?? null;
  }

  function focusFirstUnanswered() {
    const id = firstUnansweredId();
    if (!id) return;
    const el = document.getElementById(`aliveness-statement-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const firstRadio = el?.querySelector<HTMLInputElement>(
      'input[type="radio"]:not(:disabled)',
    );
    firstRadio?.focus();
  }

  function updateResponse(statementId: string, value: number) {
    if (locked) return;
    setResponses((current) => {
      const next = { ...current, [statementId]: value };
      onResponsesChange?.(next);
      return next;
    });
    setSavedNotice(false);
    setError(null);
  }

  async function persistSave(): Promise<boolean> {
    setError(null);
    if (locked) {
      setError(resolveAppShellLabel(locale, assessmentCopy.reviewOnlyHint));
      return false;
    }
    if (mode === "local") {
      const result = await onLocalSave?.(responses);
      if (!result || result.status !== "ok") {
        setError(resolveAppShellLabel(locale, copy.error));
        return false;
      }
    } else if (mode === "onboarding") {
      const result = await saveOnboardingAssessmentAction({ responses });
      if (result.status !== "ok") {
        setError(
          result.code === "step_locked"
            ? resolveAppShellLabel(locale, assessmentCopy.reviewOnlyHint)
            : resolveAppShellLabel(locale, copy.error),
        );
        return false;
      }
    } else {
      const result = await saveAlivenessAssessmentAction({ responses });
      if (result.status !== "ok") {
        setError(
          result.code === "review_only"
            ? resolveAppShellLabel(locale, assessmentCopy.reviewOnlyHint)
            : resolveAppShellLabel(locale, copy.error),
        );
        return false;
      }
    }
    setSavedNotice(true);
    onSaved?.();
    return true;
  }

  async function persistComplete(): Promise<boolean> {
    setError(null);
    if (locked) {
      onComplete?.();
      return true;
    }
    if (totalScore == null) {
      setError(resolveAppShellLabel(locale, copy.assessmentCompleteHint));
      focusFirstUnanswered();
      return false;
    }
    if (mode === "local") {
      const result = await onLocalComplete?.(responses);
      if (!result || result.status !== "ok") {
        if (result?.status === "error" && result.code === "incomplete_assessment") {
          setError(resolveAppShellLabel(locale, copy.assessmentCompleteHint));
          focusFirstUnanswered();
          return false;
        }
        setError(resolveAppShellLabel(locale, copy.error));
        return false;
      }
      onComplete?.();
      return true;
    }
    const result = await completeAlivenessAssessmentAction({ responses });
    if (result.status !== "ok") {
      setError(
        result.code === "incomplete_assessment"
          ? resolveAppShellLabel(locale, copy.assessmentCompleteHint)
          : resolveAppShellLabel(locale, copy.error),
      );
      if (result.code === "incomplete_assessment") {
        focusFirstUnanswered();
      }
      return false;
    }
    onComplete?.();
    return true;
  }

  return (
    <div className="bh-aliveness-form">
      {error ? (
        <StatusNotice variant="error">
          <p role="alert">{error}</p>
        </StatusNotice>
      ) : null}
      {savedNotice ? (
        <StatusNotice variant="success">
          <p>{resolveAppShellLabel(locale, assessmentCopy.saved)}</p>
        </StatusNotice>
      ) : null}
      {locked ? (
        <StatusNotice variant="pending">
          <p>{resolveAppShellLabel(locale, assessmentCopy.reviewOnlyHint)}</p>
        </StatusNotice>
      ) : null}

      <div className="bh-onboarding-prose">
        {index.intro.map((line) => (
          <p key={line}>
            {line === "Aliveness." ? (
              <strong className="bh-onboarding-description-emphasis">{line}</strong>
            ) : (
              line
            )}
          </p>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="bh-onboarding-subheading">
          {resolveAppShellLabel(locale, copy.assessmentScaleLabel)}
        </h3>
        <ul className="bh-onboarding-scale-list">
          {index.scale.map((option) => (
            <li key={option.value}>
              {option.value} — {option.label}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 font-sans text-sm text-bh-muted" aria-live="polite">
        {fillTemplate(resolveAppShellLabel(locale, copy.assessmentProgress), {
          answered: answeredCount,
          total: totalStatements,
        })}
      </p>

      <div className="bh-onboarding-assessment-domains">
        {index.domains.map((domain) => (
          <fieldset key={domain.id} className="bh-onboarding-domain">
            <legend className="bh-onboarding-domain-title">{domain.name}</legend>
            {domain.statements.map((statement) => (
              <div
                key={statement.id}
                id={`aliveness-statement-${statement.id}`}
                className="bh-onboarding-statement"
              >
                <p className="bh-onboarding-statement-text">
                  {statement.text}
                </p>
                <div
                  className="bh-onboarding-rating-row"
                  role="radiogroup"
                  aria-label={statement.text}
                  aria-disabled={locked || undefined}
                >
                  {index.scale.map((option) => {
                    const inputId = `${statement.id}-${option.value}`;
                    return (
                      <label
                        key={option.value}
                        htmlFor={inputId}
                        className="bh-onboarding-rating"
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name={statement.id}
                          value={option.value}
                          checked={responses[statement.id] === option.value}
                          disabled={locked || pending}
                          onChange={() =>
                            updateResponse(statement.id, option.value)
                          }
                        />
                        <span>
                          {option.value}
                          <span className="sr-only"> — {option.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </fieldset>
        ))}
      </div>

      {totalScore != null ? (
        <p className="mt-6 font-sans text-base text-bh-ink">
          {fillTemplate(
            resolveAppShellLabel(locale, copy.assessmentScoreLabel),
            { score: totalScore, max: index.maxTotal },
          )}
        </p>
      ) : null}

      {(showSaveButton || showCompleteButton) && !locked ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {showSaveButton ? (
            <button
              type="button"
              className="bh-cta bh-cta-secondary inline-flex"
              disabled={pending}
              onClick={() => {
                startTransition(() => {
                  void persistSave();
                });
              }}
            >
              {resolveAppShellLabel(locale, copy.assessmentSave)}
            </button>
          ) : null}
          {showCompleteButton ? (
            <button
              type="button"
              className="bh-cta inline-flex"
              disabled={pending}
              aria-disabled={totalScore == null || undefined}
              onClick={() => {
                startTransition(() => {
                  void persistComplete();
                });
              }}
            >
              {resolveAppShellLabel(locale, assessmentCopy.viewResults)}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Imperative helpers for onboarding parent to read latest local responses. */
export type AlivenessAssessmentFormHandle = {
  getResponses: () => Record<string, number>;
};
