/**
 * Chapter III — The Decision helpers.
 */

import {
  decisionReflectionQuestions,
  type Chapter3SectionId,
  type DecisionReflectionQuestionId,
} from "@/content/journey/chapter-3-decision";
import {
  emptyDecisionReflectionAnswers,
  type Chapter3Record,
  type DecisionCommitmentState,
  type DecisionPracticeState,
  type DecisionReflectionAnswers,
  type DecisionReflectionState,
} from "@/lib/journey/chapters/types";

export function isDecisionReflectionComplete(
  answers: DecisionReflectionAnswers,
): boolean {
  return decisionReflectionQuestions.every(
    (question) => answers[question.id]?.trim().length > 0,
  );
}

export function isDecisionPracticeComplete(statement: string): boolean {
  return statement.trim().length > 0;
}

export function isDecisionCommitmentComplete(
  commitment: DecisionCommitmentState,
): boolean {
  return commitment.affirmed === true;
}

export function countFilledReflectionAnswers(
  answers: DecisionReflectionAnswers,
): number {
  return decisionReflectionQuestions.filter(
    (question) => answers[question.id]?.trim().length > 0,
  ).length;
}

export function normalizeReflectionAnswers(
  raw: unknown,
): DecisionReflectionAnswers {
  const next = emptyDecisionReflectionAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const question of decisionReflectionQuestions) {
    const value = source[question.id];
    next[question.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function mergeDecisionReflection(
  current: DecisionReflectionState,
  incoming: Partial<Record<DecisionReflectionQuestionId, unknown>>,
  now: string,
): DecisionReflectionState {
  const answers = { ...current.answers };
  for (const question of decisionReflectionQuestions) {
    if (Object.prototype.hasOwnProperty.call(incoming, question.id)) {
      const value = incoming[question.id];
      answers[question.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isDecisionReflectionComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeDecisionPractice(
  current: DecisionPracticeState,
  statement: unknown,
  now: string,
): DecisionPracticeState {
  const nextStatement = typeof statement === "string" ? statement : current.statement;
  const complete = isDecisionPracticeComplete(nextStatement);
  return {
    statement: nextStatement,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeDecisionCommitment(
  current: DecisionCommitmentState,
  incoming: Partial<{ affirmed: unknown; note: unknown }>,
  now: string,
): DecisionCommitmentState {
  const affirmed =
    typeof incoming.affirmed === "boolean"
      ? incoming.affirmed
      : current.affirmed;
  const note =
    typeof incoming.note === "string" ? incoming.note : current.note;
  const next = { affirmed, note, updatedAt: now, completedAt: current.completedAt };
  const complete = isDecisionCommitmentComplete(next);
  return {
    ...next,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function markChapter3SectionComplete(
  record: Chapter3Record,
  sectionId: Chapter3SectionId,
  now: string,
): Chapter3Record {
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

export function resolveChapter3ResumeSection(
  record: Chapter3Record,
): Chapter3SectionId {
  if (record.status === "completed") {
    return "complete";
  }

  const order: Chapter3SectionId[] = [
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

export type Chapter3ContextSummary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: Chapter3SectionId;
  completedSectionIds: Chapter3SectionId[];
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

export function toChapter3ContextSummary(
  record: Chapter3Record | null | undefined,
): Chapter3ContextSummary {
  const targetCount = decisionReflectionQuestions.length;

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
  const reflectionComplete = isDecisionReflectionComplete(
    record.reflection.answers,
  );
  const practiceComplete = isDecisionPracticeComplete(record.practice.statement);
  const commitmentComplete = isDecisionCommitmentComplete(record.commitment);

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
