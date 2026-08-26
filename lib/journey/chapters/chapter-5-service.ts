/**
 * Chapter V service (entitled, account-scoped).
 */

import {
  CHAPTER_5_ID,
  isChapter5SectionId,
  type ArchitectReflectionQuestionId,
  type Chapter5SectionId,
} from "@/content/journey/chapter-5-architect";
import {
  isArchitectCommitmentComplete,
  isArchitectPracticeComplete,
  isArchitectReflectionComplete,
  markChapter5SectionComplete,
  mergeArchitectCommitment,
  mergeArchitectPractice,
  mergeArchitectReflection,
  resolveChapter5ResumeSection,
  toChapter5ContextSummary,
} from "@/lib/journey/chapters/chapter-5";
import {
  ensureChapter5Record,
  getChapter5Store,
} from "@/lib/journey/chapters/chapter-5-store";
import type { Chapter5Record } from "@/lib/journey/chapters/types";
import {
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";
import { gateChapterLoad } from "@/lib/journey/progress/gate";
import { preserveCompletedChapterStatus } from "@/lib/journey/progress/rules";
import type { JourneyChapterId } from "@/lib/journey/progress/rules";
import { syncAuthoritativeJourneyProgress } from "@/lib/journey/progress/snapshot";

export type Chapter5LoadResult =
  | {
      status: "ok";
      record: Chapter5Record;
      resumeSectionId: Chapter5SectionId;
      context: ReturnType<typeof toChapter5ContextSummary>;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId };

async function syncJourneyProgress(record: Chapter5Record): Promise<void> {
  await syncAuthoritativeJourneyProgress(record.userId);
}

export async function loadChapter5ForUser(
  userId: string,
): Promise<Chapter5LoadResult> {
  const loaded = await gateChapterLoad(userId, CHAPTER_5_ID);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const store = getChapter5Store();
  let record = ensureChapter5Record(
    await store.findChapter5ForUser(userId),
    userId,
  );

  if (record.status === "not_started") {
    const now = new Date().toISOString();
    record = {
      ...record,
      status: preserveCompletedChapterStatus(record.status),
      updatedAt: now,
    };
    record = await store.saveChapter5(record);
    await syncJourneyProgress(record);
  }

  return {
    status: "ok",
    record,
    resumeSectionId: resolveChapter5ResumeSection(record),
    context: toChapter5ContextSummary(record),
  };
}

export async function saveChapter5ReflectionForUser(input: {
  userId: string;
  answers: Partial<Record<ArchitectReflectionQuestionId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter5Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter5ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const reflection = mergeArchitectReflection(
    record.reflection,
    input.answers,
    now,
  );

  record = {
    ...record,
    status: preserveCompletedChapterStatus(record.status),
    reflection,
    updatedAt: now,
  };

  if (isArchitectReflectionComplete(reflection.answers)) {
    record = markChapter5SectionComplete(record, "reflection", now);
  }

  record = await getChapter5Store().saveChapter5(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter5PracticeForUser(input: {
  userId: string;
  statement: unknown;
}): Promise<
  | { status: "ok"; record: Chapter5Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter5ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const practice = mergeArchitectPractice(
    record.practice,
    input.statement,
    now,
  );

  record = {
    ...record,
    status: preserveCompletedChapterStatus(record.status),
    practice,
    updatedAt: now,
  };

  if (isArchitectPracticeComplete(practice.statement)) {
    record = markChapter5SectionComplete(record, "practice", now);
  }

  record = await getChapter5Store().saveChapter5(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter5CommitmentForUser(input: {
  userId: string;
  affirmed?: unknown;
  note?: unknown;
}): Promise<
  | { status: "ok"; record: Chapter5Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter5ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const commitment = mergeArchitectCommitment(
    record.commitment,
    { affirmed: input.affirmed, note: input.note },
    now,
  );

  record = {
    ...record,
    status: preserveCompletedChapterStatus(record.status),
    commitment,
    updatedAt: now,
  };

  if (isArchitectCommitmentComplete(commitment)) {
    record = markChapter5SectionComplete(record, "commitment", now);
  }

  record = await getChapter5Store().saveChapter5(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function advanceChapter5SectionForUser(input: {
  userId: string;
  sectionId: Chapter5SectionId;
}): Promise<
  | {
      status: "ok";
      record: Chapter5Record;
      nextSectionId: Chapter5SectionId;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
  | { status: "incomplete_work" }
  | { status: "invalid_section" }
> {
  if (!isChapter5SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter5ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const sectionId = input.sectionId;

  if (sectionId === "reflection") {
    if (!isArchitectReflectionComplete(record.reflection.answers)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "practice") {
    if (!isArchitectPracticeComplete(record.practice.statement)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "commitment") {
    if (!isArchitectCommitmentComplete(record.commitment)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "complete") {
    const required: Chapter5SectionId[] = [
      "welcome",
      "reflection",
      "practice",
      "commitment",
      "closing",
    ];
    const missing = required.some(
      (id) => !record.completedSectionIds.includes(id),
    );
    if (
      missing ||
      !isArchitectReflectionComplete(record.reflection.answers) ||
      !isArchitectPracticeComplete(record.practice.statement) ||
      !isArchitectCommitmentComplete(record.commitment)
    ) {
      return { status: "incomplete_work" };
    }

    record = {
      ...markChapter5SectionComplete(record, "complete", now),
      status: "completed",
      currentSectionId: "complete",
      completedAt: record.completedAt ?? now,
      updatedAt: now,
    };
    record = await getChapter5Store().saveChapter5(record);
    await syncJourneyProgress(record);
    return { status: "ok", record, nextSectionId: "complete" };
  }

  record = markChapter5SectionComplete(record, sectionId, now);

  const order: Chapter5SectionId[] = [
    "welcome",
    "reflection",
    "practice",
    "commitment",
    "closing",
    "complete",
  ];
  const index = order.indexOf(sectionId);
  const nextSectionId = order[Math.min(index + 1, order.length - 1)]!;

  record = {
    ...record,
    currentSectionId: nextSectionId,
    updatedAt: now,
  };

  record = await getChapter5Store().saveChapter5(record);
  await syncJourneyProgress(record);
  return { status: "ok", record, nextSectionId };
}

export async function setChapter5CurrentSectionForUser(input: {
  userId: string;
  sectionId: Chapter5SectionId;
}): Promise<
  | { status: "ok"; record: Chapter5Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
  | { status: "invalid_section" }
> {
  if (!isChapter5SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter5ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  const record = await getChapter5Store().saveChapter5({
    ...loaded.record,
    currentSectionId: input.sectionId,
    status: preserveCompletedChapterStatus(loaded.record.status),
    updatedAt: now,
  });
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export function getChapter5ContextSummaryForUserRecord(
  record: Chapter5Record | null | undefined,
) {
  return toChapter5ContextSummary(record);
}
