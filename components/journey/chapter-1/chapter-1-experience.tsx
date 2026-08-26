"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlivenessProjectExercise } from "@/components/journey/chapter-1/aliveness-project-exercise";
import {
  AwakeningCommitmentWork,
  AwakeningReflectionWork,
} from "@/components/journey/chapter-1/awakening-work";
import { Chapter1Resources } from "@/components/journey/chapter-1/chapter-1-resources";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import { StatusNotice } from "@/components/design-system";
import {
  CHAPTER_1_SECTIONS,
  type Chapter1SectionId,
} from "@/content/journey/chapter-1-awakening";
import { getChapter1MediaForSection } from "@/content/journey/chapter-1-media";
import {
  getChapter1Localized,
  getJourneyStages,
} from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { advanceChapter1SectionAction } from "@/lib/journey/chapters/actions";
import {
  isAlivenessProjectComplete,
  isAwakeningCommitmentComplete,
  isAwakeningReflectionComplete,
} from "@/lib/journey/chapters/chapter-1";
import {
  getChapter1Path,
  getChapter1LuminaDiscussionPath,
} from "@/lib/journey/chapters/paths";
import type { Chapter1Record } from "@/lib/journey/chapters/types";
import type { Locale } from "@/lib/i18n/config";

type Chapter1ExperienceProps = {
  locale: Locale;
  firstName?: string | null;
  sectionId: Chapter1SectionId;
  record: Chapter1Record;
  reviewBasePath?: string;
  onLocalAdvance?: (
    sectionId: Chapter1SectionId,
  ) => Promise<
    | { status: "ok"; nextSectionId: Chapter1SectionId | null }
    | { status: "error"; code: string }
  >;
  onLocalProjectSave?: (
    answers: Chapter1Record["alivenessProject"]["answers"],
  ) => Promise<{ status: "ok" } | { status: "error" }>;
  luminaHref?: string;
  dashboardHref?: string;
  journeyHref?: string;
};

function sectionLabel(locale: Locale, sectionId: Chapter1SectionId): string {
  const copy = getDictionary(locale).appShell.chapter1;
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

export function Chapter1Experience({
  locale,
  firstName,
  sectionId,
  record,
  reviewBasePath,
  onLocalAdvance,
  onLocalProjectSave,
  luminaHref,
  dashboardHref,
  journeyHref,
}: Chapter1ExperienceProps) {
  const router = useRouter();
  const copy = getDictionary(locale).appShell.chapter1;
  const content = getChapter1Localized(locale);
  const stage = getJourneyStages(locale).find(
    (entry) => entry.id === "awakening",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState(record.alivenessProject.answers);
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
  const projectComplete = isAlivenessProjectComplete(answers);
  const reflectionComplete = isAwakeningReflectionComplete(reflectionAnswers);
  const commitmentComplete = isAwakeningCommitmentComplete(commitment);
  const welcomeMedia = getChapter1MediaForSection("welcome", locale);

  function sectionHref(section: Chapter1SectionId) {
    if (reviewBasePath) {
      return `${reviewBasePath}?section=${section}`;
    }
    return getChapter1Path(locale, section);
  }

  function continueFrom(section: Chapter1SectionId) {
    setError(null);
    startTransition(async () => {
      if (onLocalAdvance) {
        const result = await onLocalAdvance(section);
        if (result.status !== "ok") {
          setError(
            result.code === "incomplete_exercise"
              ? resolveAppShellLabel(locale, copy.incompleteWork)
              : resolveAppShellLabel(locale, copy.error),
          );
          return;
        }
        if (result.nextSectionId) {
          router.push(sectionHref(result.nextSectionId));
        } else {
          router.refresh();
        }
        return;
      }
      const result = await advanceChapter1SectionAction({ sectionId: section });
      if (result.status !== "ok") {
        setError(
          result.code === "incomplete_exercise"
            ? resolveAppShellLabel(locale, copy.incompleteWork)
            : resolveAppShellLabel(locale, copy.error),
        );
        return;
      }
      if (result.nextSectionId) {
        router.push(getChapter1Path(locale, result.nextSectionId));
        router.refresh();
      }
    });
  }

  const discussHref = luminaHref ?? getChapter1LuminaDiscussionPath(locale);
  const dashHref =
    dashboardHref ?? getLocalizedArchitectPath("dashboard", locale);
  const journeyOverviewHref =
    journeyHref ?? getLocalizedArchitectPath("journey", locale);

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
          {CHAPTER_1_SECTIONS.map((id) => {
            const done = record.completedSectionIds.includes(id);
            const current = id === sectionId;
            return (
              <li key={id}>
                <Link
                  href={sectionHref(id)}
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
          aria-labelledby="chapter-1-welcome-heading"
        >
          <h2
            id="chapter-1-welcome-heading"
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
          aria-labelledby="chapter-1-reflection-heading"
        >
          <h2 id="chapter-1-reflection-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionReflection)}
          </h2>
          <AwakeningReflectionWork
            locale={locale}
            initialAnswers={reflectionAnswers}
            onSaved={setReflectionAnswers}
          />
          <div className="bh-onboarding-actions">
            <Link href={sectionHref("welcome")} className="bh-cta bh-cta-secondary">
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
          aria-labelledby="chapter-1-practice-heading"
        >
          <h2 id="chapter-1-practice-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionPractice)}
          </h2>
          <AlivenessProjectExercise
            locale={locale}
            initialAnswers={answers}
            onSaved={setAnswers}
            onLocalSave={onLocalProjectSave}
          />
          <div className="bh-onboarding-actions">
            <Link
              href={sectionHref("reflection")}
              className="bh-cta bh-cta-secondary"
            >
              {resolveAppShellLabel(locale, copy.back)}
            </Link>
            <button
              type="button"
              className="bh-cta"
              disabled={pending || !projectComplete}
              onClick={() => continueFrom("practice")}
            >
              {resolveAppShellLabel(locale, copy.continueToCommitment)}
            </button>
          </div>
          {!projectComplete ? (
            <p className="mt-4 font-sans text-sm text-bh-muted">
              {resolveAppShellLabel(locale, copy.incompleteProject)}
            </p>
          ) : null}
        </section>
      ) : null}

      {sectionId === "commitment" ? (
        <section
          className="bh-chapter-1-section"
          aria-labelledby="chapter-1-commitment-heading"
        >
          <h2 id="chapter-1-commitment-heading" className="sr-only">
            {resolveAppShellLabel(locale, copy.sectionCommitment)}
          </h2>
          <AwakeningCommitmentWork
            locale={locale}
            initialCommitment={commitment}
            onSaved={setCommitment}
          />
          <div className="bh-onboarding-actions">
            <Link href={sectionHref("practice")} className="bh-cta bh-cta-secondary">
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
          aria-labelledby="chapter-1-closing-heading"
        >
          <h2
            id="chapter-1-closing-heading"
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
              href={sectionHref("commitment")}
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
          aria-labelledby="chapter-1-complete-heading"
        >
          <h2
            id="chapter-1-complete-heading"
            className="bh-onboarding-step-title"
          >
            {resolveAppShellLabel(locale, copy.sectionComplete)}
          </h2>
          <p className="bh-onboarding-step-body">
            {record.status === "completed"
              ? resolveAppShellLabel(locale, copy.completeBody)
              : resolveAppShellLabel(locale, copy.completePendingBody)}
          </p>
          <Chapter1Resources locale={locale} />
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
              href={discussHref}
              className="bh-cta bh-chapter-1-complete-action"
            >
              {resolveAppShellLabel(locale, copy.discussWithLumina)}
            </Link>
            <Link
              href={dashHref}
              className="bh-cta bh-chapter-1-complete-action"
            >
              {resolveAppShellLabel(locale, copy.returnDashboard)}
            </Link>
            <Link
              href={journeyOverviewHref}
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
