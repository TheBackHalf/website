"use client";

import { useState, useTransition } from "react";
import { BackHalfDeclarationDownload } from "@/components/journey/chapter-7/declaration-download";
import { StatusNotice } from "@/components/design-system";
import type { BeginningReflectionQuestionId } from "@/content/journey/chapter-7-beginning";
import { getChapter7Localized } from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  saveChapter7CommitmentAction,
  saveChapter7PracticeAction,
  saveChapter7ReflectionAction,
} from "@/lib/journey/chapters/chapter-7-actions";
import {
  isBeginningCommitmentComplete,
  isBeginningPracticeComplete,
  isBeginningReflectionComplete,
} from "@/lib/journey/chapters/chapter-7";
import type {
  BeginningCommitmentState,
  BeginningPracticeState,
  BeginningReflectionAnswers,
} from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type BeginningReflectionProps = {
  locale: Locale;
  initialAnswers: BeginningReflectionAnswers;
  onSaved?: (answers: BeginningReflectionAnswers) => void;
};

export function BeginningReflectionWork({
  locale,
  initialAnswers,
  onSaved,
}: BeginningReflectionProps) {
  const copy = getDictionary(locale).appShell.chapter7;
  const content = getChapter7Localized(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [answers, setAnswers] =
    useState<BeginningReflectionAnswers>(initialAnswers);
  const complete = isBeginningReflectionComplete(answers);

  function updateAnswer(id: BeginningReflectionQuestionId, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSavedNotice(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter7ReflectionAction({ answers });
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
          const fieldId = `beginning-reflection-${question.id}`;
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

type BeginningPracticeProps = {
  locale: Locale;
  initialPractice: BeginningPracticeState;
  onSaved?: (practice: BeginningPracticeState) => void;
};

export function BeginningPracticeWork({
  locale,
  initialPractice,
  onSaved,
}: BeginningPracticeProps) {
  const copy = getDictionary(locale).appShell.chapter7;
  const practice = getChapter7Localized(locale).practice;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [statement, setStatement] = useState(initialPractice.statement);
  const [signature, setSignature] = useState(initialPractice.signature);
  const [signedDate, setSignedDate] = useState(initialPractice.signedDate);
  const complete = isBeginningPracticeComplete({
    statement,
    signature,
    signedDate,
  });
  const fieldId = "beginning-declaration-field";
  const signatureId = "beginning-declaration-signature";
  const dateId = "beginning-declaration-date";

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter7PracticeAction({
        statement,
        signature,
        signedDate,
      });
      if (result.status !== "ok") {
        setError(resolveAppShellLabel(locale, copy.error));
        return;
      }
      setSavedNotice(true);
      onSaved?.({
        statement,
        signature,
        signedDate,
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
        aria-describedby="beginning-practice-hint"
      />
      <div className="bh-onboarding-prose mt-6">
        {practice.remember.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <label
        htmlFor={signatureId}
        className="mt-6 block font-display text-lg text-bh-ink"
      >
        {resolveAppShellLabel(locale, copy.signatureLabel)}
      </label>
      <input
        id={signatureId}
        type="text"
        className="bh-chapter-answer-input mt-3 w-full"
        value={signature}
        onChange={(event) => {
          setSignature(event.target.value);
          setSavedNotice(false);
        }}
        autoComplete="name"
      />
      <label
        htmlFor={dateId}
        className="mt-6 block font-display text-lg text-bh-ink"
      >
        {resolveAppShellLabel(locale, copy.signedDateLabel)}
      </label>
      <input
        id={dateId}
        type="date"
        className="bh-chapter-answer-input mt-3 w-full"
        value={signedDate}
        onChange={(event) => {
          setSignedDate(event.target.value);
          setSavedNotice(false);
        }}
      />
      <p
        id="beginning-practice-hint"
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
        <BackHalfDeclarationDownload locale={locale} />
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

type BeginningCommitmentProps = {
  locale: Locale;
  initialCommitment: BeginningCommitmentState;
  onSaved?: (commitment: BeginningCommitmentState) => void;
};

export function BeginningCommitmentWork({
  locale,
  initialCommitment,
  onSaved,
}: BeginningCommitmentProps) {
  const copy = getDictionary(locale).appShell.chapter7;
  const weeklyCommitment = getChapter7Localized(locale).weeklyCommitment;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [affirmed, setAffirmed] = useState(initialCommitment.affirmed);
  const [note, setNote] = useState(initialCommitment.note);
  const complete = isBeginningCommitmentComplete({
    affirmed,
    note,
    updatedAt: initialCommitment.updatedAt,
    completedAt: initialCommitment.completedAt,
  });
  const noteId = "beginning-commitment-note";
  const affirmId = "beginning-commitment-affirm";

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter7CommitmentAction({ affirmed, note });
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
