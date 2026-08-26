/**
 * Row 133 — Durable Journey snapshot used by progression/save logic.
 */

import { getChapter2Store } from "@/lib/journey/chapters/chapter-2-store";
import { getChapter3Store } from "@/lib/journey/chapters/chapter-3-store";
import { getChapter4Store } from "@/lib/journey/chapters/chapter-4-store";
import { getChapter5Store } from "@/lib/journey/chapters/chapter-5-store";
import { getChapter6Store } from "@/lib/journey/chapters/chapter-6-store";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";
import { getChapter1Store } from "@/lib/journey/chapters/store";
import type { ChapterProgressStatus } from "@/lib/journey/chapters/types";
import { getJourneyProgressStore } from "@/lib/journey/progress/store";
import {
  decideChapterAccess,
  type ChapterAccessDecision,
  type JourneyChapterId,
  type JourneyChapterStatusMap,
  normalizeChapterStatus,
  resolveProgressPointerStatus,
  resolveProgressPointerTarget,
} from "@/lib/journey/progress/rules";

export type JourneyProgressSnapshot = {
  userId: string;
  chapters: JourneyChapterStatusMap;
};

export async function loadJourneyChapterStatuses(
  userId: string,
): Promise<JourneyChapterStatusMap> {
  const trimmed = userId.trim();
  if (!trimmed) {
    return {};
  }

  const [c1, c2, c3, c4, c5, c6, c7] = await Promise.all([
    getChapter1Store().findChapter1ForUser(trimmed),
    getChapter2Store().findChapter2ForUser(trimmed),
    getChapter3Store().findChapter3ForUser(trimmed),
    getChapter4Store().findChapter4ForUser(trimmed),
    getChapter5Store().findChapter5ForUser(trimmed),
    getChapter6Store().findChapter6ForUser(trimmed),
    getChapter7Store().findChapter7ForUser(trimmed),
  ]);

  return {
    "chapter-1-awakening": c1?.status,
    "chapter-2-mirror": c2?.status,
    "chapter-3-decision": c3?.status,
    "chapter-4-standards": c4?.status,
    "chapter-5-architect": c5?.status,
    "chapter-6-expansion": c6?.status,
    "chapter-7-beginning": c7?.status,
  };
}

export async function loadJourneyProgressSnapshot(
  userId: string,
): Promise<JourneyProgressSnapshot> {
  return {
    userId: userId.trim(),
    chapters: await loadJourneyChapterStatuses(userId),
  };
}

export async function resolveChapterAccessForUser(
  userId: string,
  chapterId: JourneyChapterId,
): Promise<ChapterAccessDecision> {
  const chapters = await loadJourneyChapterStatuses(userId);
  return decideChapterAccess(chapterId, chapters);
}

/**
 * Point the coarse progress pointer at sequential continue-work.
 * Revisiting an earlier chapter and saving drafts must not regress the pointer.
 */
export async function syncAuthoritativeJourneyProgress(
  userId: string,
  chapters?: JourneyChapterStatusMap,
): Promise<void> {
  const trimmed = userId.trim();
  if (!trimmed) {
    return;
  }

  const statusMap = chapters ?? (await loadJourneyChapterStatuses(trimmed));
  const target = resolveProgressPointerTarget(statusMap);
  if (!target) {
    return;
  }
  const pointerStatus = resolveProgressPointerStatus(target);

  if (pointerStatus === "not_started") {
    return;
  }

  await getJourneyProgressStore().upsertProgress({
    userId: trimmed,
    chapterId: target.chapterId,
    status: pointerStatus,
  });
}

export function chapterStatusFromRecord(
  status: ChapterProgressStatus | undefined,
): ChapterProgressStatus {
  return normalizeChapterStatus(status);
}
