/**
 * Chapter VI — Expansion helpers.
 */

import {
  EXPANSION_PRACTICE,
  expansionReflectionQuestions,
  type Chapter6SectionId,
  type ExpansionPracticeId,
  type ExpansionReflectionQuestionId,
} from "@/content/journey/chapter-6-expansion";
import {
  emptyExpansionPracticeAnswers,
  emptyExpansionReflectionAnswers,
  type Chapter6Record,
  type ExpansionCommitmentState,
  type ExpansionPracticeAnswers,
  type ExpansionPracticeState,
  type ExpansionReflectionAnswers,
  type ExpansionReflectionState,
} from "@/lib/journey/chapters/types";

export function isExpansionReflectionComplete(
  answers: ExpansionReflectionAnswers,
): boolean {
  return expansionReflectionQuestions.every(
    (question) => answers[question.id]?.trim().length > 0,
  );
}

export function isExpansionPracticeComplete(
  answers: ExpansionPracticeAnswers,
): boolean {
  return EXPANSION_PRACTICE.entries.every(
    (entry) => answers[entry.id]?.trim().length > 0,
  );
}

export function isExpansionCommitmentComplete(
  commitment: ExpansionCommitmentState,
): boolean {
  return commitment.affirmed === true;
}

export function countFilledReflectionAnswers(
  answers: ExpansionReflectionAnswers,
): number {
  return expansionReflectionQuestions.filter(
    (question) => answers[question.id]?.trim().length > 0,
  ).length;
}

export function countFilledPracticeAnswers(
  answers: ExpansionPracticeAnswers,
): number {
  return EXPANSION_PRACTICE.entries.filter(
    (entry) => answers[entry.id]?.trim().length > 0,
  ).length;
}

export function normalizeReflectionAnswers(
  raw: unknown,
): ExpansionReflectionAnswers {
  const next = emptyExpansionReflectionAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const question of expansionReflectionQuestions) {
    const value = source[question.id];
    next[question.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function normalizePracticeAnswers(
  raw: unknown,
): ExpansionPracticeAnswers {
  const next = emptyExpansionPracticeAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const entry of EXPANSION_PRACTICE.entries) {
    const value = source[entry.id];
    next[entry.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function mergeExpansionReflection(
  current: ExpansionReflectionState,
  incoming: Partial<Record<ExpansionReflectionQuestionId, unknown>>,
  now: string,
): ExpansionReflectionState {
  const answers = { ...current.answers };
  for (const question of expansionReflectionQuestions) {
    if (Object.prototype.hasOwnProperty.call(incoming, question.id)) {
      const value = incoming[question.id];
      answers[question.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isExpansionReflectionComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeExpansionPractice(
  current: ExpansionPracticeState,
  incoming: Partial<Record<ExpansionPracticeId, unknown>>,
  now: string,
): ExpansionPracticeState {
  const answers = { ...current.answers };
  for (const entry of EXPANSION_PRACTICE.entries) {
    if (Object.prototype.hasOwnProperty.call(incoming, entry.id)) {
      const value = incoming[entry.id];
      answers[entry.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isExpansionPracticeComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeExpansionCommitment(
  current: ExpansionCommitmentState,
  incoming: Partial<{ affirmed: unknown; note: unknown }>,
  now: string,
): ExpansionCommitmentState {
  const affirmed =
    typeof incoming.affirmed === "boolean"
      ? incoming.affirmed
      : current.affirmed;
  const note =
    typeof incoming.note === "string" ? incoming.note : current.note;
  const next = { affirmed, note, updatedAt: now, completedAt: current.completedAt };
  const complete = isExpansionCommitmentComplete(next);
  return {
    ...next,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function markChapter6SectionComplete(
  record: Chapter6Record,
  sectionId: Chapter6SectionId,
  now: string,
): Chapter6Record {
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

export function resolveChapter6ResumeSection(
  record: Chapter6Record,
): Chapter6SectionId {
  if (record.status === "completed") {
    return "complete";
  }

  const order: Chapter6SectionId[] = [
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

export type Chapter6ContextSummary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: Chapter6SectionId;
  completedSectionIds: Chapter6SectionId[];
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

export function toChapter6ContextSummary(
  record: Chapter6Record | null | undefined,
): Chapter6ContextSummary {
  const targetCount = expansionReflectionQuestions.length;
  const practiceTarget = EXPANSION_PRACTICE.entries.length;

  if (!record) {
    return {
      status: "not_started",
      currentSectionId: "welcome",
      completedSectionIds: [],
      reflection: {
        status: "not_started",
        filledCount: 0,
        targetCount,
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
  const reflectionComplete = isExpansionReflectionComplete(
    record.reflection.answers,
  );
  const practiceComplete = isExpansionPracticeComplete(record.practice.answers);
  const commitmentComplete = isExpansionCommitmentComplete(record.commitment);

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
      targetCount,
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
