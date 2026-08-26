import Link from "next/link";
import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import { AwakeningEntry } from "@/components/journey/awakening-entry";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Chapter1SectionId } from "@/content/journey/chapter-1-awakening";
import type { Chapter2SectionId } from "@/content/journey/chapter-2-mirror";
import type { Chapter3SectionId } from "@/content/journey/chapter-3-decision";
import type { Chapter4SectionId } from "@/content/journey/chapter-4-standards";
import type { Chapter5SectionId } from "@/content/journey/chapter-5-architect";
import type { Chapter6SectionId } from "@/content/journey/chapter-6-expansion";
import type { Chapter7SectionId } from "@/content/journey/chapter-7-beginning";
import { getLocalizedPath } from "@/lib/i18n/routing";
import { getAlivenessAssessmentPath } from "@/lib/journey/assessments/paths";
import {
  getChapter1Path,
  getChapter2Path,
  getChapter3Path,
  getChapter4Path,
  getChapter5Path,
  getChapter6Path,
  getChapter7Path,
} from "@/lib/journey/chapters/paths";
import { getThresholdCeremonyPath } from "@/lib/journey/completion/threshold-ceremony";
import { getOnboardingPath } from "@/lib/journey/onboarding/paths";
import type { Locale } from "@/lib/i18n/config";

type JourneyEntryShellProps = {
  locale: Locale;
  entitled: boolean;
  onboarded?: boolean;
  firstName?: string | null;
  /** Row 84 — assessment complete → results; else questions when entitled. */
  assessmentComplete?: boolean;
  /** Row 85 — Chapter I status for CTA. */
  chapter1Status?: "not_started" | "in_progress" | "completed";
  chapter1ResumeSection?: Chapter1SectionId;
  /** Row 86 — Chapter II status for CTA. */
  chapter2Status?: "not_started" | "in_progress" | "completed";
  chapter2ResumeSection?: Chapter2SectionId;
  /** Row 87 — Chapter III status for CTA. */
  chapter3Status?: "not_started" | "in_progress" | "completed";
  chapter3ResumeSection?: Chapter3SectionId;
  /** Row 129 — Chapter IV status for CTA. */
  chapter4Status?: "not_started" | "in_progress" | "completed";
  chapter4ResumeSection?: Chapter4SectionId;
  /** Row 130 — Chapter V status for CTA. */
  chapter5Status?: "not_started" | "in_progress" | "completed";
  chapter5ResumeSection?: Chapter5SectionId;
  /** Row 131 — Chapter VI status for CTA. */
  chapter6Status?: "not_started" | "in_progress" | "completed";
  chapter6ResumeSection?: Chapter6SectionId;
  /** Row 132 — Chapter VII status for CTA. */
  chapter7Status?: "not_started" | "in_progress" | "completed";
  chapter7ResumeSection?: Chapter7SectionId;
};

/**
 * Journey authenticated entry — Rows 83–87.
 */
export function JourneyEntryShell({
  locale,
  entitled,
  onboarded = false,
  firstName,
  assessmentComplete = false,
  chapter1Status = "not_started",
  chapter1ResumeSection = "welcome",
  chapter2Status = "not_started",
  chapter2ResumeSection = "welcome",
  chapter3Status = "not_started",
  chapter3ResumeSection = "welcome",
  chapter4Status = "not_started",
  chapter4ResumeSection = "welcome",
  chapter5Status = "not_started",
  chapter5ResumeSection = "welcome",
  chapter6Status = "not_started",
  chapter6ResumeSection = "welcome",
  chapter7Status = "not_started",
  chapter7ResumeSection = "welcome",
}: JourneyEntryShellProps) {
  const dictionary = getDictionary(locale);
  const journey = dictionary.appShell.journey;
  const onboarding = dictionary.appShell.onboarding;
  const assessment = dictionary.appShell.assessment;
  const chapter1 = dictionary.appShell.chapter1;
  const chapter2 = dictionary.appShell.chapter2;
  const chapter3 = dictionary.appShell.chapter3;
  const chapter4 = dictionary.appShell.chapter4;
  const chapter5 = dictionary.appShell.chapter5;
  const chapter6 = dictionary.appShell.chapter6;
  const chapter7 = dictionary.appShell.chapter7;

  const chapter1Cta =
    chapter1Status === "completed"
      ? resolveAppShellLabel(locale, chapter1.chapterCompleteLink)
      : chapter1Status === "in_progress"
        ? resolveAppShellLabel(locale, chapter1.resumeChapter)
        : resolveAppShellLabel(locale, chapter1.openChapter);

  const chapter2Cta =
    chapter2Status === "completed"
      ? resolveAppShellLabel(locale, chapter2.chapterCompleteLink)
      : chapter2Status === "in_progress"
        ? resolveAppShellLabel(locale, chapter2.resumeChapter)
        : resolveAppShellLabel(locale, chapter2.openChapter);

  const chapter3Cta =
    chapter3Status === "completed"
      ? resolveAppShellLabel(locale, chapter3.chapterCompleteLink)
      : chapter3Status === "in_progress"
        ? resolveAppShellLabel(locale, chapter3.resumeChapter)
        : resolveAppShellLabel(locale, chapter3.openChapter);

  const chapter4Cta =
    chapter4Status === "completed"
      ? resolveAppShellLabel(locale, chapter4.chapterCompleteLink)
      : chapter4Status === "in_progress"
        ? resolveAppShellLabel(locale, chapter4.resumeChapter)
        : resolveAppShellLabel(locale, chapter4.openChapter);

  const chapter5Cta =
    chapter5Status === "completed"
      ? resolveAppShellLabel(locale, chapter5.chapterCompleteLink)
      : chapter5Status === "in_progress"
        ? resolveAppShellLabel(locale, chapter5.resumeChapter)
        : resolveAppShellLabel(locale, chapter5.openChapter);

  const chapter6Cta =
    chapter6Status === "completed"
      ? resolveAppShellLabel(locale, chapter6.chapterCompleteLink)
      : chapter6Status === "in_progress"
        ? resolveAppShellLabel(locale, chapter6.resumeChapter)
        : resolveAppShellLabel(locale, chapter6.openChapter);

  const chapter7Cta =
    chapter7Status === "completed"
      ? resolveAppShellLabel(locale, chapter7.chapterCompleteLink)
      : chapter7Status === "in_progress"
        ? resolveAppShellLabel(locale, chapter7.resumeChapter)
        : resolveAppShellLabel(locale, chapter7.openChapter);

  return (
    <AppShellPage locale={locale}>
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, journey.title)}
        description={resolveAppShellLabel(locale, journey.description)}
      />
      {entitled && onboarded ? (
        <>
          <AwakeningEntry
            locale={locale}
            firstName={firstName}
            showBeginCta
            onBeginHref={getChapter1Path(locale, chapter1ResumeSection)}
            beginLabel={chapter1Cta}
          />
          <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 pb-10 sm:flex-row sm:flex-wrap">
            <Link
              href={getChapter1Path(locale, chapter1ResumeSection)}
              className="bh-cta inline-flex"
            >
              {chapter1Cta}
            </Link>
            <Link
              href={getChapter2Path(locale, chapter2ResumeSection)}
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {chapter2Cta}
            </Link>
            <Link
              href={getChapter3Path(locale, chapter3ResumeSection)}
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {chapter3Cta}
            </Link>
            <Link
              href={getChapter4Path(locale, chapter4ResumeSection)}
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {chapter4Cta}
            </Link>
            <Link
              href={getChapter5Path(locale, chapter5ResumeSection)}
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {chapter5Cta}
            </Link>
            <Link
              href={getChapter6Path(locale, chapter6ResumeSection)}
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {chapter6Cta}
            </Link>
            <Link
              href={
                chapter7Status === "completed"
                  ? getThresholdCeremonyPath(locale)
                  : getChapter7Path(locale, chapter7ResumeSection)
              }
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {chapter7Status === "completed"
                ? dictionary.appShell.ceremony.title
                : chapter7Cta}
            </Link>
            <Link
              href={getAlivenessAssessmentPath(
                locale,
                assessmentComplete ? "results" : "questions",
              )}
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {resolveAppShellLabel(
                locale,
                assessmentComplete
                  ? assessment.dashboardLinkComplete
                  : assessment.dashboardLinkIncomplete,
              )}
            </Link>
          </div>
        </>
      ) : entitled ? (
        <div className="mx-auto max-w-2xl px-6 py-10">
          <p className="font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            {resolveAppShellLabel(locale, onboarding.description)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={getOnboardingPath(locale)} className="bh-cta inline-flex">
              {resolveAppShellLabel(locale, onboarding.continue)}
            </Link>
            <Link
              href={getAlivenessAssessmentPath(
                locale,
                assessmentComplete ? "results" : "questions",
              )}
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {resolveAppShellLabel(
                locale,
                assessmentComplete
                  ? assessment.dashboardLinkComplete
                  : assessment.dashboardLinkIncomplete,
              )}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl px-6 py-10">
          <p className="font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            {locale === "es"
              ? "Se requiere acceso al Journey. Completa el checkout para desbloquear esta experiencia."
              : "Journey access is required. Complete checkout to unlock this experience."}
          </p>
          <Link
            href={`${getLocalizedPath("/checkout", locale)}?need=journey_access`}
            className="bh-cta mt-8 inline-flex"
          >
            {resolveAppShellLabel(
              locale,
              dictionary.appShell.dashboard.continueCheckout,
            )}
          </Link>
        </div>
      )}
    </AppShellPage>
  );
}
