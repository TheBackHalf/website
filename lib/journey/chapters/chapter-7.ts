/**
 * Chapter VII — The Beginning helpers.
 */

import {
  beginningReflectionQuestions,
  type BeginningReflectionQuestionId,
  type Chapter7SectionId,
} from "@/content/journey/chapter-7-beginning";
import {
  emptyBeginningReflectionAnswers,
  type BeginningCommitmentState,
  type BeginningPracticeState,
  type BeginningReflectionAnswers,
  type BeginningReflectionState,
  type Chapter7Record,
} from "@/lib/journey/chapters/types";

export function isBeginningReflectionComplete(
  answers: BeginningReflectionAnswers,
): boolean {
  return beginningReflectionQuestions.every(
    (question) => answers[question.id]?.trim().length > 0,
  );
}

export function isBeginningPracticeComplete(
  practice: Pick<BeginningPracticeState, "statement" | "signature" | "signedDate">,
): boolean {
  return (
    practice.statement.trim().length > 0 &&
    practice.signature.trim().length > 0 &&
    practice.signedDate.trim().length > 0
  );
}

export function isBeginningCommitmentComplete(
  commitment: BeginningCommitmentState,
): boolean {
  return commitment.affirmed === true;
}

export function countFilledReflectionAnswers(
  answers: BeginningReflectionAnswers,
): number {
  return beginningReflectionQuestions.filter(
    (question) => answers[question.id]?.trim().length > 0,
  ).length;
}

export function normalizeReflectionAnswers(
  raw: unknown,
): BeginningReflectionAnswers {
  const next = emptyBeginningReflectionAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const question of beginningReflectionQuestions) {
    const value = source[question.id];
    next[question.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function mergeBeginningReflection(
  current: BeginningReflectionState,
  incoming: Partial<Record<BeginningReflectionQuestionId, unknown>>,
  now: string,
): BeginningReflectionState {
  const answers = { ...current.answers };
  for (const question of beginningReflectionQuestions) {
    if (Object.prototype.hasOwnProperty.call(incoming, question.id)) {
      const value = incoming[question.id];
      answers[question.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isBeginningReflectionComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeBeginningPractice(
  current: BeginningPracticeState,
  incoming: {
    statement?: unknown;
    signature?: unknown;
    signedDate?: unknown;
  },
  now: string,
): BeginningPracticeState {
  const statement =
    typeof incoming.statement === "string"
      ? incoming.statement
      : current.statement;
  const signature =
    typeof incoming.signature === "string"
      ? incoming.signature
      : current.signature;
  const signedDate =
    typeof incoming.signedDate === "string"
      ? incoming.signedDate
      : current.signedDate;
  const next = { statement, signature, signedDate };
  const complete = isBeginningPracticeComplete(next);
  return {
    ...next,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeBeginningCommitment(
  current: BeginningCommitmentState,
  incoming: { affirmed?: unknown; note?: unknown },
  now: string,
): BeginningCommitmentState {
  const affirmed =
    incoming.affirmed === undefined
      ? current.affirmed
      : incoming.affirmed === true;
  const note =
    incoming.note === undefined
      ? current.note
      : typeof incoming.note === "string"
        ? incoming.note
        : current.note;
  const next = { ...current, affirmed, note, updatedAt: now };
  const complete = isBeginningCommitmentComplete(next);
  return {
    ...next,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function markChapter7SectionComplete(
  record: Chapter7Record,
  sectionId: Chapter7SectionId,
  now: string,
): Chapter7Record {
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

export function resolveChapter7ResumeSection(
  record: Chapter7Record,
): Chapter7SectionId {
  if (record.status === "completed") {
    return "complete";
  }

  const order: Chapter7SectionId[] = [
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

export type Chapter7ContextSummary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: Chapter7SectionId;
  completedSectionIds: Chapter7SectionId[];
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

export function toChapter7ContextSummary(
  record: Chapter7Record | null | undefined,
): Chapter7ContextSummary {
  const targetCount = beginningReflectionQuestions.length;

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
  const reflectionComplete = isBeginningReflectionComplete(
    record.reflection.answers,
  );
  const practiceComplete = isBeginningPracticeComplete(record.practice);
  const commitmentComplete = isBeginningCommitmentComplete(record.commitment);

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
      hasStatement: record.practice.statement.trim().length > 0,
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
