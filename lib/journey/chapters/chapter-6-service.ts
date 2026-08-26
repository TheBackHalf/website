/**
 * Chapter VI service (entitled, account-scoped).
 */

import {
  CHAPTER_6_ID,
  isChapter6SectionId,
  type Chapter6SectionId,
  type ExpansionPracticeId,
  type ExpansionReflectionQuestionId,
} from "@/content/journey/chapter-6-expansion";
import {
  isExpansionCommitmentComplete,
  isExpansionPracticeComplete,
  isExpansionReflectionComplete,
  markChapter6SectionComplete,
  mergeExpansionCommitment,
  mergeExpansionPractice,
  mergeExpansionReflection,
  resolveChapter6ResumeSection,
  toChapter6ContextSummary,
} from "@/lib/journey/chapters/chapter-6";
import {
  ensureChapter6Record,
  getChapter6Store,
} from "@/lib/journey/chapters/chapter-6-store";
import type { Chapter6Record } from "@/lib/journey/chapters/types";
import {
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";
import { gateChapterLoad } from "@/lib/journey/progress/gate";
import { preserveCompletedChapterStatus } from "@/lib/journey/progress/rules";
import type { JourneyChapterId } from "@/lib/journey/progress/rules";
import { syncAuthoritativeJourneyProgress } from "@/lib/journey/progress/snapshot";

export type Chapter6LoadResult =
  | {
      status: "ok";
      record: Chapter6Record;
      resumeSectionId: Chapter6SectionId;
      context: ReturnType<typeof toChapter6ContextSummary>;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId };

async function syncJourneyProgress(record: Chapter6Record): Promise<void> {
  await syncAuthoritativeJourneyProgress(record.userId);
}

export async function loadChapter6ForUser(
  userId: string,
): Promise<Chapter6LoadResult> {
  const loaded = await gateChapterLoad(userId, CHAPTER_6_ID);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const store = getChapter6Store();
  let record = ensureChapter6Record(
    await store.findChapter6ForUser(userId),
    userId,
  );

  if (record.status === "not_started") {
    const now = new Date().toISOString();
    record = {
      ...record,
      status: preserveCompletedChapterStatus(record.status),
      updatedAt: now,
    };
    record = await store.saveChapter6(record);
    await syncJourneyProgress(record);
  }

  return {
    status: "ok",
    record,
    resumeSectionId: resolveChapter6ResumeSection(record),
    context: toChapter6ContextSummary(record),
  };
}

export async function saveChapter6ReflectionForUser(input: {
  userId: string;
  answers: Partial<Record<ExpansionReflectionQuestionId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter6Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter6ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const reflection = mergeExpansionReflection(
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

  if (isExpansionReflectionComplete(reflection.answers)) {
    record = markChapter6SectionComplete(record, "reflection", now);
  }

  record = await getChapter6Store().saveChapter6(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter6PracticeForUser(input: {
  userId: string;
  answers: Partial<Record<ExpansionPracticeId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter6Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter6ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const practice = mergeExpansionPractice(record.practice, input.answers, now);

  record = {
    ...record,
    status: preserveCompletedChapterStatus(record.status),
    practice,
    updatedAt: now,
  };

  if (isExpansionPracticeComplete(practice.answers)) {
    record = markChapter6SectionComplete(record, "practice", now);
  }

  record = await getChapter6Store().saveChapter6(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter6CommitmentForUser(input: {
  userId: string;
  affirmed?: unknown;
  note?: unknown;
}): Promise<
  | { status: "ok"; record: Chapter6Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
> {
  const loaded = await loadChapter6ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const commitment = mergeExpansionCommitment(
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

  if (isExpansionCommitmentComplete(commitment)) {
    record = markChapter6SectionComplete(record, "commitment", now);
  }

  record = await getChapter6Store().saveChapter6(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function advanceChapter6SectionForUser(input: {
  userId: string;
  sectionId: Chapter6SectionId;
}): Promise<
  | {
      status: "ok";
      record: Chapter6Record;
      nextSectionId: Chapter6SectionId;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
  | { status: "incomplete_work" }
  | { status: "invalid_section" }
> {
  if (!isChapter6SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter6ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const sectionId = input.sectionId;

  if (sectionId === "reflection") {
    if (!isExpansionReflectionComplete(record.reflection.answers)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "practice") {
    if (!isExpansionPracticeComplete(record.practice.answers)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "commitment") {
    if (!isExpansionCommitmentComplete(record.commitment)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "complete") {
    const required: Chapter6SectionId[] = [
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
      !isExpansionReflectionComplete(record.reflection.answers) ||
      !isExpansionPracticeComplete(record.practice.answers) ||
      !isExpansionCommitmentComplete(record.commitment)
    ) {
      return { status: "incomplete_work" };
    }

    record = {
      ...markChapter6SectionComplete(record, "complete", now),
      status: "completed",
      currentSectionId: "complete",
      completedAt: record.completedAt ?? now,
      updatedAt: now,
    };
    record = await getChapter6Store().saveChapter6(record);
    await syncJourneyProgress(record);
    return { status: "ok", record, nextSectionId: "complete" };
  }

  record = markChapter6SectionComplete(record, sectionId, now);

  const order: Chapter6SectionId[] = [
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

  record = await getChapter6Store().saveChapter6(record);
  await syncJourneyProgress(record);
  return { status: "ok", record, nextSectionId };
}

export async function setChapter6CurrentSectionForUser(input: {
  userId: string;
  sectionId: Chapter6SectionId;
}): Promise<
  | { status: "ok"; record: Chapter6Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "locked"; requiredChapterId: JourneyChapterId }
  | { status: "invalid_section" }
> {
  if (!isChapter6SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter6ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  const record = await getChapter6Store().saveChapter6({
    ...loaded.record,
    currentSectionId: input.sectionId,
    status: preserveCompletedChapterStatus(loaded.record.status),
    updatedAt: now,
  });
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export function getChapter6ContextSummaryForUserRecord(
  record: Chapter6Record | null | undefined,
) {
  return toChapter6ContextSummary(record);
}
