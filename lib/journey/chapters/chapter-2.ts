/**
 * Chapter II — The Mirror exercise completion helpers.
 */

import {
  MIRROR_DIMENSIONS,
  MIRROR_STEP_FOUR,
  MIRROR_STEP_ONE,
  MIRROR_STEP_THREE,
  MIRROR_STEP_TWO,
  mirrorReflectionQuestions,
  type Chapter2SectionId,
  type MirrorDimensionId,
  type MirrorMatrixRow,
  type MirrorReflectionQuestionId,
} from "@/content/journey/chapter-2-mirror";
import type {
  Chapter2Record,
  MirrorCommitmentState,
  MirrorExerciseAnswers,
  MirrorExerciseState,
  MirrorReflectionAnswers,
  MirrorReflectionState,
} from "@/lib/journey/chapters/types";
import { emptyMirrorReflectionAnswers } from "@/lib/journey/chapters/types";

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

export function isMatrixRowComplete(row: MirrorMatrixRow): boolean {
  return (
    row.expectation.trim().length > 0 &&
    row.intention.trim().length > 0 &&
    row.decision.trim().length > 0 &&
    row.dailyEvidence.trim().length > 0
  );
}

export function isMirrorStep1Complete(answers: MirrorExerciseAnswers): boolean {
  return countNonEmptyAnswers(answers.step1) >= MIRROR_STEP_ONE.targetCount;
}

export function isMirrorStep2Complete(answers: MirrorExerciseAnswers): boolean {
  return countNonEmptyAnswers(answers.step2) >= MIRROR_STEP_TWO.targetCount;
}

export function isMirrorStep3Complete(answers: MirrorExerciseAnswers): boolean {
  const completeRows = answers.step3.filter(isMatrixRowComplete).length;
  return completeRows >= MIRROR_STEP_THREE.minCompleteRows;
}

export function isMirrorStep4Complete(answers: MirrorExerciseAnswers): boolean {
  const filled = MIRROR_DIMENSIONS.filter(
    (dimension) => answers.step4[dimension.id]?.trim().length > 0,
  ).length;
  return filled >= MIRROR_STEP_FOUR.minFilledDimensions;
}

export function isMirrorExerciseComplete(
  answers: MirrorExerciseAnswers,
): boolean {
  return (
    isMirrorStep1Complete(answers) &&
    isMirrorStep2Complete(answers) &&
    isMirrorStep3Complete(answers) &&
    isMirrorStep4Complete(answers)
  );
}

function normalizeMatrixRow(raw: unknown): MirrorMatrixRow {
  if (!raw || typeof raw !== "object") {
    return {
      expectation: "",
      intention: "",
      decision: "",
      dailyEvidence: "",
    };
  }
  const source = raw as Record<string, unknown>;
  return {
    expectation:
      typeof source.expectation === "string" ? source.expectation : "",
    intention: typeof source.intention === "string" ? source.intention : "",
    decision: typeof source.decision === "string" ? source.decision : "",
    dailyEvidence:
      typeof source.dailyEvidence === "string" ? source.dailyEvidence : "",
  };
}

export function normalizeMatrixRows(raw: unknown, max = 100): MirrorMatrixRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeMatrixRow).slice(0, max);
}

function normalizeStep4(
  raw: unknown,
  fallback: Record<MirrorDimensionId, string>,
): Record<MirrorDimensionId, string> {
  const next = { ...fallback };
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const dimension of MIRROR_DIMENSIONS) {
    if (Object.prototype.hasOwnProperty.call(source, dimension.id)) {
      const value = source[dimension.id];
      next[dimension.id] = typeof value === "string" ? value : "";
    }
  }
  return next;
}

export function mergeMirrorExerciseAnswers(
  current: MirrorExerciseState,
  incoming: Partial<{
    step1: unknown;
    step2: unknown;
    step3: unknown;
    step4: unknown;
  }>,
  now: string,
): MirrorExerciseState {
  const nextAnswers: MirrorExerciseAnswers = {
    step1: current.answers.step1,
    step2: current.answers.step2,
    step3: current.answers.step3,
    step4: { ...current.answers.step4 },
  };

  if (Object.prototype.hasOwnProperty.call(incoming, "step1")) {
    nextAnswers.step1 = normalizeAnswerRows(incoming.step1);
  }
  if (Object.prototype.hasOwnProperty.call(incoming, "step2")) {
    nextAnswers.step2 = normalizeAnswerRows(incoming.step2);
  }
  if (Object.prototype.hasOwnProperty.call(incoming, "step3")) {
    nextAnswers.step3 = normalizeMatrixRows(incoming.step3);
  }
  if (Object.prototype.hasOwnProperty.call(incoming, "step4")) {
    nextAnswers.step4 = normalizeStep4(incoming.step4, nextAnswers.step4);
  }

  const complete = isMirrorExerciseComplete(nextAnswers);
  return {
    answers: nextAnswers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function isMirrorReflectionComplete(
  answers: MirrorReflectionAnswers,
): boolean {
  return mirrorReflectionQuestions.every(
    (question) => answers[question.id]?.trim().length > 0,
  );
}

export function isMirrorCommitmentComplete(
  commitment: MirrorCommitmentState,
): boolean {
  return commitment.affirmed === true;
}

export function countFilledMirrorReflectionAnswers(
  answers: MirrorReflectionAnswers,
): number {
  return mirrorReflectionQuestions.filter(
    (question) => answers[question.id]?.trim().length > 0,
  ).length;
}

export function normalizeMirrorReflectionAnswers(
  raw: unknown,
): MirrorReflectionAnswers {
  const next = emptyMirrorReflectionAnswers();
  if (!raw || typeof raw !== "object") {
    return next;
  }
  const source = raw as Record<string, unknown>;
  for (const question of mirrorReflectionQuestions) {
    const value = source[question.id];
    next[question.id] = typeof value === "string" ? value : "";
  }
  return next;
}

export function mergeMirrorReflection(
  current: MirrorReflectionState,
  incoming: Partial<Record<MirrorReflectionQuestionId, unknown>>,
  now: string,
): MirrorReflectionState {
  const answers = { ...current.answers };
  for (const question of mirrorReflectionQuestions) {
    if (Object.prototype.hasOwnProperty.call(incoming, question.id)) {
      const value = incoming[question.id];
      answers[question.id] = typeof value === "string" ? value : "";
    }
  }
  const complete = isMirrorReflectionComplete(answers);
  return {
    answers,
    updatedAt: now,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function mergeMirrorCommitment(
  current: MirrorCommitmentState,
  incoming: Partial<{ affirmed: unknown; note: unknown }>,
  now: string,
): MirrorCommitmentState {
  const affirmed =
    typeof incoming.affirmed === "boolean"
      ? incoming.affirmed
      : current.affirmed;
  const note =
    typeof incoming.note === "string" ? incoming.note : current.note;
  const next = { affirmed, note, updatedAt: now, completedAt: current.completedAt };
  const complete = isMirrorCommitmentComplete(next);
  return {
    ...next,
    completedAt: complete ? (current.completedAt ?? now) : null,
  };
}

export function markChapter2SectionComplete(
  record: Chapter2Record,
  sectionId: Chapter2SectionId,
  now: string,
): Chapter2Record {
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

export function resolveChapter2ResumeSection(
  record: Chapter2Record,
): Chapter2SectionId {
  if (record.status === "completed") {
    return "complete";
  }

  const order: Chapter2SectionId[] = [
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

export type Chapter2ContextSummary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: Chapter2SectionId;
  completedSectionIds: Chapter2SectionId[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  mirrorExercise: {
    status: "not_started" | "in_progress" | "complete";
    step1Count: number;
    step2Count: number;
    step3CompleteRows: number;
    step4FilledDimensions: number;
    targets: {
      step1: number;
      step2: number;
      step3: number;
      step4: number;
    };
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

export function toChapter2ContextSummary(
  record: Chapter2Record | null | undefined,
): Chapter2ContextSummary {
  const targets = {
    step1: MIRROR_STEP_ONE.targetCount,
    step2: MIRROR_STEP_TWO.targetCount,
    step3: MIRROR_STEP_THREE.minCompleteRows,
    step4: MIRROR_STEP_FOUR.minFilledDimensions,
  };
  const reflectionTarget = mirrorReflectionQuestions.length;

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
      mirrorExercise: {
        status: "not_started",
        step1Count: 0,
        step2Count: 0,
        step3CompleteRows: 0,
        step4FilledDimensions: 0,
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

  const step1Count = countNonEmptyAnswers(record.mirrorExercise.answers.step1);
  const step2Count = countNonEmptyAnswers(record.mirrorExercise.answers.step2);
  const step3CompleteRows = record.mirrorExercise.answers.step3.filter(
    isMatrixRowComplete,
  ).length;
  const step4FilledDimensions = MIRROR_DIMENSIONS.filter(
    (dimension) =>
      record.mirrorExercise.answers.step4[dimension.id]?.trim().length > 0,
  ).length;

  const exerciseComplete = isMirrorExerciseComplete(
    record.mirrorExercise.answers,
  );
  const exerciseStarted =
    step1Count > 0 ||
    step2Count > 0 ||
    step3CompleteRows > 0 ||
    step4FilledDimensions > 0 ||
    record.mirrorExercise.answers.step3.length > 0;
  const filledCount = countFilledMirrorReflectionAnswers(
    record.reflection.answers,
  );
  const reflectionComplete = isMirrorReflectionComplete(
    record.reflection.answers,
  );
  const commitmentComplete = isMirrorCommitmentComplete(record.commitment);

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
    mirrorExercise: {
      status: exerciseComplete
        ? "complete"
        : exerciseStarted
          ? "in_progress"
          : "not_started",
      step1Count,
      step2Count,
      step3CompleteRows,
      step4FilledDimensions,
      targets,
      completedAt: record.mirrorExercise.completedAt,
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
