"use client";

import { useState, useTransition } from "react";
import { ArchitectIdentityDownload } from "@/components/journey/chapter-5/architect-identity-download";
import { StatusNotice } from "@/components/design-system";
import type { ArchitectReflectionQuestionId } from "@/content/journey/chapter-5-architect";
import { getChapter5Localized } from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  saveChapter5CommitmentAction,
  saveChapter5PracticeAction,
  saveChapter5ReflectionAction,
} from "@/lib/journey/chapters/chapter-5-actions";
import {
  isArchitectCommitmentComplete,
  isArchitectPracticeComplete,
  isArchitectReflectionComplete,
} from "@/lib/journey/chapters/chapter-5";
import type {
  ArchitectCommitmentState,
  ArchitectPracticeState,
  ArchitectReflectionAnswers,
} from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type ArchitectReflectionProps = {
  locale: Locale;
  initialAnswers: ArchitectReflectionAnswers;
  onSaved?: (answers: ArchitectReflectionAnswers) => void;
};

export function ArchitectReflectionWork({
  locale,
  initialAnswers,
  onSaved,
}: ArchitectReflectionProps) {
  const copy = getDictionary(locale).appShell.chapter5;
  const content = getChapter5Localized(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [answers, setAnswers] =
    useState<ArchitectReflectionAnswers>(initialAnswers);

  const complete = isArchitectReflectionComplete(answers);

  function updateAnswer(id: ArchitectReflectionQuestionId, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSavedNotice(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter5ReflectionAction({ answers });
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
          const fieldId = `architect-reflection-${question.id}`;
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

type ArchitectPracticeProps = {
  locale: Locale;
  initialPractice: ArchitectPracticeState;
  onSaved?: (practice: ArchitectPracticeState) => void;
};

export function ArchitectPracticeWork({
  locale,
  initialPractice,
  onSaved,
}: ArchitectPracticeProps) {
  const copy = getDictionary(locale).appShell.chapter5;
  const practice = getChapter5Localized(locale).practice;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [statement, setStatement] = useState(initialPractice.statement);
  const complete = isArchitectPracticeComplete(statement);
  const fieldId = "architect-identity-statement-field";

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter5PracticeAction({ statement });
      if (result.status !== "ok") {
        setError(resolveAppShellLabel(locale, copy.error));
        return;
      }
      setSavedNotice(true);
      onSaved?.({
        statement,
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
      <label
        htmlFor={fieldId}
        className="mt-6 block font-display text-lg text-bh-ink"
      >
        {practice.stem}
      </label>
      <textarea
        id={fieldId}
        className="bh-chapter-answer-input mt-3 min-h-36 w-full"
        value={statement}
        onChange={(event) => {
          setStatement(event.target.value);
          setSavedNotice(false);
        }}
        rows={6}
        aria-describedby="architect-practice-hint"
      />
      <p
        id="architect-practice-hint"
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
        <ArchitectIdentityDownload locale={locale} />
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

type ArchitectCommitmentProps = {
  locale: Locale;
  initialCommitment: ArchitectCommitmentState;
  onSaved?: (commitment: ArchitectCommitmentState) => void;
};

export function ArchitectCommitmentWork({
  locale,
  initialCommitment,
  onSaved,
}: ArchitectCommitmentProps) {
  const copy = getDictionary(locale).appShell.chapter5;
  const weeklyCommitment = getChapter5Localized(locale).weeklyCommitment;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [affirmed, setAffirmed] = useState(initialCommitment.affirmed);
  const [note, setNote] = useState(initialCommitment.note);
  const complete = isArchitectCommitmentComplete({
    affirmed,
    note,
    updatedAt: initialCommitment.updatedAt,
    completedAt: initialCommitment.completedAt,
  });
  const noteId = "architect-commitment-note";
  const affirmId = "architect-commitment-affirm";

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter5CommitmentAction({ affirmed, note });
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
