/**
 * Chapter III service (entitled, account-scoped).
 */

import {
  CHAPTER_3_ID,
  isChapter3SectionId,
  type Chapter3SectionId,
  type DecisionReflectionQuestionId,
} from "@/content/journey/chapter-3-decision";
import {
  isDecisionCommitmentComplete,
  isDecisionPracticeComplete,
  isDecisionReflectionComplete,
  markChapter3SectionComplete,
  mergeDecisionCommitment,
  mergeDecisionPractice,
  mergeDecisionReflection,
  resolveChapter3ResumeSection,
  toChapter3ContextSummary,
} from "@/lib/journey/chapters/chapter-3";
import {
  ensureChapter3Record,
  getChapter3Store,
} from "@/lib/journey/chapters/chapter-3-store";
import type { Chapter3Record } from "@/lib/journey/chapters/types";
import {
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";
import { gateChapterLoad } from "@/lib/journey/progress/gate";
import { preserveCompletedChapterStatus } from "@/lib/journey/progress/rules";
import type { JourneyChapterId } from "@/lib/journey/progress/rules";
import { syncAuthoritativeJourneyProgress } from "@/lib/journey/progress/snapshot";

export type Chapter3LoadResult =
  | {
      status: "ok";
      record: Chapter3Record;
      resumeSectionId: Chapter3SectionId;
      context: ReturnType<typeof toChapter3ContextSummary>;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId };

async function syncJourneyProgress(record: Chapter3Record): Promise<void> {
  await syncAuthoritativeJourneyProgress(record.userId);
}

export async function loadChapter3ForUser(
  userId: string,
): Promise<Chapter3LoadResult> {
  const loaded = await gateChapterLoad(userId, CHAPTER_3_ID);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const store = getChapter3Store();
  let record = ensureChapter3Record(
    await store.findChapter3ForUser(userId),
    userId,
  );

  if (record.status === "not_started") {
    const now = new Date().toISOString();
    record = {
      ...record,
      status: preserveCompletedChapterStatus(record.status),
      updatedAt: now,
    };
    record = await store.saveChapter3(record);
    await syncJourneyProgress(record);
  }

  return {
    status: "ok",
    record,
    resumeSectionId: resolveChapter3ResumeSection(record),
    context: toChapter3ContextSummary(record),
  };
}

export async function saveChapter3ReflectionForUser(input: {
  userId: string;
  answers: Partial<Record<DecisionReflectionQuestionId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter3Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter3ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const reflection = mergeDecisionReflection(
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

  if (isDecisionReflectionComplete(reflection.answers)) {
    record = markChapter3SectionComplete(record, "reflection", now);
  }

  record = await getChapter3Store().saveChapter3(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter3PracticeForUser(input: {
  userId: string;
  statement: unknown;
}): Promise<
  | { status: "ok"; record: Chapter3Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter3ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const practice = mergeDecisionPractice(
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

  if (isDecisionPracticeComplete(practice.statement)) {
    record = markChapter3SectionComplete(record, "practice", now);
  }

  record = await getChapter3Store().saveChapter3(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter3CommitmentForUser(input: {
  userId: string;
  affirmed?: unknown;
  note?: unknown;
}): Promise<
  | { status: "ok"; record: Chapter3Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter3ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const commitment = mergeDecisionCommitment(
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

  if (isDecisionCommitmentComplete(commitment)) {
    record = markChapter3SectionComplete(record, "commitment", now);
  }

  record = await getChapter3Store().saveChapter3(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function advanceChapter3SectionForUser(input: {
  userId: string;
  sectionId: Chapter3SectionId;
}): Promise<
  | {
      status: "ok";
      record: Chapter3Record;
      nextSectionId: Chapter3SectionId;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
  | { status: "incomplete_work" }
  | { status: "invalid_section" }
> {
  if (!isChapter3SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter3ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const sectionId = input.sectionId;

  if (sectionId === "reflection") {
    if (!isDecisionReflectionComplete(record.reflection.answers)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "practice") {
    if (!isDecisionPracticeComplete(record.practice.statement)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "commitment") {
    if (!isDecisionCommitmentComplete(record.commitment)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "complete") {
    const required: Chapter3SectionId[] = [
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
      !isDecisionReflectionComplete(record.reflection.answers) ||
      !isDecisionPracticeComplete(record.practice.statement) ||
      !isDecisionCommitmentComplete(record.commitment)
    ) {
      return { status: "incomplete_work" };
    }

    record = {
      ...markChapter3SectionComplete(record, "complete", now),
      status: "completed",
      currentSectionId: "complete",
      completedAt: record.completedAt ?? now,
      updatedAt: now,
    };
    record = await getChapter3Store().saveChapter3(record);
    await syncJourneyProgress(record);
    return { status: "ok", record, nextSectionId: "complete" };
  }

  record = markChapter3SectionComplete(record, sectionId, now);

  const order: Chapter3SectionId[] = [
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

  record = await getChapter3Store().saveChapter3(record);
  await syncJourneyProgress(record);
  return { status: "ok", record, nextSectionId };
}

export async function setChapter3CurrentSectionForUser(input: {
  userId: string;
  sectionId: Chapter3SectionId;
}): Promise<
  | { status: "ok"; record: Chapter3Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
  | { status: "invalid_section" }
> {
  if (!isChapter3SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter3ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  const record = await getChapter3Store().saveChapter3({
    ...loaded.record,
    currentSectionId: input.sectionId,
    status: preserveCompletedChapterStatus(loaded.record.status),
    updatedAt: now,
  });
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export function getChapter3ContextSummaryForUserRecord(
  record: Chapter3Record | null | undefined,
) {
  return toChapter3ContextSummary(record);
}
