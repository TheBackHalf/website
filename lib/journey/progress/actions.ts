"use server";

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { CHAPTER_1_SECTIONS } from "@/content/journey/chapter-1-awakening";
import { CHAPTER_2_SECTIONS } from "@/content/journey/chapter-2-mirror";
import { CHAPTER_3_SECTIONS } from "@/content/journey/chapter-3-decision";
import { CHAPTER_4_SECTIONS } from "@/content/journey/chapter-4-standards";
import { CHAPTER_5_SECTIONS } from "@/content/journey/chapter-5-architect";
import { CHAPTER_6_SECTIONS } from "@/content/journey/chapter-6-expansion";
import { CHAPTER_7_SECTIONS } from "@/content/journey/chapter-7-beginning";
import { setChapter1CurrentSectionForUser } from "@/lib/journey/chapters/service";
import { setChapter2CurrentSectionForUser } from "@/lib/journey/chapters/chapter-2-service";
import { setChapter3CurrentSectionForUser } from "@/lib/journey/chapters/chapter-3-service";
import { setChapter4CurrentSectionForUser } from "@/lib/journey/chapters/chapter-4-service";
import { setChapter5CurrentSectionForUser } from "@/lib/journey/chapters/chapter-5-service";
import { setChapter6CurrentSectionForUser } from "@/lib/journey/chapters/chapter-6-service";
import { setChapter7CurrentSectionForUser } from "@/lib/journey/chapters/chapter-7-service";
import {
  isJourneyChapterId,
  type JourneyChapterId,
} from "@/lib/journey/progress/rules";

export type PauseJourneyResult =
  | { status: "ok"; sectionId: string }
  | { status: "error"; code: string };

const SECTION_ORDER: Record<JourneyChapterId, readonly string[]> = {
  "chapter-1-awakening": CHAPTER_1_SECTIONS,
  "chapter-2-mirror": CHAPTER_2_SECTIONS,
  "chapter-3-decision": CHAPTER_3_SECTIONS,
  "chapter-4-standards": CHAPTER_4_SECTIONS,
  "chapter-5-architect": CHAPTER_5_SECTIONS,
  "chapter-6-expansion": CHAPTER_6_SECTIONS,
  "chapter-7-beginning": CHAPTER_7_SECTIONS,
};

export async function pauseJourneyChapterAction(input: {
  chapterId: string;
  sectionId: string;
}): Promise<PauseJourneyResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  if (!isJourneyChapterId(input.chapterId)) {
    return { status: "error", code: "invalid_chapter" };
  }

  const order = SECTION_ORDER[input.chapterId];
  if (!order.includes(input.sectionId)) {
    return { status: "error", code: "invalid_section" };
  }

  const result = await persistPausedSection(
    actor.user.id,
    input.chapterId,
    input.sectionId,
  );

  if (result.status !== "ok") {
    if (result.status === "blocked") {
      return { status: "error", code: result.reason };
    }
    if (result.status === "locked") {
      return { status: "error", code: "chapter_locked" };
    }
    return { status: "error", code: "invalid_section" };
  }

  return { status: "ok", sectionId: result.record.currentSectionId };
}

async function persistPausedSection(
  userId: string,
  chapterId: JourneyChapterId,
  sectionId: string,
) {
  switch (chapterId) {
    case "chapter-1-awakening":
      return setChapter1CurrentSectionForUser({
        userId,
        sectionId: sectionId as never,
      });
    case "chapter-2-mirror":
      return setChapter2CurrentSectionForUser({
        userId,
        sectionId: sectionId as never,
      });
    case "chapter-3-decision":
      return setChapter3CurrentSectionForUser({
        userId,
        sectionId: sectionId as never,
      });
    case "chapter-4-standards":
      return setChapter4CurrentSectionForUser({
        userId,
        sectionId: sectionId as never,
      });
    case "chapter-5-architect":
      return setChapter5CurrentSectionForUser({
        userId,
        sectionId: sectionId as never,
      });
    case "chapter-6-expansion":
      return setChapter6CurrentSectionForUser({
        userId,
        sectionId: sectionId as never,
      });
    case "chapter-7-beginning":
      return setChapter7CurrentSectionForUser({
        userId,
        sectionId: sectionId as never,
      });
  }
}
