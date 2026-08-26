/**
 * Chapter IV service (entitled, account-scoped).
 */

import {
  CHAPTER_4_ID,
  isChapter4SectionId,
  type Chapter4SectionId,
  type StandardsPracticeId,
  type StandardsReflectionQuestionId,
} from "@/content/journey/chapter-4-standards";
import {
  isStandardsCommitmentComplete,
  isStandardsPracticeComplete,
  isStandardsReflectionComplete,
  markChapter4SectionComplete,
  mergeStandardsCommitment,
  mergeStandardsPractice,
  mergeStandardsReflection,
  resolveChapter4ResumeSection,
  toChapter4ContextSummary,
} from "@/lib/journey/chapters/chapter-4";
import {
  ensureChapter4Record,
  getChapter4Store,
} from "@/lib/journey/chapters/chapter-4-store";
import type { Chapter4Record } from "@/lib/journey/chapters/types";
import {
  loadOnboardingForEntitledUser,
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";
import { getJourneyProgressStore } from "@/lib/journey/progress";

export type Chapter4LoadResult =
  | {
      status: "ok";
      record: Chapter4Record;
      resumeSectionId: Chapter4SectionId;
      context: ReturnType<typeof toChapter4ContextSummary>;
    }
  | { status: "blocked"; reason: OnboardingAccessError };

async function syncJourneyProgress(record: Chapter4Record): Promise<void> {
  const progressStatus =
    record.status === "completed" ? "stage_completed" : "in_progress";

  await getJourneyProgressStore().upsertProgress({
    userId: record.userId,
    chapterId: CHAPTER_4_ID,
    status: progressStatus,
  });
}

export async function loadChapter4ForUser(
  userId: string,
): Promise<Chapter4LoadResult> {
  const loaded = await loadOnboardingForEntitledUser(userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const store = getChapter4Store();
  let record = ensureChapter4Record(
    await store.findChapter4ForUser(userId),
    userId,
  );

  if (record.status === "not_started") {
    const now = new Date().toISOString();
    record = {
      ...record,
      status: "in_progress",
      updatedAt: now,
    };
    record = await store.saveChapter4(record);
    await syncJourneyProgress(record);
  }

  return {
    status: "ok",
    record,
    resumeSectionId: resolveChapter4ResumeSection(record),
    context: toChapter4ContextSummary(record),
  };
}

export async function saveChapter4ReflectionForUser(input: {
  userId: string;
  answers: Partial<Record<StandardsReflectionQuestionId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter4Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter4ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const reflection = mergeStandardsReflection(
    record.reflection,
    input.answers,
    now,
  );

  record = {
    ...record,
    status: "in_progress",
    reflection,
    updatedAt: now,
  };

  if (isStandardsReflectionComplete(reflection.answers)) {
    record = markChapter4SectionComplete(record, "reflection", now);
  }

  record = await getChapter4Store().saveChapter4(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter4PracticeForUser(input: {
  userId: string;
  answers: Partial<Record<StandardsPracticeId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter4Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter4ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const practice = mergeStandardsPractice(
    record.practice,
    input.answers,
    now,
  );

  record = {
    ...record,
    status: "in_progress",
    practice,
    updatedAt: now,
  };

  if (isStandardsPracticeComplete(practice.answers)) {
    record = markChapter4SectionComplete(record, "practice", now);
  }

  record = await getChapter4Store().saveChapter4(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter4CommitmentForUser(input: {
  userId: string;
  affirmed?: unknown;
  note?: unknown;
}): Promise<
  | { status: "ok"; record: Chapter4Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter4ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const commitment = mergeStandardsCommitment(
    record.commitment,
    { affirmed: input.affirmed, note: input.note },
    now,
  );

  record = {
    ...record,
    status: "in_progress",
    commitment,
    updatedAt: now,
  };

  if (isStandardsCommitmentComplete(commitment)) {
    record = markChapter4SectionComplete(record, "commitment", now);
  }

  record = await getChapter4Store().saveChapter4(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function advanceChapter4SectionForUser(input: {
  userId: string;
  sectionId: Chapter4SectionId;
}): Promise<
  | {
      status: "ok";
      record: Chapter4Record;
      nextSectionId: Chapter4SectionId;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "incomplete_work" }
  | { status: "invalid_section" }
> {
  if (!isChapter4SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter4ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const sectionId = input.sectionId;

  if (sectionId === "reflection") {
    if (!isStandardsReflectionComplete(record.reflection.answers)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "practice") {
    if (!isStandardsPracticeComplete(record.practice.answers)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "commitment") {
    if (!isStandardsCommitmentComplete(record.commitment)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "complete") {
    const required: Chapter4SectionId[] = [
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
      !isStandardsReflectionComplete(record.reflection.answers) ||
      !isStandardsPracticeComplete(record.practice.answers) ||
      !isStandardsCommitmentComplete(record.commitment)
    ) {
      return { status: "incomplete_work" };
    }

    record = {
      ...markChapter4SectionComplete(record, "complete", now),
      status: "completed",
      currentSectionId: "complete",
      completedAt: record.completedAt ?? now,
      updatedAt: now,
    };
    record = await getChapter4Store().saveChapter4(record);
    await syncJourneyProgress(record);
    return { status: "ok", record, nextSectionId: "complete" };
  }

  record = markChapter4SectionComplete(record, sectionId, now);

  const order: Chapter4SectionId[] = [
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

  record = await getChapter4Store().saveChapter4(record);
  await syncJourneyProgress(record);
  return { status: "ok", record, nextSectionId };
}

export async function setChapter4CurrentSectionForUser(input: {
  userId: string;
  sectionId: Chapter4SectionId;
}): Promise<
  | { status: "ok"; record: Chapter4Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "invalid_section" }
> {
  if (!isChapter4SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter4ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  const record = await getChapter4Store().saveChapter4({
    ...loaded.record,
    currentSectionId: input.sectionId,
    status:
      loaded.record.status === "completed" ? "completed" : "in_progress",
    updatedAt: now,
  });
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export function getChapter4ContextSummaryForUserRecord(
  record: Chapter4Record | null | undefined,
) {
  return toChapter4ContextSummary(record);
}
