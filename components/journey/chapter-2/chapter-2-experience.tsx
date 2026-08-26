"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Chapter2Resources } from "@/components/journey/chapter-2/chapter-2-resources";
import { MirrorExercise } from "@/components/journey/chapter-2/mirror-exercise";
import {
  MirrorCommitmentWork,
  MirrorReflectionWork,
} from "@/components/journey/chapter-2/mirror-work";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import { ChapterPauseControl } from "@/components/journey/chapter-pause-control";
import { ChapterSectionNav } from "@/components/journey/chapter-section-nav";
import { StatusNotice } from "@/components/design-system";
import {
  CHAPTER_2_SECTIONS,
  type Chapter2SectionId,
} from "@/content/journey/chapter-2-mirror";
import { getChapter2MediaForSection } from "@/content/journey/chapter-2-media";
import {
  getChapter2Localized,
  getJourneyStages,
} from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { advanceChapter2SectionAction } from "@/lib/journey/chapters/chapter-2-actions";
import {
  isMirrorCommitmentComplete,
  isMirrorExerciseComplete,
  isMirrorReflectionComplete,
} from "@/lib/journey/chapters/chapter-2";
import {
  getChapter2Path,
  getChapter2LuminaDiscussionPath,
} from "@/lib/journey/chapters/paths";
import type { Chapter2Record } from "@/lib/journey/chapters/types";
import { flushJourneyDrafts } from "@/lib/journey/progress/use-draft-autosave";
import type { Locale } from "@/lib/i18n/config";

type Chapter2ExperienceProps = {
  locale: Locale;
  firstName?: string | null;
  sectionId: Chapter2SectionId;
  record: Chapter2Record;
};

function sectionLabel(locale: Locale, sectionId: Chapter2SectionId): string {
  const copy = getDictionary(locale).appShell.chapter2;
  switch (sectionId) {
    case "welcome":
      return resolveAppShellLabel(locale, copy.sectionWelcome);
    case "reflection":
      return resolveAppShellLabel(locale, copy.sectionReflection);
    case "practice":
      return resolveAppShellLabel(locale, copy.sectionPractice);
    case "commitment":
      return resolveAppShellLabel(locale, copy.sectionCommitment);
    case "closing":
      return resolveAppShellLabel(locale, copy.sectionClosing);
    case "complete":
      return resolveAppShellLabel(locale, copy.sectionComplete);
  }
}

export function Chapter2Experience({
  locale,
  firstName,
  sectionId,
  record,
}: Chapter2ExperienceProps) {
  const router = useRouter();
  const copy = getDictionary(locale).appShell.chapter2;
  const content = getChapter2Localized(locale);
  const stage = getJourneyStages(locale).find((entry) => entry.id === "mirror");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState(record.mirrorExercise.answers);
  const [reflectionAnswers, setReflectionAnswers] = useState(
    record.reflection.answers,
  );
  const [commitment, setCommitment] = useState(record.commitment);

  const welcomeText = content.personalizeWelcome(
    content.founderWelcomeRaw,
    firstName,
  );
  const welcomeLines = content.formatForDisplay(welcomeText);
  const closingLines = content.formatForDisplay(content.founderClosingRaw);
  const exerciseComplete = isMirrorExerciseComplete(answers);
  const reflectionComplete = isMirrorReflectionComplete(reflectionAnswers);
  const commitmentComplete = isMirrorCommitmentComplete(commitment);
  const welcomeMedia = getChapter2MediaForSection("welcome", locale);

  function continueFrom(section: Chapter2SectionId) {
    setError(null);
    startTransition(async () => {
      await flushJourneyDrafts();
      const result = await advanceChapter2SectionAction({ sectionId: section });
      if (result.status !== "ok") {
        setError(
          result.code === "incomplete_exercise"
            ? resolveAppShellLabel(locale, copy.incompleteWork)
            : resolveAppShellLabel(locale, copy.error),
        );
        return;
      }
      if (result.nextSectionId) {
        router.push(getChapter2Path(locale, result.nextSectionId));
        router.refresh();
      }
    });
  }

  return (
    <div className="bh-chapter-1">
      <header className="bh-chapter-1-hero">
        <p className="bh-eyebrow">{stage?.eyebrow ?? content.shortTitle}</p>
        <h1 className="bh-chapter-1-title font-display text-3xl text-bh-ink md:text-4xl">
          {content.title}
        </h1>
        {stage?.heading?.lines.map((line, index) => (
          <p
            key={line}
            className={
              stage.heading?.accentLineIndex === index
                ? "mt-4 font-display text-xl italic text-bh-purple md:text-2xl"
                : "mt-4 font-display text-xl text-bh-ink md:text-2xl"
            }
          >
            {line}
          </p>
        ))}
      </header>

      <ChapterSectionNav
        locale={locale}
        progressLabel={resolveAppShellLabel(locale, copy.progressLabel)}
        currentSectionId={sectionId}
        completedSectionIds={record.completedSectionIds}
        chapterStatus={record.status}
        doneLabel={resolveAppShellLabel(locale, copy.sectionDone)}
        items={CHAPTER_2_SECTIONS.map((id) => ({
          id,
          label: sectionLabel(locale, id),
          href: getChapter2Path(locale, id),
        }))}
      />
      <ChapterPauseControl
        locale={locale}
        chapterId="chapter-2-mirror"
        sectionId={sectionId}
      />


      {sectionId === "welcome" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-2-welcome-heading"
        >
          <h2
            id="chapter-2-welcome-heading"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.sectionWelcome)}
          </h2>
          {welcomeMedia.map((placement) => (
            <FounderMediaPlacement
              key={placement.id}
              locale={locale}
              placement={placement}
            />
          ))}
          <div className="bh-onboarding-prose">
            {welcomeLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="bh-onboarding-actions">
            <button
              type="button"
              className="bh-cta"
              disabled={pending}
              onClick={() => continueFrom("welcome")}
            >
              {resolveAppShellLabel(locale, copy.continueToReflection)}
            </button>
          </div>
        </section>
      ) : null}

      {sectionId === "reflection" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-2-reflection-heading"
        >
          <h2 id="chapter-2-reflection-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionReflection)}
          </h2>
          <MirrorReflectionWork
            locale={locale}
            initialAnswers={reflectionAnswers}
            onSaved={setReflectionAnswers}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter2Path(locale, "welcome")}
              className="bh-cta bh-cta-secondary"
            >
              {resolveAppShellLabel(locale, copy.back)}
            </Link>
            <button
              type="button"
              className="bh-cta"
              disabled={pending || !reflectionComplete}
              onClick={() => continueFrom("reflection")}
            >
              {resolveAppShellLabel(locale, copy.continueToPractice)}
            </button>
          </div>
          {!reflectionComplete ? (
            <p className="mt-4 font-sans text-sm text-bh-muted">
              {resolveAppShellLabel(locale, copy.incompleteReflection)}
            </p>
          ) : null}
        </section>
      ) : null}

      {sectionId === "practice" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-2-practice-heading"
        >
          <h2 id="chapter-2-practice-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionPractice)}
          </h2>
          <MirrorExercise
            locale={locale}
            initialAnswers={answers}
            onSaved={setAnswers}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter2Path(locale, "reflection")}
              className="bh-cta bh-cta-secondary"
            >
              {resolveAppShellLabel(locale, copy.back)}
            </Link>
            <button
              type="button"
              className="bh-cta"
              disabled={pending || !exerciseComplete}
              onClick={() => continueFrom("practice")}
            >
              {resolveAppShellLabel(locale, copy.continueToCommitment)}
            </button>
          </div>
          {!exerciseComplete ? (
            <p className="mt-4 font-sans text-sm text-bh-muted">
              {resolveAppShellLabel(locale, copy.incompleteProject)}
            </p>
          ) : null}
        </section>
      ) : null}

      {sectionId === "commitment" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-2-commitment-heading"
        >
          <h2 id="chapter-2-commitment-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionCommitment)}
          </h2>
          <MirrorCommitmentWork
            locale={locale}
            initialCommitment={commitment}
            onSaved={setCommitment}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter2Path(locale, "practice")}
              className="bh-cta bh-cta-secondary"
            >
              {resolveAppShellLabel(locale, copy.back)}
            </Link>
            <button
              type="button"
              className="bh-cta"
              disabled={pending || !commitmentComplete}
              onClick={() => continueFrom("commitment")}
            >
              {resolveAppShellLabel(locale, copy.continueToClosing)}
            </button>
          </div>
          {!commitmentComplete ? (
            <p className="mt-4 font-sans text-sm text-bh-muted">
              {resolveAppShellLabel(locale, copy.incompleteCommitment)}
            </p>
          ) : null}
        </section>
      ) : null}

      {sectionId === "closing" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-2-closing-heading"
        >
          <h2
            id="chapter-2-closing-heading"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.sectionClosing)}
          </h2>
          <div className="bh-onboarding-prose">
            {closingLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter2Path(locale, "commitment")}
              className="bh-cta bh-cta-secondary"
            >
              {resolveAppShellLabel(locale, copy.back)}
            </Link>
            <button
              type="button"
              className="bh-cta"
              disabled={pending}
              onClick={() => continueFrom("closing")}
            >
              {resolveAppShellLabel(locale, copy.continueToComplete)}
            </button>
          </div>
        </section>
      ) : null}

      {sectionId === "complete" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-2-complete-heading"
        >
          <h2
            id="chapter-2-complete-heading"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.sectionComplete)}
          </h2>
          <p className="bh-onboarding-step-body">
            {record.status === "completed"
              ? resolveAppShellLabel(locale, copy.completeBody)
              : resolveAppShellLabel(locale, copy.completePendingBody)}
          </p>
          <Chapter2Resources locale={locale} />
          <div className="bh-chapter-1-complete-actions">
            {record.status !== "completed" ? (
              <button
                type="button"
                className="bh-cta bh-chapter-1-complete-action"
                disabled={pending}
                onClick={() => continueFrom("complete")}
              >
                {resolveAppShellLabel(locale, copy.markComplete)}
              </button>
            ) : null}
            <Link
              href={getChapter2LuminaDiscussionPath(locale)}
              className="bh-cta bh-chapter-1-complete-action"
            >
              {resolveAppShellLabel(locale, copy.discussWithLumina)}
            </Link>
            <Link
              href={getLocalizedArchitectPath("dashboard", locale)}
              className="bh-cta bh-chapter-1-complete-action"
            >
              {resolveAppShellLabel(locale, copy.returnDashboard)}
            </Link>
            <Link
              href={getLocalizedArchitectPath("journey", locale)}
              className="bh-cta bh-chapter-1-complete-action"
            >
              {resolveAppShellLabel(locale, copy.returnJourney)}
            </Link>
          </div>
        </section>
      ) : null}

      {error ? (
        <StatusNotice variant="error" className="mt-6">
          {error}
        </StatusNotice>
      ) : null}
    </div>
  );
}
