/**
 * Row 85 — Chapter I service (entitled, account-scoped).
 */

import {
  CHAPTER_1_ID,
  type AlivenessProjectQuestionId,
  type AwakeningReflectionQuestionId,
  type Chapter1SectionId,
  isChapter1SectionId,
} from "@/content/journey/chapter-1-awakening";
import {
  isAlivenessProjectComplete,
  isAwakeningCommitmentComplete,
  isAwakeningReflectionComplete,
  markSectionComplete,
  mergeAlivenessProjectAnswers,
  mergeAwakeningCommitment,
  mergeAwakeningReflection,
  resolveResumeSection,
  toChapter1ContextSummary,
} from "@/lib/journey/chapters/chapter-1";
import {
  ensureChapter1Record,
  getChapter1Store,
} from "@/lib/journey/chapters/store";
import type { Chapter1Record } from "@/lib/journey/chapters/types";
import {
  loadOnboardingForEntitledUser,
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";
import { getJourneyProgressStore } from "@/lib/journey/progress";

export type Chapter1LoadResult =
  | {
      status: "ok";
      record: Chapter1Record;
      resumeSectionId: Chapter1SectionId;
      context: ReturnType<typeof toChapter1ContextSummary>;
    }
  | { status: "blocked"; reason: OnboardingAccessError };

async function syncJourneyProgress(record: Chapter1Record): Promise<void> {
  const progressStatus =
    record.status === "completed" ? "stage_completed" : "in_progress";
  await getJourneyProgressStore().upsertProgress({
    userId: record.userId,
    chapterId: CHAPTER_1_ID,
    status: progressStatus,
  });
}

export async function loadChapter1ForUser(
  userId: string,
): Promise<Chapter1LoadResult> {
  const loaded = await loadOnboardingForEntitledUser(userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const store = getChapter1Store();
  let record = ensureChapter1Record(
    await store.findChapter1ForUser(userId),
    userId,
  );

  // Seed progress pointer when Architect first opens Chapter I.
  if (record.status === "not_started") {
    const now = new Date().toISOString();
    record = {
      ...record,
      status: "in_progress",
      updatedAt: now,
    };
    record = await store.saveChapter1(record);
    await syncJourneyProgress(record);
  }

  const resumeSectionId = resolveResumeSection(record);
  return {
    status: "ok",
    record,
    resumeSectionId,
    context: toChapter1ContextSummary(record),
  };
}

export async function saveAlivenessProjectForUser(input: {
  userId: string;
  answers: Partial<Record<AlivenessProjectQuestionId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter1Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter1ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const nextProject = mergeAlivenessProjectAnswers(
    record.alivenessProject,
    input.answers,
    now,
  );

  record = {
    ...record,
    status: "in_progress",
    alivenessProject: nextProject,
    updatedAt: now,
  };

  if (isAlivenessProjectComplete(nextProject.answers)) {
    record = markSectionComplete(record, "practice", now);
  }

  record = await getChapter1Store().saveChapter1(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter1ReflectionForUser(input: {
  userId: string;
  answers: Partial<Record<AwakeningReflectionQuestionId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter1Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter1ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const reflection = mergeAwakeningReflection(
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

  if (isAwakeningReflectionComplete(reflection.answers)) {
    record = markSectionComplete(record, "reflection", now);
  }

  record = await getChapter1Store().saveChapter1(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter1CommitmentForUser(input: {
  userId: string;
  affirmed?: unknown;
  note?: unknown;
}): Promise<
  | { status: "ok"; record: Chapter1Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter1ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const commitment = mergeAwakeningCommitment(
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

  if (isAwakeningCommitmentComplete(commitment)) {
    record = markSectionComplete(record, "commitment", now);
  }

  record = await getChapter1Store().saveChapter1(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function advanceChapter1SectionForUser(input: {
  userId: string;
  sectionId: Chapter1SectionId;
}): Promise<
  | {
      status: "ok";
      record: Chapter1Record;
      nextSectionId: Chapter1SectionId;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "incomplete_exercise" }
  | { status: "invalid_section" }
> {
  if (!isChapter1SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter1ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const sectionId = input.sectionId;

  if (sectionId === "reflection") {
    if (!isAwakeningReflectionComplete(record.reflection.answers)) {
      return { status: "incomplete_exercise" };
    }
  }

  if (sectionId === "practice") {
    if (!isAlivenessProjectComplete(record.alivenessProject.answers)) {
      return { status: "incomplete_exercise" };
    }
  }

  if (sectionId === "commitment") {
    if (!isAwakeningCommitmentComplete(record.commitment)) {
      return { status: "incomplete_exercise" };
    }
  }

  if (sectionId === "complete") {
    const required: Chapter1SectionId[] = [
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
      !isAwakeningReflectionComplete(record.reflection.answers) ||
      !isAlivenessProjectComplete(record.alivenessProject.answers) ||
      !isAwakeningCommitmentComplete(record.commitment)
    ) {
      return { status: "incomplete_exercise" };
    }
    record = {
      ...markSectionComplete(record, "complete", now),
      status: "completed",
      currentSectionId: "complete",
      completedAt: record.completedAt ?? now,
      updatedAt: now,
    };
    record = await getChapter1Store().saveChapter1(record);
    await syncJourneyProgress(record);
    return { status: "ok", record, nextSectionId: "complete" };
  }

  record = markSectionComplete(record, sectionId, now);

  const order: Chapter1SectionId[] = [
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
    isAwakeningReflectionComplete(record.reflection.answers) &&
    isAlivenessProjectComplete(record.alivenessProject.answers) &&
    isAwakeningCommitmentComplete(record.commitment)
  ) {
    record = {
      ...markSectionComplete(record, "complete", now),
      status: "completed",
      completedAt: record.completedAt ?? now,
    };
  }

  record = await getChapter1Store().saveChapter1(record);
  await syncJourneyProgress(record);
  return { status: "ok", record, nextSectionId };
}

export async function setChapter1CurrentSectionForUser(input: {
  userId: string;
  sectionId: Chapter1SectionId;
}): Promise<
  | { status: "ok"; record: Chapter1Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "invalid_section" }
> {
  if (!isChapter1SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }
  const loaded = await loadChapter1ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }
  const now = new Date().toISOString();
  const record = await getChapter1Store().saveChapter1({
    ...loaded.record,
    currentSectionId: input.sectionId,
    status:
      loaded.record.status === "completed" ? "completed" : "in_progress",
    updatedAt: now,
  });
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export function getChapter1ContextSummaryForUserRecord(
  record: Chapter1Record | null | undefined,
) {
  return toChapter1ContextSummary(record);
}
