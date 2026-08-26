"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Chapter3Resources } from "@/components/journey/chapter-3/chapter-3-resources";
import {
  DecisionCommitmentWork,
  DecisionPracticeWork,
  DecisionReflectionWork,
} from "@/components/journey/chapter-3/decision-work";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import { StatusNotice } from "@/components/design-system";
import {
  CHAPTER_3_SECTIONS,
  type Chapter3SectionId,
} from "@/content/journey/chapter-3-decision";
import { getChapter3MediaForSection } from "@/content/journey/chapter-3-media";
import {
  getChapter3Localized,
  getJourneyStages,
} from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { advanceChapter3SectionAction } from "@/lib/journey/chapters/chapter-3-actions";
import {
  isDecisionCommitmentComplete,
  isDecisionPracticeComplete,
  isDecisionReflectionComplete,
} from "@/lib/journey/chapters/chapter-3";
import {
  getChapter3Path,
  getChapter3LuminaDiscussionPath,
} from "@/lib/journey/chapters/paths";
import type { Chapter3Record } from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type Chapter3ExperienceProps = {
  locale: Locale;
  firstName?: string | null;
  sectionId: Chapter3SectionId;
  record: Chapter3Record;
};

function sectionLabel(locale: Locale, sectionId: Chapter3SectionId): string {
  const copy = getDictionary(locale).appShell.chapter3;
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

export function Chapter3Experience({
  locale,
  firstName,
  sectionId,
  record,
}: Chapter3ExperienceProps) {
  const router = useRouter();
  const copy = getDictionary(locale).appShell.chapter3;
  const content = getChapter3Localized(locale);
  const stage = getJourneyStages(locale).find(
    (entry) => entry.id === "decision",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reflectionAnswers, setReflectionAnswers] = useState(
    record.reflection.answers,
  );
  const [practice, setPractice] = useState(record.practice);
  const [commitment, setCommitment] = useState(record.commitment);

  const welcomeText = content.personalizeWelcome(
    content.founderWelcomeRaw,
    firstName,
  );
  const welcomeLines = content.formatForDisplay(welcomeText);
  const closingLines = content.formatForDisplay(content.founderClosingRaw);
  const welcomeMedia = getChapter3MediaForSection("welcome", locale);

  const reflectionComplete = isDecisionReflectionComplete(reflectionAnswers);
  const practiceComplete = isDecisionPracticeComplete(practice.statement);
  const commitmentComplete = isDecisionCommitmentComplete(commitment);

  function continueFrom(section: Chapter3SectionId) {
    setError(null);
    startTransition(async () => {
      const result = await advanceChapter3SectionAction({ sectionId: section });
      if (result.status !== "ok") {
        setError(
          result.code === "incomplete_work"
            ? resolveAppShellLabel(locale, copy.incompleteWork)
            : resolveAppShellLabel(locale, copy.error),
        );
        return;
      }
      if (result.nextSectionId) {
        router.push(getChapter3Path(locale, result.nextSectionId));
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

      <nav
        className="bh-chapter-1-nav"
        aria-label={resolveAppShellLabel(locale, copy.progressLabel)}
      >
        <ol className="bh-chapter-1-nav-list">
          {CHAPTER_3_SECTIONS.map((id) => {
            const done = record.completedSectionIds.includes(id);
            const current = id === sectionId;
            return (
              <li key={id}>
                <Link
                  href={getChapter3Path(locale, id)}
                  className={
                    current
                      ? "bh-chapter-1-nav-link bh-chapter-1-nav-link-current"
                      : "bh-chapter-1-nav-link"
                  }
                  aria-current={current ? "step" : undefined}
                >
                  <span>{sectionLabel(locale, id)}</span>
                  {done ? (
                    <span className="sr-only">
                      {resolveAppShellLabel(locale, copy.sectionDone)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {sectionId === "welcome" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-3-welcome-heading"
        >
          <h2
            id="chapter-3-welcome-heading"
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
          aria-labelledby="chapter-3-reflection-heading"
        >
          <h2 id="chapter-3-reflection-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionReflection)}
          </h2>
          <DecisionReflectionWork
            locale={locale}
            initialAnswers={reflectionAnswers}
            onSaved={setReflectionAnswers}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter3Path(locale, "welcome")}
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
          aria-labelledby="chapter-3-practice-heading"
        >
          <h2 id="chapter-3-practice-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionPractice)}
          </h2>
          <DecisionPracticeWork
            locale={locale}
            initialPractice={practice}
            onSaved={setPractice}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter3Path(locale, "reflection")}
              className="bh-cta bh-cta-secondary"
            >
              {resolveAppShellLabel(locale, copy.back)}
            </Link>
            <button
              type="button"
              className="bh-cta"
              disabled={pending || !practiceComplete}
              onClick={() => continueFrom("practice")}
            >
              {resolveAppShellLabel(locale, copy.continueToCommitment)}
            </button>
          </div>
          {!practiceComplete ? (
            <p className="mt-4 font-sans text-sm text-bh-muted">
              {resolveAppShellLabel(locale, copy.incompletePractice)}
            </p>
          ) : null}
        </section>
      ) : null}

      {sectionId === "commitment" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-3-commitment-heading"
        >
          <h2 id="chapter-3-commitment-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionCommitment)}
          </h2>
          <DecisionCommitmentWork
            locale={locale}
            initialCommitment={commitment}
            onSaved={setCommitment}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter3Path(locale, "practice")}
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
          aria-labelledby="chapter-3-closing-heading"
        >
          <h2
            id="chapter-3-closing-heading"
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
              href={getChapter3Path(locale, "commitment")}
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
          aria-labelledby="chapter-3-complete-heading"
        >
          <h2
            id="chapter-3-complete-heading"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.sectionComplete)}
          </h2>
          <p className="bh-onboarding-step-body">
            {record.status === "completed"
              ? resolveAppShellLabel(locale, copy.completeBody)
              : resolveAppShellLabel(locale, copy.completePendingBody)}
          </p>
          <Chapter3Resources locale={locale} />
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
              href={getChapter3LuminaDiscussionPath(locale)}
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
