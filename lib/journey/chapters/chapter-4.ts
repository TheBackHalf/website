/**
 * Chapter IV — The Standards helpers.
 */

import {
  STANDARDS_PRACTICE,
  standardsReflectionQuestions,
  type Chapter4SectionId,
  type StandardsPracticeId,
  type StandardsReflectionQuestionId,
} from "@/content/journey/chapter-4-standards";
import {
  emptyStandardsPracticeAnswers,
  emptyStandardsReflectionAnswers,
  type Chapter4Record,
  type StandardsCommitmentState,
  type StandardsPracticeAnswers,
  type StandardsPracticeState,
  type StandardsReflectionAnswers,
  type StandardsReflectionState,
} from "@/lib/journey/chapters/types";

export function isStandardsReflectionComplete(
  answers: StandardsReflectionAnswers,
): boolean {
  return standardsReflectionQuestions.every(
    (question) => answers[question.id]?.trim().length > 0,
  );
}

export function isStandardsPracticeComplete(
  answers: StandardsPracticeAnswers,
): boolean {
  return STANDARDS_PRACTICE.entries.every(
    (entry) => answers[entry.id]?.trim().length > 0,
  );
}

export function isStandardsCommitmentComplete(
  commitment: StandardsCommitmentState,
): boolean {
  return commitment.affirmed === true;
}

export function countFilledReflectionAnswers(
  answers: StandardsReflectionAnswers,
): number {
  return standardsReflectionQuestions.filter(
    (question) => answers[question.id]?.trim().length > 0,
  ).length;
}

export function countFilledPracticeAnswers(
  answers: StandardsPracticeAnswers,
): number {
  return STANDARDS_PRACTICE.entries.filter(
    (entry) => answers[entry.id]?.trim().length > 0,
  ).length;
}

export function normalizeReflectionAnswers(
  raw: unknown,
): StandardsReflectionAnswers {
  const next = emptyStandardsReflectionAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const question of standardsReflectionQuestions) {
    const value = source[question.id];
    next[question.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function normalizePracticeAnswers(
  raw: unknown,
): StandardsPracticeAnswers {
  const next = emptyStandardsPracticeAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const entry of STANDARDS_PRACTICE.entries) {
    const value = source[entry.id];
    next[entry.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function mergeStandardsReflection(
  current: StandardsReflectionState,
  incoming: Partial<Record<StandardsReflectionQuestionId, unknown>>,
  now: string,
): StandardsReflectionState {
  const answers = { ...current.answers };
  for (const question of standardsReflectionQuestions) {
    if (Object.prototype.hasOwnProperty.call(incoming, question.id)) {
      const value = incoming[question.id];
      answers[question.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isStandardsReflectionComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeStandardsPractice(
  current: StandardsPracticeState,
  incoming: Partial<Record<StandardsPracticeId, unknown>>,
  now: string,
): StandardsPracticeState {
  const answers = { ...current.answers };
  for (const entry of STANDARDS_PRACTICE.entries) {
    if (Object.prototype.hasOwnProperty.call(incoming, entry.id)) {
      const value = incoming[entry.id];
      answers[entry.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isStandardsPracticeComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeStandardsCommitment(
  current: StandardsCommitmentState,
  incoming: Partial<{ affirmed: unknown; note: unknown }>,
  now: string,
): StandardsCommitmentState {
  const affirmed =
    typeof incoming.affirmed === "boolean"
      ? incoming.affirmed
      : current.affirmed;
  const note =
    typeof incoming.note === "string" ? incoming.note : current.note;
  const next = { affirmed, note, updatedAt: now, completedAt: current.completedAt };
  const complete = isStandardsCommitmentComplete(next);
  return {
    ...next,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function markChapter4SectionComplete(
  record: Chapter4Record,
  sectionId: Chapter4SectionId,
  now: string,
): Chapter4Record {
  const completedSectionIds = record.completedSectionIds.includes(sectionId)
    ? record.completedSectionIds
    : [...record.completedSectionIds, sectionId];

  return {
    ...record,
    completedSectionIds,
    updatedAt: now,
    status: record.status === "completed" ? "completed" : "in_progress",
  };
}

export function resolveChapter4ResumeSection(
  record: Chapter4Record,
): Chapter4SectionId {
  if (record.status === "completed") {
    return "complete";
  }

  const order: Chapter4SectionId[] = [
    "welcome",
    "reflection",
    "practice",
    "commitment",
    "closing",
    "complete",
  ];

  for (const sectionId of order) {
    if (sectionId === "complete") {
      return "complete";
    }
    if (!record.completedSectionIds.includes(sectionId)) {
      return sectionId;
    }
  }

  return "complete";
}

export type Chapter4ContextSummary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: Chapter4SectionId;
  completedSectionIds: Chapter4SectionId[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  practice: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  commitment: {
    status: "not_started" | "in_progress" | "complete";
    affirmed: boolean;
    completedAt: string | null;
  };
  completedAt: string | null;
  updatedAt: string;
};

export function toChapter4ContextSummary(
  record: Chapter4Record | null | undefined,
): Chapter4ContextSummary {
  const reflectionTarget = standardsReflectionQuestions.length;
  const practiceTarget = STANDARDS_PRACTICE.entries.length;

  if (!record) {
    return {
      status: "not_started",
      currentSectionId: "welcome",
      completedSectionIds: [],
      reflection: {
        status: "not_started",
        filledCount: 0,
        targetCount: reflectionTarget,
        completedAt: null,
      },
      practice: {
        status: "not_started",
        filledCount: 0,
        targetCount: practiceTarget,
        completedAt: null,
      },
      commitment: {
        status: "not_started",
        affirmed: false,
        completedAt: null,
      },
      completedAt: null,
      updatedAt: "",
    };
  }

  const filledCount = countFilledReflectionAnswers(record.reflection.answers);
  const practiceFilled = countFilledPracticeAnswers(record.practice.answers);
  const reflectionComplete = isStandardsReflectionComplete(
    record.reflection.answers,
  );
  const practiceComplete = isStandardsPracticeComplete(record.practice.answers);
  const commitmentComplete = isStandardsCommitmentComplete(record.commitment);

  return {
    status:
      record.status === "completed"
        ? "complete"
        : record.status === "not_started"
          ? "not_started"
          : "in_progress",
    currentSectionId: record.currentSectionId,
    completedSectionIds: [...record.completedSectionIds],
    reflection: {
      status: reflectionComplete
        ? "complete"
        : filledCount > 0
          ? "in_progress"
          : "not_started",
      filledCount,
      targetCount: reflectionTarget,
      completedAt: record.reflection.completedAt,
    },
    practice: {
      status: practiceComplete
        ? "complete"
        : practiceFilled > 0
          ? "in_progress"
          : "not_started",
      filledCount: practiceFilled,
      targetCount: practiceTarget,
      completedAt: record.practice.completedAt,
    },
    commitment: {
      status: commitmentComplete
        ? "complete"
        : record.commitment.note.trim().length > 0
          ? "in_progress"
          : "not_started",
      affirmed: record.commitment.affirmed,
      completedAt: record.commitment.completedAt,
    },
    completedAt: record.completedAt,
    updatedAt: record.updatedAt,
  };
}
