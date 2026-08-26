/**
 * Chapter II service (entitled, account-scoped).
 */

import {
  CHAPTER_2_ID,
  isChapter2SectionId,
  type Chapter2SectionId,
  type MirrorReflectionQuestionId,
} from "@/content/journey/chapter-2-mirror";
import {
  isMirrorCommitmentComplete,
  isMirrorExerciseComplete,
  isMirrorReflectionComplete,
  markChapter2SectionComplete,
  mergeMirrorCommitment,
  mergeMirrorExerciseAnswers,
  mergeMirrorReflection,
  resolveChapter2ResumeSection,
  toChapter2ContextSummary,
} from "@/lib/journey/chapters/chapter-2";
import {
  ensureChapter2Record,
  getChapter2Store,
} from "@/lib/journey/chapters/chapter-2-store";
import type { Chapter2Record } from "@/lib/journey/chapters/types";
import {
  loadOnboardingForEntitledUser,
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";
import { getJourneyProgressStore } from "@/lib/journey/progress";

export type Chapter2LoadResult =
  | {
      status: "ok";
      record: Chapter2Record;
      resumeSectionId: Chapter2SectionId;
      context: ReturnType<typeof toChapter2ContextSummary>;
    }
  | { status: "blocked"; reason: OnboardingAccessError };

async function syncJourneyProgress(record: Chapter2Record): Promise<void> {
  const progressStatus =
    record.status === "completed" ? "stage_completed" : "in_progress";
  await getJourneyProgressStore().upsertProgress({
    userId: record.userId,
    chapterId: CHAPTER_2_ID,
    status: progressStatus,
  });
}

export async function loadChapter2ForUser(
  userId: string,
): Promise<Chapter2LoadResult> {
  const loaded = await loadOnboardingForEntitledUser(userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const store = getChapter2Store();
  let record = ensureChapter2Record(
    await store.findChapter2ForUser(userId),
    userId,
  );

  if (record.status === "not_started") {
    const now = new Date().toISOString();
    record = {
      ...record,
      status: "in_progress",
      updatedAt: now,
    };
    record = await store.saveChapter2(record);
    await syncJourneyProgress(record);
  }

  return {
    status: "ok",
    record,
    resumeSectionId: resolveChapter2ResumeSection(record),
    context: toChapter2ContextSummary(record),
  };
}

export async function saveMirrorExerciseForUser(input: {
  userId: string;
  answers: Partial<{
    step1: unknown;
    step2: unknown;
    step3: unknown;
    step4: unknown;
  }>;
}): Promise<
  | { status: "ok"; record: Chapter2Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter2ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const nextExercise = mergeMirrorExerciseAnswers(
    record.mirrorExercise,
    input.answers,
    now,
  );

  record = {
    ...record,
    status: "in_progress",
    mirrorExercise: nextExercise,
    updatedAt: now,
  };

  if (isMirrorExerciseComplete(nextExercise.answers)) {
    record = markChapter2SectionComplete(record, "practice", now);
  }

  record = await getChapter2Store().saveChapter2(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter2ReflectionForUser(input: {
  userId: string;
  answers: Partial<Record<MirrorReflectionQuestionId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter2Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter2ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const reflection = mergeMirrorReflection(record.reflection, input.answers, now);

  record = {
    ...record,
    status: "in_progress",
    reflection,
    updatedAt: now,
  };

  if (isMirrorReflectionComplete(reflection.answers)) {
    record = markChapter2SectionComplete(record, "reflection", now);
  }

  record = await getChapter2Store().saveChapter2(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter2CommitmentForUser(input: {
  userId: string;
  affirmed?: unknown;
  note?: unknown;
}): Promise<
  | { status: "ok"; record: Chapter2Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter2ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const commitment = mergeMirrorCommitment(
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

  if (isMirrorCommitmentComplete(commitment)) {
    record = markChapter2SectionComplete(record, "commitment", now);
  }

  record = await getChapter2Store().saveChapter2(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function advanceChapter2SectionForUser(input: {
  userId: string;
  sectionId: Chapter2SectionId;
}): Promise<
  | {
      status: "ok";
      record: Chapter2Record;
      nextSectionId: Chapter2SectionId;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "incomplete_exercise" }
  | { status: "invalid_section" }
> {
  if (!isChapter2SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter2ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const sectionId = input.sectionId;

  if (sectionId === "reflection") {
    if (!isMirrorReflectionComplete(record.reflection.answers)) {
      return { status: "incomplete_exercise" };
    }
  }

  if (sectionId === "practice") {
    if (!isMirrorExerciseComplete(record.mirrorExercise.answers)) {
      return { status: "incomplete_exercise" };
    }
  }

  if (sectionId === "commitment") {
    if (!isMirrorCommitmentComplete(record.commitment)) {
      return { status: "incomplete_exercise" };
    }
  }

  if (sectionId === "complete") {
    const required: Chapter2SectionId[] = [
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
      !isMirrorReflectionComplete(record.reflection.answers) ||
      !isMirrorExerciseComplete(record.mirrorExercise.answers) ||
      !isMirrorCommitmentComplete(record.commitment)
    ) {
      return { status: "incomplete_exercise" };
    }
    record = {
      ...markChapter2SectionComplete(record, "complete", now),
      status: "completed",
      currentSectionId: "complete",
      completedAt: record.completedAt ?? now,
      updatedAt: now,
    };
    record = await getChapter2Store().saveChapter2(record);
    await syncJourneyProgress(record);
    return { status: "ok", record, nextSectionId: "complete" };
  }

  record = markChapter2SectionComplete(record, sectionId, now);

  const order: Chapter2SectionId[] = [
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

  if (
    nextSectionId === "complete" &&
    record.completedSectionIds.includes("welcome") &&
    record.completedSectionIds.includes("reflection") &&
    record.completedSectionIds.includes("practice") &&
    record.completedSectionIds.includes("commitment") &&
    record.completedSectionIds.includes("closing") &&
    isMirrorReflectionComplete(record.reflection.answers) &&
    isMirrorExerciseComplete(record.mirrorExercise.answers) &&
    isMirrorCommitmentComplete(record.commitment)
  ) {
    record = {
      ...markChapter2SectionComplete(record, "complete", now),
      status: "completed",
      completedAt: record.completedAt ?? now,
    };
  }

  record = await getChapter2Store().saveChapter2(record);
  await syncJourneyProgress(record);
  return { status: "ok", record, nextSectionId };
}

export async function setChapter2CurrentSectionForUser(input: {
  userId: string;
  sectionId: Chapter2SectionId;
}): Promise<
  | { status: "ok"; record: Chapter2Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "invalid_section" }
> {
  if (!isChapter2SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }
  const loaded = await loadChapter2ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }
  const now = new Date().toISOString();
  const record = await getChapter2Store().saveChapter2({
    ...loaded.record,
    currentSectionId: input.sectionId,
    status:
      loaded.record.status === "completed" ? "completed" : "in_progress",
    updatedAt: now,
  });
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export function getChapter2ContextSummaryForUserRecord(
  record: Chapter2Record | null | undefined,
) {
  return toChapter2ContextSummary(record);
}
