/**
 * Row 133 — Journey progression and save rules.
 *
 * Require completion where appropriate, support pause/resume, preserve drafts,
 * prevent loss of completed work, and allow revisiting finished chapters.
 */

import { CHAPTER_1_ID } from "@/content/journey/chapter-1-awakening";
import { CHAPTER_2_ID } from "@/content/journey/chapter-2-mirror";
import { CHAPTER_3_ID } from "@/content/journey/chapter-3-decision";
import { CHAPTER_4_ID } from "@/content/journey/chapter-4-standards";
import { CHAPTER_5_ID } from "@/content/journey/chapter-5-architect";
import { CHAPTER_6_ID } from "@/content/journey/chapter-6-expansion";
import { CHAPTER_7_ID } from "@/content/journey/chapter-7-beginning";
import type { ChapterProgressStatus } from "@/lib/journey/chapters/types";
import type { JourneyProgressStatus } from "@/lib/journey/progress/types";

export const JOURNEY_CHAPTER_IDS = [
  CHAPTER_1_ID,
  CHAPTER_2_ID,
  CHAPTER_3_ID,
  CHAPTER_4_ID,
  CHAPTER_5_ID,
  CHAPTER_6_ID,
  CHAPTER_7_ID,
] as const;

export type JourneyChapterId = (typeof JOURNEY_CHAPTER_IDS)[number];

export type ChapterAccessDecision =
  | { access: "open"; mode: "start" | "resume" | "revisit" }
  | { access: "locked"; requiredChapterId: JourneyChapterId };

export type JourneyChapterStatusMap = Partial<
  Record<JourneyChapterId, ChapterProgressStatus | undefined>
>;

export type ContinueChapterTarget = {
  chapterId: JourneyChapterId;
  status: ChapterProgressStatus;
  mode: "start" | "resume" | "revisit";
};

const CHAPTER_ID_SET = new Set<string>(JOURNEY_CHAPTER_IDS);

export function isJourneyChapterId(value: string): value is JourneyChapterId {
  return CHAPTER_ID_SET.has(value);
}

export function chapterIndex(chapterId: JourneyChapterId): number {
  return JOURNEY_CHAPTER_IDS.indexOf(chapterId);
}

export function prerequisiteChapterId(
  chapterId: JourneyChapterId,
): JourneyChapterId | null {
  const index = chapterIndex(chapterId);
  if (index <= 0) {
    return null;
  }
  return JOURNEY_CHAPTER_IDS[index - 1]!;
}

export function normalizeChapterStatus(
  status: ChapterProgressStatus | string | null | undefined,
): ChapterProgressStatus {
  if (status === "completed" || status === "in_progress") {
    return status;
  }
  return "not_started";
}

/**
 * Keep a finished chapter finished when the Architect revisits and saves drafts.
 */
export function preserveCompletedChapterStatus(
  current: ChapterProgressStatus | string | null | undefined,
): ChapterProgressStatus {
  return normalizeChapterStatus(current) === "completed"
    ? "completed"
    : "in_progress";
}

/**
 * Open a chapter when it is the next sequential work, already started, or
 * completed (approved revisiting). Existing in-progress records stay reachable
 * so prior skip-ahead drafts are not lost. Brand-new later chapters stay locked
 * until the previous chapter is complete.
 */
export function decideChapterAccess(
  chapterId: JourneyChapterId,
  chapters: JourneyChapterStatusMap,
): ChapterAccessDecision {
  const status = normalizeChapterStatus(chapters[chapterId]);
  if (status === "completed") {
    return { access: "open", mode: "revisit" };
  }
  if (status === "in_progress") {
    return { access: "open", mode: "resume" };
  }

  const required = prerequisiteChapterId(chapterId);
  if (required && normalizeChapterStatus(chapters[required]) !== "completed") {
    return { access: "locked", requiredChapterId: required };
  }
  return { access: "open", mode: "start" };
}

export function isChapterLocked(
  chapterId: JourneyChapterId,
  chapters: JourneyChapterStatusMap,
): boolean {
  return decideChapterAccess(chapterId, chapters).access === "locked";
}

/**
 * Within a chapter, completed sections and the first incomplete section are
 * reachable. Later incomplete sections stay locked until prior required work
 * is finished. Completed chapters may be fully revisited.
 */
export function decideSectionAccess(
  sectionId: string,
  order: readonly string[],
  completedSectionIds: readonly string[],
  chapterStatus: ChapterProgressStatus,
): "open" | "locked" {
  if (normalizeChapterStatus(chapterStatus) === "completed") {
    return "open";
  }

  const index = order.indexOf(sectionId);
  if (index < 0) {
    return "locked";
  }

  const firstIncomplete =
    order.find(
      (id) => id !== "complete" && !completedSectionIds.includes(id),
    ) ?? "complete";
  const firstIncompleteIndex = order.indexOf(firstIncomplete);

  if (index <= firstIncompleteIndex) {
    return "open";
  }

  if (sectionId === "complete") {
    const required = order.filter((id) => id !== "complete");
    return required.every((id) => completedSectionIds.includes(id))
      ? "open"
      : "locked";
  }

  return "locked";
}

/**
 * Continue the sequential Journey: first accessible chapter that is not yet
 * complete. If every chapter is complete, stay on Chapter VII for revisiting.
 */
export function resolveContinueChapter(
  chapters: JourneyChapterStatusMap,
): ContinueChapterTarget {
  for (const chapterId of JOURNEY_CHAPTER_IDS) {
    const access = decideChapterAccess(chapterId, chapters);
    if (access.access === "locked") {
      continue;
    }
    const status = normalizeChapterStatus(chapters[chapterId]);
    if (status !== "completed") {
      return { chapterId, status, mode: access.mode };
    }
  }

  return {
    chapterId: CHAPTER_7_ID,
    status: "completed",
    mode: "revisit",
  };
}

/**
 * Authoritative progress pointer: the in-progress chapter, else the latest
 * completed chapter. Never points at a locked or unopened later chapter.
 */
export function resolveProgressPointerTarget(
  chapters: JourneyChapterStatusMap,
): ContinueChapterTarget | null {
  let lastCompleted: ContinueChapterTarget | null = null;

  for (const chapterId of JOURNEY_CHAPTER_IDS) {
    const access = decideChapterAccess(chapterId, chapters);
    if (access.access === "locked") {
      break;
    }
    const status = normalizeChapterStatus(chapters[chapterId]);
    if (status === "in_progress") {
      return { chapterId, status, mode: "resume" };
    }
    if (status === "completed") {
      lastCompleted = { chapterId, status, mode: "revisit" };
    }
  }

  return lastCompleted;
}

export function resolveProgressPointerStatus(
  target: ContinueChapterTarget,
): JourneyProgressStatus {
  if (target.chapterId === CHAPTER_7_ID && target.status === "completed") {
    return "journey_completed";
  }
  if (target.status === "completed") {
    return "stage_completed";
  }
  if (target.status === "in_progress") {
    return "in_progress";
  }
  return "not_started";
}

/**
 * Pause keeps the Architect on the section they are viewing when that section
 * is allowed; otherwise resume at the first incomplete required section.
 */
export function resolvePausedSection(
  currentSectionId: string,
  order: readonly string[],
  completedSectionIds: readonly string[],
  chapterStatus: ChapterProgressStatus,
): string {
  if (
    decideSectionAccess(
      currentSectionId,
      order,
      completedSectionIds,
      chapterStatus,
    ) === "open"
  ) {
    return currentSectionId;
  }
  return (
    order.find(
      (id) => id !== "complete" && !completedSectionIds.includes(id),
    ) ??
    order[order.length - 1] ??
    "welcome"
  );
}
