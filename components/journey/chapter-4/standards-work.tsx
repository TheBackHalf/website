"use client";

import { useState, useTransition } from "react";
import { BackHalfStandardsDownload } from "@/components/journey/chapter-4/back-half-standards-download";
import { StatusNotice } from "@/components/design-system";
import type {
  StandardsPracticeId,
  StandardsReflectionQuestionId,
} from "@/content/journey/chapter-4-standards";
import { getChapter4Localized } from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  saveChapter4CommitmentAction,
  saveChapter4PracticeAction,
  saveChapter4ReflectionAction,
} from "@/lib/journey/chapters/chapter-4-actions";
import {
  isStandardsCommitmentComplete,
  isStandardsPracticeComplete,
  isStandardsReflectionComplete,
} from "@/lib/journey/chapters/chapter-4";
import type {
  StandardsCommitmentState,
  StandardsPracticeAnswers,
  StandardsPracticeState,
  StandardsReflectionAnswers,
} from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type StandardsReflectionProps = {
  locale: Locale;
  initialAnswers: StandardsReflectionAnswers;
  onSaved?: (answers: StandardsReflectionAnswers) => void;
};

export function StandardsReflectionWork({
  locale,
  initialAnswers,
  onSaved,
}: StandardsReflectionProps) {
  const copy = getDictionary(locale).appShell.chapter4;
  const content = getChapter4Localized(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [answers, setAnswers] =
    useState<StandardsReflectionAnswers>(initialAnswers);

  const complete = isStandardsReflectionComplete(answers);

  function updateAnswer(id: StandardsReflectionQuestionId, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSavedNotice(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter4ReflectionAction({ answers });
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
      <h3 className="bh-onboarding-subheading">{content.reflectionTitle}</h3>
      <p className="bh-onboarding-step-body">
        {resolveAppShellLabel(locale, copy.reflectionIntro)}
      </p>
      <ol className="mt-6 space-y-6">
        {content.reflectionQuestions.map((question, index) => {
          const fieldId = `standards-reflection-${question.id}`;
          return (
            <li key={question.id}>
              <label
                htmlFor={fieldId}
                className="block font-display text-lg text-bh-ink"
              >
                <span className="sr-only">
                  {resolveAppShellLabel(locale, copy.answerLabel).replace(
                    "{n}",
                    String(index + 1),
                  )}
                </span>
                {question.prompt}
              </label>
              <textarea
                id={fieldId}
                className="bh-chapter-answer-input mt-3 min-h-28 w-full"
                value={answers[question.id]}
                onChange={(event) =>
                  updateAnswer(question.id, event.target.value)
                }
                rows={4}
              />
            </li>
          );
        })}
      </ol>
      <div className="bh-onboarding-actions mt-6">
        <button
          type="button"
          className="bh-cta"
          disabled={pending}
          onClick={save}
        >
          {pending
            ? resolveAppShellLabel(locale, copy.saving)
            : resolveAppShellLabel(locale, copy.saveAnswers)}
        </button>
      </div>
      {savedNotice ? (
        <StatusNotice variant="success" className="mt-4">
          {resolveAppShellLabel(locale, copy.saved)}
        </StatusNotice>
      ) : null}
      {complete ? (
        <p className="mt-4 font-sans text-sm text-bh-muted">
          {resolveAppShellLabel(locale, copy.reflectionComplete)}
        </p>
      ) : null}
      {error ? (
        <StatusNotice variant="error" className="mt-4">
          {error}
        </StatusNotice>
      ) : null}
    </div>
  );
}

type StandardsPracticeProps = {
  locale: Locale;
  initialPractice: StandardsPracticeState;
  onSaved?: (practice: StandardsPracticeState) => void;
};

export function StandardsPracticeWork({
  locale,
  initialPractice,
  onSaved,
}: StandardsPracticeProps) {
  const copy = getDictionary(locale).appShell.chapter4;
  const practice = getChapter4Localized(locale).practice;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [answers, setAnswers] = useState<StandardsPracticeAnswers>(
    initialPractice.answers,
  );
  const complete = isStandardsPracticeComplete(answers);

  function updateAnswer(id: StandardsPracticeId, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSavedNotice(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter4PracticeAction({ answers });
      if (result.status !== "ok") {
        setError(resolveAppShellLabel(locale, copy.error));
        return;
      }
      setSavedNotice(true);
      onSaved?.({
        answers,
        updatedAt: new Date().toISOString(),
        completedAt: complete ? new Date().toISOString() : null,
      });
    });
  }

  return (
    <div className="bh-chapter-exercise">
      <h3 className="bh-onboarding-subheading">{practice.title}</h3>
      <div className="bh-onboarding-prose">
        {practice.instructions.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="mt-6 font-display text-lg text-bh-ink">
        {practice.examplesIntro}
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6 font-sans text-base text-bh-muted">
        {practice.examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
      <div className="bh-onboarding-prose mt-6">
        {practice.closing.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <ol className="mt-6 space-y-6">
        {practice.entries.map((entry, index) => {
          const fieldId = `standards-practice-${entry.id}`;
          return (
            <li key={entry.id}>
              <label
                htmlFor={fieldId}
                className="block font-display text-lg text-bh-ink"
              >
                <span className="sr-only">
                  {resolveAppShellLabel(locale, copy.answerLabel).replace(
                    "{n}",
                    String(index + 1),
                  )}
                </span>
                {entry.label}
              </label>
              <textarea
                id={fieldId}
                className="bh-chapter-answer-input mt-3 min-h-24 w-full"
                value={answers[entry.id]}
                onChange={(event) =>
                  updateAnswer(entry.id, event.target.value)
                }
                rows={3}
                aria-describedby={
                  index === 0 ? "standards-practice-hint" : undefined
                }
              />
            </li>
          );
        })}
      </ol>
      <p
        id="standards-practice-hint"
        className="mt-2 font-sans text-sm text-bh-muted"
      >
        {resolveAppShellLabel(locale, copy.practiceHint)}
      </p>
      <div className="bh-onboarding-actions mt-6">
        <button
          type="button"
          className="bh-cta"
          disabled={pending}
          onClick={save}
        >
          {pending
            ? resolveAppShellLabel(locale, copy.saving)
            : resolveAppShellLabel(locale, copy.saveAnswers)}
        </button>
        <BackHalfStandardsDownload locale={locale} />
      </div>
      {savedNotice ? (
        <StatusNotice variant="success" className="mt-4">
          {resolveAppShellLabel(locale, copy.saved)}
        </StatusNotice>
      ) : null}
      {complete ? (
        <p className="mt-4 font-sans text-sm text-bh-muted">
          {resolveAppShellLabel(locale, copy.practiceComplete)}
        </p>
      ) : null}
      {error ? (
        <StatusNotice variant="error" className="mt-4">
          {error}
        </StatusNotice>
      ) : null}
    </div>
  );
}

type StandardsCommitmentProps = {
  locale: Locale;
  initialCommitment: StandardsCommitmentState;
  onSaved?: (commitment: StandardsCommitmentState) => void;
};

export function StandardsCommitmentWork({
  locale,
  initialCommitment,
  onSaved,
}: StandardsCommitmentProps) {
  const copy = getDictionary(locale).appShell.chapter4;
  const weeklyCommitment = getChapter4Localized(locale).weeklyCommitment;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [affirmed, setAffirmed] = useState(initialCommitment.affirmed);
  const [note, setNote] = useState(initialCommitment.note);
  const complete = isStandardsCommitmentComplete({
    affirmed,
    note,
    updatedAt: initialCommitment.updatedAt,
    completedAt: initialCommitment.completedAt,
  });
  const noteId = "standards-commitment-note";
  const affirmId = "standards-commitment-affirm";

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter4CommitmentAction({ affirmed, note });
      if (result.status !== "ok") {
        setError(resolveAppShellLabel(locale, copy.error));
        return;
      }
      setSavedNotice(true);
      onSaved?.({
        affirmed,
        note,
        updatedAt: new Date().toISOString(),
        completedAt: affirmed ? new Date().toISOString() : null,
      });
    });
  }

  return (
    <div className="bh-chapter-exercise">
      <h3 className="bh-onboarding-subheading">{weeklyCommitment.title}</h3>
      <p className="bh-onboarding-step-body font-display text-xl italic text-bh-purple md:text-2xl">
        {weeklyCommitment.statement}
      </p>
      <div className="mt-6 flex items-start gap-3">
        <input
          id={affirmId}
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[var(--bh-purple)]"
          checked={affirmed}
          onChange={(event) => {
            setAffirmed(event.target.checked);
            setSavedNotice(false);
          }}
        />
        <label htmlFor={affirmId} className="font-sans text-base text-bh-ink">
          {resolveAppShellLabel(locale, copy.commitmentAffirm)}
        </label>
      </div>
      <label
        htmlFor={noteId}
        className="mt-6 block font-display text-lg text-bh-ink"
      >
        {resolveAppShellLabel(locale, copy.commitmentNoteLabel)}
      </label>
      <textarea
        id={noteId}
        className="bh-chapter-answer-input mt-3 min-h-28 w-full"
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setSavedNotice(false);
        }}
        rows={4}
      />
      <div className="bh-onboarding-actions mt-6">
        <button
          type="button"
          className="bh-cta"
          disabled={pending}
          onClick={save}
        >
          {pending
            ? resolveAppShellLabel(locale, copy.saving)
            : resolveAppShellLabel(locale, copy.saveAnswers)}
        </button>
      </div>
      {savedNotice ? (
        <StatusNotice variant="success" className="mt-4">
          {resolveAppShellLabel(locale, copy.saved)}
        </StatusNotice>
      ) : null}
      {complete ? (
        <p className="mt-4 font-sans text-sm text-bh-muted">
          {resolveAppShellLabel(locale, copy.commitmentComplete)}
        </p>
      ) : null}
      {error ? (
        <StatusNotice variant="error" className="mt-4">
          {error}
        </StatusNotice>
      ) : null}
    </div>
  );
}
