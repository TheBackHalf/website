"use client";

import { useMemo, useState, useTransition } from "react";
import { StatusNotice } from "@/components/design-system";
import type {
  MirrorDimensionId,
  MirrorMatrixRow,
  MirrorStepId,
} from "@/content/journey/chapter-2-mirror";
import {
  getChapter2Localized,
  type MirrorStepThreeLocalized,
} from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { saveChapter2MirrorExerciseAction } from "@/lib/journey/chapters/chapter-2-actions";
import { useJourneyDraftAutosave } from "@/lib/journey/progress/use-draft-autosave";
import {
  countNonEmptyAnswers,
  isMatrixRowComplete,
  isMirrorExerciseComplete,
  isMirrorStep1Complete,
  isMirrorStep2Complete,
  isMirrorStep3Complete,
  isMirrorStep4Complete,
} from "@/lib/journey/chapters/chapter-2";
import type { MirrorExerciseAnswers } from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type MirrorExerciseProps = {
  locale: Locale;
  initialAnswers: MirrorExerciseAnswers;
  onSaved?: (answers: MirrorExerciseAnswers) => void;
};

const EMPTY_MATRIX_ROW: MirrorMatrixRow = {
  expectation: "",
  intention: "",
  decision: "",
  dailyEvidence: "",
};

function ensureRowCount(rows: string[], minimum: number): string[] {
  const next = [...rows];
  while (next.length < minimum) {
    next.push("");
  }
  return next;
}

function ensureMatrixRows(rows: MirrorMatrixRow[], minimum: number): MirrorMatrixRow[] {
  const next = rows.map((row) => ({ ...row }));
  while (next.length < minimum) {
    next.push({ ...EMPTY_MATRIX_ROW });
  }
  return next;
}

const MATRIX_FIELDS: readonly (keyof MirrorMatrixRow)[] = [
  "expectation",
  "intention",
  "decision",
  "dailyEvidence",
];

/**
 * The manuscript names the four matrix columns as the closing lines of the
 * Step Three instructions, in the same order as MATRIX_FIELDS, in every locale.
 */
function matrixColumnLabels(
  stepThree: MirrorStepThreeLocalized,
): readonly string[] {
  return stepThree.instructions.slice(-MATRIX_FIELDS.length);
}

export function MirrorExercise({
  locale,
  initialAnswers,
  onSaved,
}: MirrorExerciseProps) {
  const copy = getDictionary(locale).appShell.chapter2;
  const content = getChapter2Localized(locale);
  const { stepOne, stepTwo, stepThree, stepFour, dimensions } = content;
  const steps: { id: MirrorStepId; heading: string }[] = [
    { id: "step1", heading: stepOne.heading },
    { id: "step2", heading: stepTwo.heading },
    { id: "step3", heading: stepThree.heading },
    { id: "step4", heading: stepFour.heading },
  ];
  const columnLabels = matrixColumnLabels(stepThree);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [activeStep, setActiveStep] = useState<MirrorStepId>("step1");
  const [answers, setAnswers] = useState<MirrorExerciseAnswers>(() => ({
    step1: ensureRowCount(
      initialAnswers.step1 ?? [],
      Math.max(stepOne.targetCount, 1),
    ),
    step2: ensureRowCount(
      initialAnswers.step2 ?? [],
      Math.max(stepTwo.targetCount, 1),
    ),
    step3: ensureMatrixRows(
      initialAnswers.step3 ?? [],
      Math.max(stepThree.minCompleteRows, 1),
    ),
    step4: { ...initialAnswers.step4 },
  }));
  useJourneyDraftAutosave({
    value: answers,
    save: async (next) => {
      const result = await saveChapter2MirrorExerciseAction({ answers: next });
      if (result.status === "ok") {
        onSaved?.(next);
        return { status: "ok" as const };
      }
      return { status: "error" as const };
    },
  });

  const stepComplete = useMemo(
    () => ({
      step1: isMirrorStep1Complete(answers),
      step2: isMirrorStep2Complete(answers),
      step3: isMirrorStep3Complete(answers),
      step4: isMirrorStep4Complete(answers),
    }),
    [answers],
  );

  const exerciseComplete = isMirrorExerciseComplete(answers);
  const step1Filled = countNonEmptyAnswers(answers.step1);
  const step2Filled = countNonEmptyAnswers(answers.step2);
  const step3Filled = answers.step3.filter(isMatrixRowComplete).length;
  const step4Filled = dimensions.filter(
    (dimension) => answers.step4[dimension.id]?.trim().length > 0,
  ).length;

  function updateListRow(step: "step1" | "step2", index: number, value: string) {
    setAnswers((current) => {
      const rows = [...current[step]];
      rows[index] = value;
      return { ...current, [step]: rows };
    });
    setSavedNotice(false);
  }

  function addListRow(step: "step1" | "step2") {
    setAnswers((current) => ({
      ...current,
      [step]: [...current[step], ""],
    }));
    setSavedNotice(false);
  }

  function updateMatrixRow(
    index: number,
    field: keyof MirrorMatrixRow,
    value: string,
  ) {
    setAnswers((current) => {
      const rows = current.step3.map((row) => ({ ...row }));
      rows[index] = { ...rows[index]!, [field]: value };
      return { ...current, step3: rows };
    });
    setSavedNotice(false);
  }

  function addMatrixRow() {
    setAnswers((current) => ({
      ...current,
      step3: [...current.step3, { ...EMPTY_MATRIX_ROW }],
    }));
    setSavedNotice(false);
  }

  function updateDimension(id: MirrorDimensionId, value: string) {
    setAnswers((current) => ({
      ...current,
      step4: { ...current.step4, [id]: value },
    }));
    setSavedNotice(false);
  }

  function persist() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter2MirrorExerciseAction({ answers });
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
        <h3 className="bh-onboarding-step-title">{content.exerciseTitle}</h3>
        <p className="bh-onboarding-step-body">
          {resolveAppShellLabel(locale, copy.mirrorExerciseIntro)}
        </p>
      </header>

      <div
        className="bh-chapter-question-tabs"
        role="tablist"
        aria-label={resolveAppShellLabel(locale, copy.questionsLabel)}
      >
        {steps.map((step) => {
          const complete = stepComplete[step.id];
          const selected = step.id === activeStep;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? "bh-chapter-question-tab bh-chapter-question-tab-active"
                  : "bh-chapter-question-tab"
              }
              onClick={() => setActiveStep(step.id)}
            >
              <span>{step.heading}</span>
              <span className="bh-chapter-question-tab-meta" aria-hidden="true">
                {complete ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>

      {activeStep === "step1" ? (
        <section
          className="bh-chapter-question-panel"
          role="tabpanel"
          aria-label={stepOne.heading}
        >
          <h4 className="bh-onboarding-subheading">{stepOne.title}</h4>
          <div className="bh-onboarding-prose">
            {stepOne.instructions.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="bh-chapter-examples">
            <p className="bh-chapter-examples-label">
              {resolveAppShellLabel(locale, copy.examplesLabel)}
            </p>
            <ul className="bh-chapter-examples-list">
              {stepOne.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </div>
          <div className="bh-onboarding-prose">
            {stepOne.notice.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="bh-chapter-progress-meta" aria-live="polite">
            {resolveAppShellLabel(locale, copy.answerProgress)
              .replace("{filled}", String(step1Filled))
              .replace("{target}", String(stepOne.targetCount))}
          </p>
          <ol className="bh-chapter-answer-list">
            {answers.step1.map((value, index) => {
              const fieldId = `mirror-step1-${index + 1}`;
              return (
                <li key={fieldId} className="bh-chapter-answer-item">
                  <label className="bh-chapter-answer-label" htmlFor={fieldId}>
                    {`${index + 1}. ${stepOne.stem}`}
                  </label>
                  <textarea
                    id={fieldId}
                    className="bh-chapter-answer-input"
                    rows={2}
                    value={value}
                    onChange={(event) =>
                      updateListRow("step1", index, event.target.value)
                    }
                  />
                </li>
              );
            })}
          </ol>
          <div className="bh-onboarding-actions">
            <button
              type="button"
              className="bh-cta bh-cta-secondary"
              onClick={() => addListRow("step1")}
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
      ) : null}

      {activeStep === "step2" ? (
        <section
          className="bh-chapter-question-panel"
          role="tabpanel"
          aria-label={stepTwo.heading}
        >
          <h4 className="bh-onboarding-subheading">{stepTwo.title}</h4>
          <div className="bh-onboarding-prose">
            {stepTwo.instructions.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="bh-chapter-examples">
            <p className="bh-chapter-examples-label">
              {resolveAppShellLabel(locale, copy.examplesLabel)}
            </p>
            <ul className="bh-chapter-examples-list">
              {stepTwo.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </div>
          <p className="bh-chapter-progress-meta" aria-live="polite">
            {resolveAppShellLabel(locale, copy.answerProgress)
              .replace("{filled}", String(step2Filled))
              .replace("{target}", String(stepTwo.targetCount))}
          </p>
          <ol className="bh-chapter-answer-list">
            {answers.step2.map((value, index) => {
              const fieldId = `mirror-step2-${index + 1}`;
              return (
                <li key={fieldId} className="bh-chapter-answer-item">
                  <label className="bh-chapter-answer-label" htmlFor={fieldId}>
                    {`${index + 1}. ${stepTwo.stem}`}
                  </label>
                  <textarea
                    id={fieldId}
                    className="bh-chapter-answer-input"
                    rows={2}
                    value={value}
                    onChange={(event) =>
                      updateListRow("step2", index, event.target.value)
                    }
                  />
                </li>
              );
            })}
          </ol>
          <div className="bh-onboarding-actions">
            <button
              type="button"
              className="bh-cta bh-cta-secondary"
              onClick={() => addListRow("step2")}
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
      ) : null}

      {activeStep === "step3" ? (
        <section
          className="bh-chapter-question-panel"
          role="tabpanel"
          aria-label={stepThree.heading}
        >
          <h4 className="bh-onboarding-subheading">{stepThree.title}</h4>
          <div className="bh-onboarding-prose">
            {stepThree.instructions.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="bh-chapter-examples">
            <p className="bh-chapter-examples-label">
              {resolveAppShellLabel(locale, copy.examplesLabel)}
            </p>
            <ul className="bh-chapter-examples-list">
              {stepThree.examples.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </div>
          <p className="bh-chapter-progress-meta" aria-live="polite">
            {resolveAppShellLabel(locale, copy.matrixProgress)
              .replace("{filled}", String(step3Filled))
              .replace("{target}", String(stepThree.minCompleteRows))}
          </p>
          <ol className="bh-chapter-answer-list">
            {answers.step3.map((row, index) => {
              const baseId = `mirror-step3-${index + 1}`;
              return (
                <li key={baseId} className="bh-chapter-answer-item">
                  <p className="bh-chapter-answer-label">
                    {resolveAppShellLabel(locale, copy.answerLabel).replace(
                      "{n}",
                      String(index + 1),
                    )}
                  </p>
                  {MATRIX_FIELDS.map((field, fieldIndex) => {
                    const fieldId = `${baseId}-${field}`;
                    const label = columnLabels[fieldIndex] ?? field;
                    return (
                      <div key={field} className="mt-3">
                        <label
                          className="bh-chapter-answer-label"
                          htmlFor={fieldId}
                        >
                          {label}
                        </label>
                        <textarea
                          id={fieldId}
                          className="bh-chapter-answer-input"
                          rows={2}
                          value={row[field]}
                          onChange={(event) =>
                            updateMatrixRow(index, field, event.target.value)
                          }
                        />
                      </div>
                    );
                  })}
                </li>
              );
            })}
          </ol>
          <div className="bh-onboarding-actions">
            <button
              type="button"
              className="bh-cta bh-cta-secondary"
              onClick={addMatrixRow}
              disabled={pending}
            >
              {resolveAppShellLabel(locale, copy.addMatrixRow)}
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
      ) : null}

      {activeStep === "step4" ? (
        <section
          className="bh-chapter-question-panel"
          role="tabpanel"
          aria-label={stepFour.heading}
        >
          <h4 className="bh-onboarding-subheading">{stepFour.title}</h4>
          <div className="bh-onboarding-prose">
            {stepFour.instructions.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="bh-chapter-progress-meta" aria-live="polite">
            {resolveAppShellLabel(locale, copy.dimensionProgress)
              .replace("{filled}", String(step4Filled))
              .replace("{target}", String(stepFour.minFilledDimensions))}
          </p>
          <ol className="bh-chapter-answer-list">
            {dimensions.map((dimension) => {
              const fieldId = `mirror-step4-${dimension.id}`;
              return (
                <li key={dimension.id} className="bh-chapter-answer-item">
                  <label className="bh-chapter-answer-label" htmlFor={fieldId}>
                    {dimension.label} — {dimension.prompt}
                  </label>
                  <textarea
                    id={fieldId}
                    className="bh-chapter-answer-input"
                    rows={3}
                    value={answers.step4[dimension.id] ?? ""}
                    onChange={(event) =>
                      updateDimension(dimension.id, event.target.value)
                    }
                  />
                </li>
              );
            })}
          </ol>
          <div className="bh-onboarding-actions">
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
      ) : null}

      {savedNotice ? (
        <StatusNotice variant="success">
          {resolveAppShellLabel(locale, copy.saved)}
        </StatusNotice>
      ) : null}
      {error ? <StatusNotice variant="error">{error}</StatusNotice> : null}
      {exerciseComplete ? (
        <StatusNotice variant="success">
          {resolveAppShellLabel(locale, copy.projectComplete)}
        </StatusNotice>
      ) : null}
    </div>
  );
}
