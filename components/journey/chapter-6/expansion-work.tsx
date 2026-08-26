"use client";

import { useState, useTransition } from "react";
import { ExpansionPlanDownload } from "@/components/journey/chapter-6/expansion-plan-download";
import { StatusNotice } from "@/components/design-system";
import type {
  ExpansionPracticeId,
  ExpansionReflectionQuestionId,
} from "@/content/journey/chapter-6-expansion";
import { getChapter6Localized } from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  saveChapter6CommitmentAction,
  saveChapter6PracticeAction,
  saveChapter6ReflectionAction,
} from "@/lib/journey/chapters/chapter-6-actions";
import {
  isExpansionCommitmentComplete,
  isExpansionPracticeComplete,
  isExpansionReflectionComplete,
} from "@/lib/journey/chapters/chapter-6";
import type {
  ExpansionCommitmentState,
  ExpansionPracticeAnswers,
  ExpansionPracticeState,
  ExpansionReflectionAnswers,
} from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type ExpansionReflectionProps = {
  locale: Locale;
  initialAnswers: ExpansionReflectionAnswers;
  onSaved?: (answers: ExpansionReflectionAnswers) => void;
};

export function ExpansionReflectionWork({
  locale,
  initialAnswers,
  onSaved,
}: ExpansionReflectionProps) {
  const copy = getDictionary(locale).appShell.chapter6;
  const content = getChapter6Localized(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [answers, setAnswers] =
    useState<ExpansionReflectionAnswers>(initialAnswers);

  const complete = isExpansionReflectionComplete(answers);

  function updateAnswer(id: ExpansionReflectionQuestionId, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSavedNotice(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter6ReflectionAction({ answers });
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
          const fieldId = `expansion-reflection-${question.id}`;
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

type ExpansionPracticeProps = {
  locale: Locale;
  initialPractice: ExpansionPracticeState;
  onSaved?: (practice: ExpansionPracticeState) => void;
};

export function ExpansionPracticeWork({
  locale,
  initialPractice,
  onSaved,
}: ExpansionPracticeProps) {
  const copy = getDictionary(locale).appShell.chapter6;
  const practice = getChapter6Localized(locale).practice;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [answers, setAnswers] = useState<ExpansionPracticeAnswers>(
    initialPractice.answers,
  );
  const complete = isExpansionPracticeComplete(answers);

  function updateAnswer(id: ExpansionPracticeId, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSavedNotice(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter6PracticeAction({ answers });
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
      <ol className="mt-6 space-y-6">
        {practice.entries.map((entry, index) => {
          const fieldId = `expansion-practice-${entry.id}`;
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
              <p className="mt-2 font-sans text-base text-bh-ink">
                {entry.prompt}
              </p>
              <textarea
                id={fieldId}
                className="bh-chapter-answer-input mt-3 min-h-24 w-full"
                value={answers[entry.id]}
                onChange={(event) =>
                  updateAnswer(entry.id, event.target.value)
                }
                rows={4}
                aria-describedby={
                  index === 0 ? "expansion-practice-hint" : undefined
                }
              />
            </li>
          );
        })}
      </ol>
      <div className="bh-onboarding-prose mt-6">
        <p>{practice.remember}</p>
      </div>
      <p
        id="expansion-practice-hint"
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
        <ExpansionPlanDownload locale={locale} />
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

type ExpansionCommitmentProps = {
  locale: Locale;
  initialCommitment: ExpansionCommitmentState;
  onSaved?: (commitment: ExpansionCommitmentState) => void;
};

export function ExpansionCommitmentWork({
  locale,
  initialCommitment,
  onSaved,
}: ExpansionCommitmentProps) {
  const copy = getDictionary(locale).appShell.chapter6;
  const weeklyCommitment = getChapter6Localized(locale).weeklyCommitment;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [affirmed, setAffirmed] = useState(initialCommitment.affirmed);
  const [note, setNote] = useState(initialCommitment.note);
  const complete = isExpansionCommitmentComplete({
    affirmed,
    note,
    updatedAt: initialCommitment.updatedAt,
    completedAt: initialCommitment.completedAt,
  });
  const noteId = "expansion-commitment-note";
  const affirmId = "expansion-commitment-affirm";

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter6CommitmentAction({ affirmed, note });
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
