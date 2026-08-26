import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import type { Locale } from "@/lib/i18n/config";
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
import {
  getChapter1Path,
  getChapter2Path,
  getChapter3Path,
  getChapter4Path,
  getChapter5Path,
  getChapter6Path,
  getChapter7Path,
} from "@/lib/journey/chapters/paths";
import { getChapter1Store } from "@/lib/journey/chapters/store";
import {
  type ContinueChapterTarget,
  type JourneyChapterId,
  resolveContinueChapter,
} from "@/lib/journey/progress/rules";
import { loadJourneyChapterStatuses } from "@/lib/journey/progress/snapshot";

export function getJourneyChapterPath(
  locale: Locale,
  chapterId: JourneyChapterId,
  section?: string,
): string {
  switch (chapterId) {
    case "chapter-1-awakening":
      return getChapter1Path(locale, section as never);
    case "chapter-2-mirror":
      return getChapter2Path(locale, section as never);
    case "chapter-3-decision":
      return getChapter3Path(locale, section as never);
    case "chapter-4-standards":
      return getChapter4Path(locale, section as never);
    case "chapter-5-architect":
      return getChapter5Path(locale, section as never);
    case "chapter-6-expansion":
      return getChapter6Path(locale, section as never);
    case "chapter-7-beginning":
      return getChapter7Path(locale, section as never);
  }
}

export function getJourneyOverviewPath(locale: Locale): string {
  return getLocalizedArchitectPath("journey", locale);
}

export async function resolveChapterResumeSectionId(
  userId: string,
  chapterId: JourneyChapterId,
): Promise<string> {
  switch (chapterId) {
    case "chapter-1-awakening": {
      const record = await getChapter1Store().findChapter1ForUser(userId);
      return record ? resolveResumeSection(record) : "welcome";
    }
    case "chapter-2-mirror": {
      const record = await getChapter2Store().findChapter2ForUser(userId);
      return record ? resolveChapter2ResumeSection(record) : "welcome";
    }
    case "chapter-3-decision": {
      const record = await getChapter3Store().findChapter3ForUser(userId);
      return record ? resolveChapter3ResumeSection(record) : "welcome";
    }
    case "chapter-4-standards": {
      const record = await getChapter4Store().findChapter4ForUser(userId);
      return record ? resolveChapter4ResumeSection(record) : "welcome";
    }
    case "chapter-5-architect": {
      const record = await getChapter5Store().findChapter5ForUser(userId);
      return record ? resolveChapter5ResumeSection(record) : "welcome";
    }
    case "chapter-6-expansion": {
      const record = await getChapter6Store().findChapter6ForUser(userId);
      return record ? resolveChapter6ResumeSection(record) : "welcome";
    }
    case "chapter-7-beginning": {
      const record = await getChapter7Store().findChapter7ForUser(userId);
      return record ? resolveChapter7ResumeSection(record) : "welcome";
    }
  }
}

export async function resolveLockedChapterRedirect(
  locale: Locale,
  requiredChapterId: JourneyChapterId,
  userId: string,
): Promise<string> {
  const section = await resolveChapterResumeSectionId(userId, requiredChapterId);
  return getJourneyChapterPath(locale, requiredChapterId, section);
}

export async function resolveJourneyContinueTarget(
  userId: string,
): Promise<ContinueChapterTarget> {
  const chapters = await loadJourneyChapterStatuses(userId);
  return resolveContinueChapter(chapters);
}

export async function resolveJourneyContinueHref(
  locale: Locale,
  userId: string,
): Promise<string> {
  const target = await resolveJourneyContinueTarget(userId);
  const section = await resolveChapterResumeSectionId(userId, target.chapterId);
  return getJourneyChapterPath(locale, target.chapterId, section);
}
