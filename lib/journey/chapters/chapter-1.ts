/**
 * Row 85 — Chapter I Aliveness Project completion helpers.
 */

import {
  alivenessProjectQuestions,
  awakeningReflectionQuestions,
  type AlivenessProjectQuestionId,
  type AwakeningReflectionQuestionId,
  type Chapter1SectionId,
} from "@/content/journey/chapter-1-awakening";
import type {
  AlivenessProjectAnswers,
  AlivenessProjectState,
  AwakeningCommitmentState,
  AwakeningReflectionAnswers,
  AwakeningReflectionState,
  Chapter1Record,
} from "@/lib/journey/chapters/types";
import { emptyAwakeningReflectionAnswers } from "@/lib/journey/chapters/types";

export function countNonEmptyAnswers(answers: string[]): number {
  return answers.filter((entry) => entry.trim().length > 0).length;
}

export function normalizeAnswerRows(raw: unknown, max = 200): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => (typeof entry === "string" ? entry : ""))
    .slice(0, max);
}

export function isAlivenessProjectQuestionComplete(
  questionId: AlivenessProjectQuestionId,
  answers: AlivenessProjectAnswers,
): boolean {
  const question = alivenessProjectQuestions.find(
    (entry) => entry.id === questionId,
  );
  if (!question) {
    return false;
  }
  return countNonEmptyAnswers(answers[questionId]) >= question.targetCount;
}

export function isAlivenessProjectComplete(
  answers: AlivenessProjectAnswers,
): boolean {
  return alivenessProjectQuestions.every((question) =>
    isAlivenessProjectQuestionComplete(question.id, answers),
  );
}

export function mergeAlivenessProjectAnswers(
  current: AlivenessProjectState,
  incoming: Partial<Record<AlivenessProjectQuestionId, unknown>>,
  now: string,
): AlivenessProjectState {
  const nextAnswers: AlivenessProjectAnswers = {
    q1: current.answers.q1,
    q2: current.answers.q2,
    q3: current.answers.q3,
    q4: current.answers.q4,
    q5: current.answers.q5,
  };

  for (const question of alivenessProjectQuestions) {
    if (Object.prototype.hasOwnProperty.call(incoming, question.id)) {
      nextAnswers[question.id] = normalizeAnswerRows(incoming[question.id]);
    }
  }

  const complete = isAlivenessProjectComplete(nextAnswers);
  return {
    answers: nextAnswers,
    updatedAt: now,
    completedAt: complete
      ? current.completedAt ?? now
      : null,
  };
}

export function isAwakeningReflectionComplete(
  answers: AwakeningReflectionAnswers,
): boolean {
  return awakeningReflectionQuestions.every(
    (question) => answers[question.id]?.trim().length > 0,
  );
}

export function isAwakeningCommitmentComplete(
  commitment: AwakeningCommitmentState,
): boolean {
  return commitment.affirmed === true;
}

export function countFilledAwakeningReflectionAnswers(
  answers: AwakeningReflectionAnswers,
): number {
  return awakeningReflectionQuestions.filter(
    (question) => answers[question.id]?.trim().length > 0,
  ).length;
}

export function normalizeAwakeningReflectionAnswers(
  raw: unknown,
): AwakeningReflectionAnswers {
  const next = emptyAwakeningReflectionAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const question of awakeningReflectionQuestions) {
    const value = source[question.id];
    next[question.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function mergeAwakeningReflection(
  current: AwakeningReflectionState,
  incoming: Partial<Record<AwakeningReflectionQuestionId, unknown>>,
  now: string,
): AwakeningReflectionState {
  const answers = { ...current.answers };
  for (const question of awakeningReflectionQuestions) {
    if (Object.prototype.hasOwnProperty.call(incoming, question.id)) {
      const value = incoming[question.id];
      answers[question.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isAwakeningReflectionComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeAwakeningCommitment(
  current: AwakeningCommitmentState,
  incoming: Partial<{ affirmed: unknown; note: unknown }>,
  now: string,
): AwakeningCommitmentState {
  const affirmed =
    typeof incoming.affirmed === "boolean"
      ? incoming.affirmed
      : current.affirmed;
  const note =
    typeof incoming.note === "string" ? incoming.note : current.note;
  const next = { affirmed, note, updatedAt: now, completedAt: current.completedAt };
  const complete = isAwakeningCommitmentComplete(next);
  return {
    ...next,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function markSectionComplete(
  record: Chapter1Record,
  sectionId: Chapter1SectionId,
  now: string,
): Chapter1Record {
  const completedSectionIds = record.completedSectionIds.includes(sectionId)
    ? record.completedSectionIds
    : [...record.completedSectionIds, sectionId];

  return {
    ...record,
    completedSectionIds,
    updatedAt: now,
    status:
      record.status === "completed" ? "completed" : "in_progress",
  };
}

export function resolveResumeSection(record: Chapter1Record): Chapter1SectionId {
  if (record.status === "completed") {
    return "complete";
  }

  const order: Chapter1SectionId[] = [
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

export type Chapter1ContextSummary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: Chapter1SectionId;
  completedSectionIds: Chapter1SectionId[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  alivenessProject: {
    status: "not_started" | "in_progress" | "complete";
    answerCounts: Record<AlivenessProjectQuestionId, number>;
    targets: Record<AlivenessProjectQuestionId, number>;
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

export function toChapter1ContextSummary(
  record: Chapter1Record | null | undefined,
): Chapter1ContextSummary {
  const targets = Object.fromEntries(
    alivenessProjectQuestions.map((question) => [
      question.id,
      question.targetCount,
    ]),
  ) as Record<AlivenessProjectQuestionId, number>;
  const reflectionTarget = awakeningReflectionQuestions.length;

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
      alivenessProject: {
        status: "not_started",
        answerCounts: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 },
        targets,
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

  const answerCounts = {
    q1: countNonEmptyAnswers(record.alivenessProject.answers.q1),
    q2: countNonEmptyAnswers(record.alivenessProject.answers.q2),
    q3: countNonEmptyAnswers(record.alivenessProject.answers.q3),
    q4: countNonEmptyAnswers(record.alivenessProject.answers.q4),
    q5: countNonEmptyAnswers(record.alivenessProject.answers.q5),
  };

  const projectComplete = isAlivenessProjectComplete(
    record.alivenessProject.answers,
  );
  const projectStarted = Object.values(answerCounts).some((count) => count > 0);
  const filledCount = countFilledAwakeningReflectionAnswers(
    record.reflection.answers,
  );
  const reflectionComplete = isAwakeningReflectionComplete(
    record.reflection.answers,
  );
  const commitmentComplete = isAwakeningCommitmentComplete(record.commitment);

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
    alivenessProject: {
      status: projectComplete
        ? "complete"
        : projectStarted
          ? "in_progress"
          : "not_started",
      answerCounts,
      targets,
      completedAt: record.alivenessProject.completedAt,
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
