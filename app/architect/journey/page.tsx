import type { Metadata } from "next";
import { JourneyEntryShell } from "@/components/app-shell/journey-entry-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { requireEntitlement } from "@/lib/billing/access";
import { resolveResumeSection } from "@/lib/journey/chapters/chapter-1";
import { resolveChapter2ResumeSection } from "@/lib/journey/chapters/chapter-2";
import { resolveChapter3ResumeSection } from "@/lib/journey/chapters/chapter-3";
import { resolveChapter4ResumeSection } from "@/lib/journey/chapters/chapter-4";
import { resolveChapter5ResumeSection } from "@/lib/journey/chapters/chapter-5";
import { resolveChapter6ResumeSection } from "@/lib/journey/chapters/chapter-6";
import { resolveChapter7ResumeSection } from "@/lib/journey/chapters/chapter-7";
import { getChapter2Store } from "@/lib/journey/chapters/chapter-2-store";
import { getChapter3Store } from "@/lib/journey/chapters/chapter-3-store";
import { getChapter4Store } from "@/lib/journey/chapters/chapter-4-store";
import { getChapter5Store } from "@/lib/journey/chapters/chapter-5-store";
import { getChapter6Store } from "@/lib/journey/chapters/chapter-6-store";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";
import { getChapter1Store } from "@/lib/journey/chapters/store";
import { redirectIfOnboardingIncomplete } from "@/lib/journey/onboarding/gate";
import {
  getOnboardingStateForUser,
  isOnboardingComplete,
} from "@/lib/journey/onboarding/eligibility";

export const metadata: Metadata = createArchitectPageMetadata("en", "journey");

export default async function ArchitectJourneyPage() {
  const actor = await requireEntitlement("journey_access", "en");
  await redirectIfOnboardingIncomplete(actor.user.id, "en");
  const [onboarded, onboarding, chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7] =
    await Promise.all([
      isOnboardingComplete(actor.user.id),
      getOnboardingStateForUser(actor.user.id),
      getChapter1Store().findChapter1ForUser(actor.user.id),
      getChapter2Store().findChapter2ForUser(actor.user.id),
      getChapter3Store().findChapter3ForUser(actor.user.id),
      getChapter4Store().findChapter4ForUser(actor.user.id),
      getChapter5Store().findChapter5ForUser(actor.user.id),
      getChapter6Store().findChapter6ForUser(actor.user.id),
      getChapter7Store().findChapter7ForUser(actor.user.id),
    ]);
  const assessmentComplete = Boolean(
    onboarding?.assessment.resultsSnapshot ||
      onboarding?.assessment.completedAt,
  );
  const chapter1Status =
    chapter1?.status === "completed"
      ? "completed"
      : chapter1?.status === "in_progress"
        ? "in_progress"
        : "not_started";
  const chapter2Status =
    chapter2?.status === "completed"
      ? "completed"
      : chapter2?.status === "in_progress"
        ? "in_progress"
        : "not_started";
  const chapter3Status =
    chapter3?.status === "completed"
      ? "completed"
      : chapter3?.status === "in_progress"
        ? "in_progress"
        : "not_started";
  const chapter4Status =
    chapter4?.status === "completed"
      ? "completed"
      : chapter4?.status === "in_progress"
        ? "in_progress"
        : "not_started";
  const chapter5Status =
    chapter5?.status === "completed"
      ? "completed"
      : chapter5?.status === "in_progress"
        ? "in_progress"
        : "not_started";
  const chapter6Status =
    chapter6?.status === "completed"
      ? "completed"
      : chapter6?.status === "in_progress"
        ? "in_progress"
        : "not_started";
  const chapter7Status =
    chapter7?.status === "completed"
      ? "completed"
      : chapter7?.status === "in_progress"
        ? "in_progress"
        : "not_started";
  return (
    <JourneyEntryShell
      locale="en"
      entitled
      onboarded={onboarded}
      firstName={actor.user.firstName}
      assessmentComplete={assessmentComplete}
      chapter1Status={chapter1Status}
      chapter1ResumeSection={
        chapter1 ? resolveResumeSection(chapter1) : "welcome"
      }
      chapter2Status={chapter2Status}
      chapter2ResumeSection={
        chapter2 ? resolveChapter2ResumeSection(chapter2) : "welcome"
      }
      chapter3Status={chapter3Status}
      chapter3ResumeSection={
        chapter3 ? resolveChapter3ResumeSection(chapter3) : "welcome"
      }
      chapter4Status={chapter4Status}
      chapter4ResumeSection={
        chapter4 ? resolveChapter4ResumeSection(chapter4) : "welcome"
      }
      chapter5Status={chapter5Status}
      chapter5ResumeSection={
        chapter5 ? resolveChapter5ResumeSection(chapter5) : "welcome"
      }
      chapter6Status={chapter6Status}
      chapter6ResumeSection={
        chapter6 ? resolveChapter6ResumeSection(chapter6) : "welcome"
      }
      chapter7Status={chapter7Status}
      chapter7ResumeSection={
        chapter7 ? resolveChapter7ResumeSection(chapter7) : "welcome"
      }
    />
  );
}
