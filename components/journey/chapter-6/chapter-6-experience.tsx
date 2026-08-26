"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Chapter6Resources } from "@/components/journey/chapter-6/chapter-6-resources";
import {
  ExpansionCommitmentWork,
  ExpansionPracticeWork,
  ExpansionReflectionWork,
} from "@/components/journey/chapter-6/expansion-work";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import { StatusNotice } from "@/components/design-system";
import {
  CHAPTER_6_SECTIONS,
  type Chapter6SectionId,
} from "@/content/journey/chapter-6-expansion";
import { getChapter6MediaForSection } from "@/content/journey/chapter-6-media";
import {
  getChapter6Localized,
  getJourneyStages,
} from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { advanceChapter6SectionAction } from "@/lib/journey/chapters/chapter-6-actions";
import {
  isExpansionCommitmentComplete,
  isExpansionPracticeComplete,
  isExpansionReflectionComplete,
} from "@/lib/journey/chapters/chapter-6";
import {
  getChapter6Path,
  getChapter6LuminaDiscussionPath,
} from "@/lib/journey/chapters/paths";
import type { Chapter6Record } from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type Chapter6ExperienceProps = {
  locale: Locale;
  sectionId: Chapter6SectionId;
  record: Chapter6Record;
};

function sectionLabel(locale: Locale, sectionId: Chapter6SectionId): string {
  const copy = getDictionary(locale).appShell.chapter6;
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

export function Chapter6Experience({
  locale,
  sectionId,
  record,
}: Chapter6ExperienceProps) {
  const router = useRouter();
  const copy = getDictionary(locale).appShell.chapter6;
  const content = getChapter6Localized(locale);
  const stage = getJourneyStages(locale).find(
    (entry) => entry.id === "expansion",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reflectionAnswers, setReflectionAnswers] = useState(
    record.reflection.answers,
  );
  const [practice, setPractice] = useState(record.practice);
  const [commitment, setCommitment] = useState(record.commitment);

  const welcomeText = content.personalizeWelcome(content.founderWelcomeRaw);
  const welcomeLines = content.formatForDisplay(welcomeText);
  const closingLines = content.formatForDisplay(content.founderClosingRaw);
  const welcomeMedia = getChapter6MediaForSection("welcome", locale);

  const reflectionComplete = isExpansionReflectionComplete(reflectionAnswers);
  const practiceComplete = isExpansionPracticeComplete(practice.answers);
  const commitmentComplete = isExpansionCommitmentComplete(commitment);

  const headingLines = (stage?.heading?.lines ?? []).filter((line) => {
    const normalized = line.trim().toLowerCase();
    return (
      normalized.length > 0 &&
      normalized !== content.shortTitle.toLowerCase() &&
      normalized !== "expansion" &&
      normalized !== "expansión"
    );
  });

  function continueFrom(section: Chapter6SectionId) {
    setError(null);
    startTransition(async () => {
      const result = await advanceChapter6SectionAction({ sectionId: section });
      if (result.status !== "ok") {
        setError(
          result.code === "incomplete_work"
            ? resolveAppShellLabel(locale, copy.incompleteWork)
            : resolveAppShellLabel(locale, copy.error),
        );
        return;
      }
      if (result.nextSectionId) {
        router.push(getChapter6Path(locale, result.nextSectionId));
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
        {headingLines.map((line, index) => (
          <p
            key={line}
            className={
              stage?.heading?.accentLineIndex === index
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
          {CHAPTER_6_SECTIONS.map((id) => {
            const done = record.completedSectionIds.includes(id);
            const current = id === sectionId;
            return (
              <li key={id}>
                <Link
                  href={getChapter6Path(locale, id)}
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
          aria-labelledby="chapter-6-welcome-heading"
        >
          <h2
            id="chapter-6-welcome-heading"
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
          aria-labelledby="chapter-6-reflection-heading"
        >
          <h2 id="chapter-6-reflection-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionReflection)}
          </h2>
          <ExpansionReflectionWork
            locale={locale}
            initialAnswers={reflectionAnswers}
            onSaved={setReflectionAnswers}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter6Path(locale, "welcome")}
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
          aria-labelledby="chapter-6-practice-heading"
        >
          <h2 id="chapter-6-practice-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionPractice)}
          </h2>
          <ExpansionPracticeWork
            locale={locale}
            initialPractice={practice}
            onSaved={setPractice}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter6Path(locale, "reflection")}
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
          aria-labelledby="chapter-6-commitment-heading"
        >
          <h2 id="chapter-6-commitment-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionCommitment)}
          </h2>
          <ExpansionCommitmentWork
            locale={locale}
            initialCommitment={commitment}
            onSaved={setCommitment}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter6Path(locale, "practice")}
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
          aria-labelledby="chapter-6-closing-heading"
        >
          <h2
            id="chapter-6-closing-heading"
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
              href={getChapter6Path(locale, "commitment")}
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
          aria-labelledby="chapter-6-complete-heading"
        >
          <h2
            id="chapter-6-complete-heading"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.sectionComplete)}
          </h2>
          <p className="bh-onboarding-step-body">
            {record.status === "completed"
              ? resolveAppShellLabel(locale, copy.completeBody)
              : resolveAppShellLabel(locale, copy.completePendingBody)}
          </p>
          <Chapter6Resources locale={locale} />
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
              href={getChapter6LuminaDiscussionPath(locale)}
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
