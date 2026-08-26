/**
 * Chapter VII service (entitled, account-scoped).
 * Completing Chapter VII records journey_completed — never inferred from stage 7 alone.
 */

import {
  CHAPTER_7_ID,
  isChapter7SectionId,
  type BeginningReflectionQuestionId,
  type Chapter7SectionId,
} from "@/content/journey/chapter-7-beginning";
import {
  isBeginningCommitmentComplete,
  isBeginningPracticeComplete,
  isBeginningReflectionComplete,
  markChapter7SectionComplete,
  mergeBeginningCommitment,
  mergeBeginningPractice,
  mergeBeginningReflection,
  resolveChapter7ResumeSection,
  toChapter7ContextSummary,
} from "@/lib/journey/chapters/chapter-7";
import {
  ensureChapter7Record,
  getChapter7Store,
} from "@/lib/journey/chapters/chapter-7-store";
import type { Chapter7Record } from "@/lib/journey/chapters/types";
import {
  loadOnboardingForEntitledUser,
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";
import { getJourneyProgressStore } from "@/lib/journey/progress";

export type Chapter7LoadResult =
  | {
      status: "ok";
      record: Chapter7Record;
      resumeSectionId: Chapter7SectionId;
      context: ReturnType<typeof toChapter7ContextSummary>;
    }
  | { status: "blocked"; reason: OnboardingAccessError };

async function syncJourneyProgress(record: Chapter7Record): Promise<void> {
  const progressStatus =
    record.status === "completed" ? "journey_completed" : "in_progress";

  await getJourneyProgressStore().upsertProgress({
    userId: record.userId,
    chapterId: CHAPTER_7_ID,
    status: progressStatus,
  });
}

export async function loadChapter7ForUser(
  userId: string,
): Promise<Chapter7LoadResult> {
  const loaded = await loadOnboardingForEntitledUser(userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const store = getChapter7Store();
  let record = ensureChapter7Record(
    await store.findChapter7ForUser(userId),
    userId,
  );

  if (record.status === "not_started") {
    const now = new Date().toISOString();
    record = {
      ...record,
      status: "in_progress",
      updatedAt: now,
    };
    record = await store.saveChapter7(record);
    await syncJourneyProgress(record);
  }

  return {
    status: "ok",
    record,
    resumeSectionId: resolveChapter7ResumeSection(record),
    context: toChapter7ContextSummary(record),
  };
}

export async function saveChapter7ReflectionForUser(input: {
  userId: string;
  answers: Partial<Record<BeginningReflectionQuestionId, unknown>>;
}): Promise<
  | { status: "ok"; record: Chapter7Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter7ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const reflection = mergeBeginningReflection(
    record.reflection,
    input.answers,
    now,
  );

  record = {
    ...record,
    status: record.status === "completed" ? "completed" : "in_progress",
    reflection,
    updatedAt: now,
  };

  if (isBeginningReflectionComplete(reflection.answers)) {
    record = markChapter7SectionComplete(record, "reflection", now);
  }

  record = await getChapter7Store().saveChapter7(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter7PracticeForUser(input: {
  userId: string;
  statement?: unknown;
  signature?: unknown;
  signedDate?: unknown;
}): Promise<
  | { status: "ok"; record: Chapter7Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter7ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const practice = mergeBeginningPractice(
    record.practice,
    {
      statement: input.statement,
      signature: input.signature,
      signedDate: input.signedDate,
    },
    now,
  );

  record = {
    ...record,
    status: record.status === "completed" ? "completed" : "in_progress",
    practice,
    updatedAt: now,
  };

  if (isBeginningPracticeComplete(practice)) {
    record = markChapter7SectionComplete(record, "practice", now);
  }

  record = await getChapter7Store().saveChapter7(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function saveChapter7CommitmentForUser(input: {
  userId: string;
  affirmed?: unknown;
  note?: unknown;
}): Promise<
  | { status: "ok"; record: Chapter7Record }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const loaded = await loadChapter7ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const commitment = mergeBeginningCommitment(
    record.commitment,
    { affirmed: input.affirmed, note: input.note },
    now,
  );

  record = {
    ...record,
    status: record.status === "completed" ? "completed" : "in_progress",
    commitment,
    updatedAt: now,
  };

  if (isBeginningCommitmentComplete(commitment)) {
    record = markChapter7SectionComplete(record, "commitment", now);
  }

  record = await getChapter7Store().saveChapter7(record);
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export async function advanceChapter7SectionForUser(input: {
  userId: string;
  sectionId: Chapter7SectionId;
}): Promise<
  | {
      status: "ok";
      record: Chapter7Record;
      nextSectionId: Chapter7SectionId;
    }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "incomplete_work" }
  | { status: "invalid_section" }
> {
  if (!isChapter7SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter7ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  let record = loaded.record;
  const sectionId = input.sectionId;

  if (sectionId === "reflection") {
    if (!isBeginningReflectionComplete(record.reflection.answers)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "practice") {
    if (!isBeginningPracticeComplete(record.practice)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "commitment") {
    if (!isBeginningCommitmentComplete(record.commitment)) {
      return { status: "incomplete_work" };
    }
  }

  if (sectionId === "complete") {
    const required: Chapter7SectionId[] = [
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
      !isBeginningReflectionComplete(record.reflection.answers) ||
      !isBeginningPracticeComplete(record.practice) ||
      !isBeginningCommitmentComplete(record.commitment)
    ) {
      return { status: "incomplete_work" };
    }

    record = {
      ...markChapter7SectionComplete(record, "complete", now),
      status: "completed",
      currentSectionId: "complete",
      completedAt: record.completedAt ?? now,
      updatedAt: now,
    };
    record = await getChapter7Store().saveChapter7(record);
    await syncJourneyProgress(record);
    return { status: "ok", record, nextSectionId: "complete" };
  }

  record = markChapter7SectionComplete(record, sectionId, now);

  const order: Chapter7SectionId[] = [
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

  record = await getChapter7Store().saveChapter7(record);
  await syncJourneyProgress(record);
  return { status: "ok", record, nextSectionId };
}

export async function setChapter7CurrentSectionForUser(input: {
  userId: string;
  sectionId: Chapter7SectionId;
}): Promise<
  | { status: "ok"; record: Chapter7Record }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "invalid_section" }
> {
  if (!isChapter7SectionId(input.sectionId)) {
    return { status: "invalid_section" };
  }

  const loaded = await loadChapter7ForUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const now = new Date().toISOString();
  const record = await getChapter7Store().saveChapter7({
    ...loaded.record,
    currentSectionId: input.sectionId,
    status:
      loaded.record.status === "completed" ? "completed" : "in_progress",
    updatedAt: now,
  });
  await syncJourneyProgress(record);
  return { status: "ok", record };
}

export function getChapter7ContextSummaryForUserRecord(
  record: Chapter7Record | null | undefined,
) {
  return toChapter7ContextSummary(record);
}
