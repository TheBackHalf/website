"use client";

import { useMemo, useState, useTransition } from "react";
import { StatusNotice } from "@/components/design-system";
import type { AlivenessProjectQuestionId } from "@/content/journey/chapter-1-awakening";
import { getChapter1Localized } from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { saveChapter1AlivenessProjectAction } from "@/lib/journey/chapters/actions";
import {
  countNonEmptyAnswers,
  isAlivenessProjectComplete,
  isAlivenessProjectQuestionComplete,
} from "@/lib/journey/chapters/chapter-1";
import { useJourneyDraftAutosave } from "@/lib/journey/progress/use-draft-autosave";
import type { AlivenessProjectAnswers } from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type AlivenessProjectExerciseProps = {
  locale: Locale;
  initialAnswers: AlivenessProjectAnswers;
  onSaved?: (answers: AlivenessProjectAnswers) => void;
  /** Local review adapter — when set, bypasses production server save. */
  onLocalSave?: (
    answers: AlivenessProjectAnswers,
  ) => Promise<{ status: "ok" } | { status: "error" }>;
};

function ensureRowCount(rows: string[], minimum: number): string[] {
  const next = [...rows];
  while (next.length < minimum) {
    next.push("");
  }
  return next;
}

export function AlivenessProjectExercise({
  locale,
  initialAnswers,
  onSaved,
  onLocalSave,
}: AlivenessProjectExerciseProps) {
  const copy = getDictionary(locale).appShell.chapter1;
  const { projectTitle, projectQuestions } = getChapter1Localized(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [activeQuestion, setActiveQuestion] =
    useState<AlivenessProjectQuestionId>("q1");
  const [answers, setAnswers] = useState<AlivenessProjectAnswers>(() => {
    const next = { ...initialAnswers };
    for (const question of projectQuestions) {
      next[question.id] = ensureRowCount(
        initialAnswers[question.id] ?? [],
        Math.max(question.targetCount, 1),
      );
    }
    return next;
  });
  const journeyCopy = getDictionary(locale).appShell.journey;
  const { saving: autoSaving, saved: autoSaved } = useJourneyDraftAutosave({
    value: answers,
    enabled: !onLocalSave,
    save: async (next) => {
      const result = await saveChapter1AlivenessProjectAction({ answers: next });
      if (result.status !== "ok") {
        return { status: "error" as const };
      }
      onSaved?.(next);
      return { status: "ok" as const };
    },
  });

  const active = useMemo(
    () => projectQuestions.find((question) => question.id === activeQuestion)!,
    [activeQuestion, projectQuestions],
  );

  const filled = countNonEmptyAnswers(answers[active.id]);
  const projectComplete = isAlivenessProjectComplete(answers);

  function updateRow(index: number, value: string) {
    setAnswers((current) => {
      const rows = [...current[active.id]];
      rows[index] = value;
      return { ...current, [active.id]: rows };
    });
    setSavedNotice(false);
  }

  function addRow() {
    setAnswers((current) => ({
      ...current,
      [active.id]: [...current[active.id], ""],
    }));
    setSavedNotice(false);
  }

  function persist() {
    setError(null);
    startTransition(async () => {
      if (onLocalSave) {
        const result = await onLocalSave(answers);
        if (result.status !== "ok") {
          setError(resolveAppShellLabel(locale, copy.error));
          return;
        }
        setSavedNotice(true);
        onSaved?.(answers);
        return;
      }
      const result = await saveChapter1AlivenessProjectAction({ answers });
      if (result.status !== "ok") {
        setError(resolveAppShellLabel(locale, copy.error));
        return;
      }
      setSavedNotice(true);
      onSaved?.(answers);
    });
  }

  return (
    <div className="bh-chapter-exercise">
      <header className="bh-chapter-exercise-header">
        <h3 className="bh-onboarding-step-title">{projectTitle}</h3>
        <p className="bh-onboarding-step-body">
          {resolveAppShellLabel(locale, copy.alivenessProjectIntro)}
        </p>
      </header>

      <div
        className="bh-chapter-question-tabs"
        role="tablist"
        aria-label={resolveAppShellLabel(locale, copy.questionsLabel)}
      >
        {projectQuestions.map((question) => {
          const complete = isAlivenessProjectQuestionComplete(
            question.id,
            answers,
          );
          const selected = question.id === activeQuestion;
          return (
            <button
              key={question.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? "bh-chapter-question-tab bh-chapter-question-tab-active"
                  : "bh-chapter-question-tab"
              }
              onClick={() => setActiveQuestion(question.id)}
            >
              <span>{question.heading}</span>
              <span className="bh-chapter-question-tab-meta" aria-hidden="true">
                {complete ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <section
        className="bh-chapter-question-panel"
        role="tabpanel"
        aria-label={active.heading}
      >
        <h4 className="bh-onboarding-subheading">{active.title}</h4>
        <div className="bh-onboarding-prose">
          {active.instructions.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {active.id === "q1" ? (
          <p className="mt-4 font-sans text-sm font-medium text-bh-ink">
            {resolveAppShellLabel(locale, copy.examplesOwnLabel)}
          </p>
        ) : null}
        {active.examples.length > 0 ? (
          <div className="bh-chapter-examples">
            {active.id !== "q1" ? (
              <p className="bh-chapter-examples-label">
                {resolveAppShellLabel(locale, copy.examplesLabel)}
              </p>
            ) : null}
            <ul className="bh-chapter-examples-list">
              {active.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="bh-chapter-progress-meta" aria-live="polite">
          {resolveAppShellLabel(locale, copy.answerProgress)
            .replace("{filled}", String(filled))
            .replace("{target}", String(active.targetCount))}
        </p>

        <ol className="bh-chapter-answer-list">
          {answers[active.id].map((value, index) => {
            const fieldId = `${active.id}-${index + 1}`;
            return (
              <li key={fieldId} className="bh-chapter-answer-item">
                <label className="bh-chapter-answer-label" htmlFor={fieldId}>
                  {active.stem
                    ? `${index + 1}. ${active.stem}`
                    : resolveAppShellLabel(locale, copy.answerLabel).replace(
                        "{n}",
                        String(index + 1),
                      )}
                </label>
                <textarea
                  id={fieldId}
                  className="bh-chapter-answer-input"
                  rows={2}
                  value={value}
                  onChange={(event) => updateRow(index, event.target.value)}
                />
              </li>
            );
          })}
        </ol>

        <div className="bh-onboarding-actions">
          <button
            type="button"
            className="bh-cta bh-cta-secondary"
            onClick={addRow}
            disabled={pending}
          >
            {resolveAppShellLabel(locale, copy.addAnswer)}
          </button>
          <button
            type="button"
            className="bh-cta"
            onClick={persist}
            disabled={pending}
          >
            {pending
              ? resolveAppShellLabel(locale, copy.saving)
              : resolveAppShellLabel(locale, copy.saveAnswers)}
          </button>
        </div>
      </section>

      {savedNotice || autoSaved ? (
        <StatusNotice variant="success">
          {resolveAppShellLabel(locale, copy.saved)}
        </StatusNotice>
      ) : autoSaving ? (
        <p className="mt-4 font-sans text-sm text-bh-muted">
          {resolveAppShellLabel(locale, journeyCopy.draftSaving)}
        </p>
      ) : null}
      {error ? <StatusNotice variant="error">{error}</StatusNotice> : null}
      {projectComplete ? (
        <StatusNotice variant="success">
          {resolveAppShellLabel(locale, copy.projectComplete)}
        </StatusNotice>
      ) : null}
    </div>
  );
}
