"use client";

import { useState, useTransition } from "react";
import { StatusNotice } from "@/components/design-system";
import type { AwakeningReflectionQuestionId } from "@/content/journey/chapter-1-awakening";
import { getChapter1Localized } from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  saveChapter1CommitmentAction,
  saveChapter1ReflectionAction,
} from "@/lib/journey/chapters/actions";
import {
  isAwakeningCommitmentComplete,
  isAwakeningReflectionComplete,
} from "@/lib/journey/chapters/chapter-1";
import { useJourneyDraftAutosave } from "@/lib/journey/progress/use-draft-autosave";
import type {
  AwakeningCommitmentState,
  AwakeningReflectionAnswers,
} from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type AwakeningReflectionProps = {
  locale: Locale;
  initialAnswers: AwakeningReflectionAnswers;
  onSaved?: (answers: AwakeningReflectionAnswers) => void;
};

export function AwakeningReflectionWork({
  locale,
  initialAnswers,
  onSaved,
}: AwakeningReflectionProps) {
  const copy = getDictionary(locale).appShell.chapter1;
  const content = getChapter1Localized(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [answers, setAnswers] =
    useState<AwakeningReflectionAnswers>(initialAnswers);
  const journeyCopy = getDictionary(locale).appShell.journey;
  const { saving: autoSaving, saved: autoSaved } = useJourneyDraftAutosave({
    value: answers,
    save: async (next) => {
      const result = await saveChapter1ReflectionAction({ answers: next });
      if (result.status !== "ok") {
        return { status: "error" as const };
      }
      onSaved?.(next);
      return { status: "ok" as const };
    },
  });

  const complete = isAwakeningReflectionComplete(answers);

  function updateAnswer(id: AwakeningReflectionQuestionId, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSavedNotice(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter1ReflectionAction({ answers });
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
          const fieldId = `awakening-reflection-${question.id}`;
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
      {savedNotice || autoSaved ? (
        <StatusNotice variant="success" className="mt-4">
          {resolveAppShellLabel(locale, copy.saved)}
        </StatusNotice>
      ) : autoSaving ? (
        <p className="mt-4 font-sans text-sm text-bh-muted">
          {resolveAppShellLabel(locale, journeyCopy.draftSaving)}
        </p>
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

type AwakeningCommitmentProps = {
  locale: Locale;
  initialCommitment: AwakeningCommitmentState;
  onSaved?: (commitment: AwakeningCommitmentState) => void;
};

export function AwakeningCommitmentWork({
  locale,
  initialCommitment,
  onSaved,
}: AwakeningCommitmentProps) {
  const copy = getDictionary(locale).appShell.chapter1;
  const weeklyCommitment = getChapter1Localized(locale).weeklyCommitment;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [affirmed, setAffirmed] = useState(initialCommitment.affirmed);
  const [note, setNote] = useState(initialCommitment.note);
  const journeyCopy = getDictionary(locale).appShell.journey;
  const { saving: autoSaving, saved: autoSaved } = useJourneyDraftAutosave({
    value: { affirmed, note },
    save: async (next) => {
      const result = await saveChapter1CommitmentAction(next);
      if (result.status !== "ok") {
        return { status: "error" as const };
      }
      onSaved?.({
        affirmed: next.affirmed,
        note: next.note,
        updatedAt: new Date().toISOString(),
        completedAt: next.affirmed ? new Date().toISOString() : null,
      });
      return { status: "ok" as const };
    },
  });
  const complete = isAwakeningCommitmentComplete({
    affirmed,
    note,
    updatedAt: initialCommitment.updatedAt,
    completedAt: initialCommitment.completedAt,
  });
  const noteId = "awakening-commitment-note";
  const affirmId = "awakening-commitment-affirm";

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveChapter1CommitmentAction({ affirmed, note });
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
      {savedNotice || autoSaved ? (
        <StatusNotice variant="success" className="mt-4">
          {resolveAppShellLabel(locale, copy.saved)}
        </StatusNotice>
      ) : autoSaving ? (
        <p className="mt-4 font-sans text-sm text-bh-muted">
          {resolveAppShellLabel(locale, journeyCopy.draftSaving)}
        </p>
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
