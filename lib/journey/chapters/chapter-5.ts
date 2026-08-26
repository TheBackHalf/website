/**
 * Chapter V — Becoming the Architect helpers.
 */

import {
  architectReflectionQuestions,
  type ArchitectReflectionQuestionId,
  type Chapter5SectionId,
} from "@/content/journey/chapter-5-architect";
import {
  emptyArchitectReflectionAnswers,
  type ArchitectCommitmentState,
  type ArchitectPracticeState,
  type ArchitectReflectionAnswers,
  type ArchitectReflectionState,
  type Chapter5Record,
} from "@/lib/journey/chapters/types";

export function isArchitectReflectionComplete(
  answers: ArchitectReflectionAnswers,
): boolean {
  return architectReflectionQuestions.every(
    (question) => answers[question.id]?.trim().length > 0,
  );
}

export function isArchitectPracticeComplete(statement: string): boolean {
  return statement.trim().length > 0;
}

export function isArchitectCommitmentComplete(
  commitment: ArchitectCommitmentState,
): boolean {
  return commitment.affirmed === true;
}

export function countFilledReflectionAnswers(
  answers: ArchitectReflectionAnswers,
): number {
  return architectReflectionQuestions.filter(
    (question) => answers[question.id]?.trim().length > 0,
  ).length;
}

export function normalizeReflectionAnswers(
  raw: unknown,
): ArchitectReflectionAnswers {
  const next = emptyArchitectReflectionAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const question of architectReflectionQuestions) {
    const value = source[question.id];
    next[question.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function mergeArchitectReflection(
  current: ArchitectReflectionState,
  incoming: Partial<Record<ArchitectReflectionQuestionId, unknown>>,
  now: string,
): ArchitectReflectionState {
  const answers = { ...current.answers };
  for (const question of architectReflectionQuestions) {
    if (Object.prototype.hasOwnProperty.call(incoming, question.id)) {
      const value = incoming[question.id];
      answers[question.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isArchitectReflectionComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeArchitectPractice(
  current: ArchitectPracticeState,
  statement: unknown,
  now: string,
): ArchitectPracticeState {
  const nextStatement =
    typeof statement === "string" ? statement : current.statement;
  const complete = isArchitectPracticeComplete(nextStatement);
  return {
    statement: nextStatement,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeArchitectCommitment(
  current: ArchitectCommitmentState,
  incoming: Partial<{ affirmed: unknown; note: unknown }>,
  now: string,
): ArchitectCommitmentState {
  const affirmed =
    typeof incoming.affirmed === "boolean"
      ? incoming.affirmed
      : current.affirmed;
  const note =
    typeof incoming.note === "string" ? incoming.note : current.note;
  const next = { affirmed, note, updatedAt: now, completedAt: current.completedAt };
  const complete = isArchitectCommitmentComplete(next);
  return {
    ...next,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function markChapter5SectionComplete(
  record: Chapter5Record,
  sectionId: Chapter5SectionId,
  now: string,
): Chapter5Record {
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

export function resolveChapter5ResumeSection(
  record: Chapter5Record,
): Chapter5SectionId {
  if (record.status === "completed") {
    return "complete";
  }

  const order: Chapter5SectionId[] = [
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

export type Chapter5ContextSummary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: Chapter5SectionId;
  completedSectionIds: Chapter5SectionId[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  practice: {
    status: "not_started" | "in_progress" | "complete";
    hasStatement: boolean;
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

export function toChapter5ContextSummary(
  record: Chapter5Record | null | undefined,
): Chapter5ContextSummary {
  const targetCount = architectReflectionQuestions.length;

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
        hasStatement: false,
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
  const reflectionComplete = isArchitectReflectionComplete(
    record.reflection.answers,
  );
  const practiceComplete = isArchitectPracticeComplete(record.practice.statement);
  const commitmentComplete = isArchitectCommitmentComplete(record.commitment);

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
        : record.practice.statement.trim().length > 0
          ? "in_progress"
          : "not_started",
      hasStatement: practiceComplete,
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
