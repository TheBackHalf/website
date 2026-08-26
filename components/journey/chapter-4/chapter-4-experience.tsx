"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { Chapter4Resources } from "@/components/journey/chapter-4/chapter-4-resources";
import {
  StandardsCommitmentWork,
  StandardsPracticeWork,
  StandardsReflectionWork,
} from "@/components/journey/chapter-4/standards-work";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import { ChapterPauseControl } from "@/components/journey/chapter-pause-control";
import { ChapterSectionNav } from "@/components/journey/chapter-section-nav";
import { StatusNotice } from "@/components/design-system";
import {
  CHAPTER_4_SECTIONS,
  type Chapter4SectionId,
} from "@/content/journey/chapter-4-standards";
import { getChapter4MediaForSection } from "@/content/journey/chapter-4-media";
import {
  getChapter4Localized,
  getJourneyStages,
} from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { advanceChapter4SectionAction } from "@/lib/journey/chapters/chapter-4-actions";
import {
  isStandardsCommitmentComplete,
  isStandardsPracticeComplete,
  isStandardsReflectionComplete,
} from "@/lib/journey/chapters/chapter-4";
import {
  getChapter4Path,
  getChapter4LuminaDiscussionPath,
} from "@/lib/journey/chapters/paths";
import type { Chapter4Record } from "@/lib/journey/chapters/types";
import { flushJourneyDrafts } from "@/lib/journey/progress/use-draft-autosave";
import type { Locale } from "@/lib/i18n/config";

type Chapter4ExperienceProps = {
  locale: Locale;
  firstName?: string | null;
  sectionId: Chapter4SectionId;
  record: Chapter4Record;
};

function sectionLabel(locale: Locale, sectionId: Chapter4SectionId): string {
  const copy = getDictionary(locale).appShell.chapter4;
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

export function Chapter4Experience({
  locale,
  firstName,
  sectionId,
  record,
}: Chapter4ExperienceProps) {
  const router = useRouter();
  const copy = getDictionary(locale).appShell.chapter4;
  const content = getChapter4Localized(locale);
  const stage = getJourneyStages(locale).find(
    (entry) => entry.id === "standards",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [viewSectionId, setViewSectionId] = useState(sectionId);
  const [reflectionAnswers, setReflectionAnswers] = useState(
    record.reflection.answers,
  );
  const [practice, setPractice] = useState(record.practice);
  const [commitment, setCommitment] = useState(record.commitment);

  useEffect(() => {
    setViewSectionId(sectionId);
  }, [sectionId]);

  function openSection(id: Chapter4SectionId) {
    setError(null);
    setViewSectionId(id);
  }

  function handleSectionNav(
    event: MouseEvent<HTMLAnchorElement>,
    id: Chapter4SectionId,
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    openSection(id);
    router.push(getChapter4Path(locale, id));
  }

  const welcomeText = content.personalizeWelcome(
    content.founderWelcomeRaw,
    firstName,
  );
  const welcomeLines = content.formatForDisplay(welcomeText);
  const closingLines = content.formatForDisplay(content.founderClosingRaw);
  const welcomeMedia = getChapter4MediaForSection("welcome", locale);

  const reflectionComplete = isStandardsReflectionComplete(reflectionAnswers);
  const practiceComplete = isStandardsPracticeComplete(practice.answers);
  const commitmentComplete = isStandardsCommitmentComplete(commitment);

  const headingLines = (stage?.heading?.lines ?? []).filter((line) => {
    const normalized = line.trim().toLowerCase();
    return (
      normalized.length > 0 &&
      normalized !== content.shortTitle.toLowerCase() &&
      normalized !== "standards" &&
      normalized !== "estándares" &&
      normalized !== "estandares"
    );
  });

  function continueFrom(section: Chapter4SectionId) {
    setError(null);
    if (section === "welcome") {
      setViewSectionId("reflection");
    } else if (section === "reflection") {
      setViewSectionId("practice");
    } else if (section === "practice") {
      setViewSectionId("commitment");
    } else if (section === "commitment") {
      setViewSectionId("closing");
    } else if (section === "closing") {
      setViewSectionId("complete");
    }
    startTransition(async () => {
      await flushJourneyDrafts();
      const result = await advanceChapter4SectionAction({ sectionId: section });
      if (result.status !== "ok") {
        setError(
          result.code === "incomplete_work"
            ? resolveAppShellLabel(locale, copy.incompleteWork)
            : resolveAppShellLabel(locale, copy.error),
        );
        return;
      }
      if (result.nextSectionId) {
        setViewSectionId(result.nextSectionId);
        router.push(getChapter4Path(locale, result.nextSectionId));
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
        <p className="mt-4 font-display text-xl italic text-bh-purple md:text-2xl">
          {content.teachingSubtitle}
        </p>
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

      <ChapterSectionNav
        locale={locale}
        progressLabel={resolveAppShellLabel(locale, copy.progressLabel)}
        currentSectionId={viewSectionId}
        completedSectionIds={record.completedSectionIds}
        chapterStatus={record.status}
        doneLabel={resolveAppShellLabel(locale, copy.sectionDone)}
        items={CHAPTER_4_SECTIONS.map((id) => ({
          id,
          label: sectionLabel(locale, id),
          href: getChapter4Path(locale, id),
        }))}
        onNavigate={(id, event) => handleSectionNav(event, id as Chapter4SectionId)}
      />
      <ChapterPauseControl
        locale={locale}
        chapterId="chapter-4-standards"
        sectionId={viewSectionId}
      />


      {viewSectionId === "welcome" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-4-welcome-heading"
        >
          <h2
            id="chapter-4-welcome-heading"
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

      {viewSectionId === "reflection" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-4-reflection-heading"
        >
          <h2 id="chapter-4-reflection-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionReflection)}
          </h2>
          <StandardsReflectionWork
            locale={locale}
            initialAnswers={reflectionAnswers}
            onSaved={setReflectionAnswers}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter4Path(locale, "welcome")}
              className="bh-cta bh-cta-secondary"
              onClick={(event) => handleSectionNav(event, "welcome")}
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

      {viewSectionId === "practice" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-4-practice-heading"
        >
          <h2 id="chapter-4-practice-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionPractice)}
          </h2>
          <StandardsPracticeWork
            locale={locale}
            initialPractice={practice}
            onSaved={setPractice}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter4Path(locale, "reflection")}
              className="bh-cta bh-cta-secondary"
              onClick={(event) => handleSectionNav(event, "reflection")}
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

      {viewSectionId === "commitment" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-4-commitment-heading"
        >
          <h2 id="chapter-4-commitment-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionCommitment)}
          </h2>
          <StandardsCommitmentWork
            locale={locale}
            initialCommitment={commitment}
            onSaved={setCommitment}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={getChapter4Path(locale, "practice")}
              className="bh-cta bh-cta-secondary"
              onClick={(event) => handleSectionNav(event, "practice")}
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

      {viewSectionId === "closing" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-4-closing-heading"
        >
          <h2
            id="chapter-4-closing-heading"
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
              href={getChapter4Path(locale, "commitment")}
              className="bh-cta bh-cta-secondary"
              onClick={(event) => handleSectionNav(event, "commitment")}
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

      {viewSectionId === "complete" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-4-complete-heading"
        >
          <h2
            id="chapter-4-complete-heading"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.sectionComplete)}
          </h2>
          <p className="bh-onboarding-step-body">
            {record.status === "completed"
              ? resolveAppShellLabel(locale, copy.completeBody)
              : resolveAppShellLabel(locale, copy.completePendingBody)}
          </p>
          <Chapter4Resources locale={locale} />
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
              href={getChapter4LuminaDiscussionPath(locale)}
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
