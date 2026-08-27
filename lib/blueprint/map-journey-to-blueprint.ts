/**
 * Pure Journey → Blueprint response mapping.
 * Print pages consume keys as `{chapterId}:{exerciseIndex}`.
 */

import { alivenessProjectQuestions } from "@/content/journey/chapter-1-awakening";
import {
  MIRROR_DIMENSIONS,
  type MirrorMatrixRow,
} from "@/content/journey/chapter-2-mirror";
import { decisionReflectionQuestions } from "@/content/journey/chapter-3-decision";
import {
  STANDARDS_PRACTICE,
  standardsReflectionQuestions,
} from "@/content/journey/chapter-4-standards";
import { architectReflectionQuestions } from "@/content/journey/chapter-5-architect";
import {
  EXPANSION_PRACTICE,
  expansionReflectionQuestions,
} from "@/content/journey/chapter-6-expansion";
import {
  BEGINNING_PRACTICE,
  beginningReflectionQuestions,
} from "@/content/journey/chapter-7-beginning";
import {
  exerciseResponseKey,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";

export type JourneyBlueprintChapter1 = {
  alivenessProject: { answers: Record<string, string[] | undefined> };
  commitment?: { note?: string | null };
};

export type JourneyBlueprintChapter2 = {
  mirrorExercise: {
    answers: {
      step1: readonly string[];
      step2: readonly string[];
      step3: readonly MirrorMatrixRow[];
      step4: Record<string, string | undefined>;
    };
  };
  commitment?: { note?: string | null };
};

export type JourneyBlueprintChapter3 = {
  reflection: { answers: Record<string, string | undefined> };
  practice: { statement?: string | null };
  commitment?: { note?: string | null };
};

export type JourneyBlueprintChapter4 = {
  reflection: { answers: Record<string, string | undefined> };
  practice: { answers: Record<string, string | undefined> };
  commitment?: { note?: string | null };
};

export type JourneyBlueprintChapter5 = {
  reflection: { answers: Record<string, string | undefined> };
  practice: { statement?: string | null };
  commitment?: { note?: string | null };
};

export type JourneyBlueprintChapter6 = {
  reflection: { answers: Record<string, string | undefined> };
  practice: { answers: Record<string, string | undefined> };
  commitment?: { note?: string | null };
};

export type JourneyBlueprintChapter7 = {
  reflection: { answers: Record<string, string | undefined> };
  practice: {
    statement?: string | null;
    signature?: string | null;
    signedDate?: string | null;
  };
  commitment?: { note?: string | null };
};

export type JourneyBlueprintSource = {
  firstName?: string | null;
  chapter1?: JourneyBlueprintChapter1 | null;
  chapter2?: JourneyBlueprintChapter2 | null;
  chapter3?: JourneyBlueprintChapter3 | null;
  chapter4?: JourneyBlueprintChapter4 | null;
  chapter5?: JourneyBlueprintChapter5 | null;
  chapter6?: JourneyBlueprintChapter6 | null;
  chapter7?: JourneyBlueprintChapter7 | null;
};

function cleanLines(values: readonly (string | null | undefined)[]): string[] {
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

function formatMatrixRow(row: MirrorMatrixRow): string {
  return [
    row.expectation.trim(),
    row.intention.trim(),
    row.decision.trim(),
    row.dailyEvidence.trim(),
  ]
    .filter(Boolean)
    .join(" | ");
}

function setExercise(
  map: Record<string, string[]>,
  chapterId: string,
  index: number,
  lines: string[],
) {
  if (!lines.length) return;
  map[exerciseResponseKey(chapterId, index)] = lines;
}

function appendCommitment(
  map: Record<string, string[]>,
  chapterId: string,
  index: number,
  note: string | null | undefined,
) {
  const commitment = note?.trim();
  if (!commitment) return;
  const key = exerciseResponseKey(chapterId, index);
  map[key] = [...(map[key] ?? []), commitment];
}

function reflectionLines(
  questions: readonly { id: string; prompt: string }[],
  answers: Record<string, string | undefined>,
): string[] {
  return questions
    .map((question) => {
      const value = answers[question.id]?.trim() ?? "";
      return value ? `${question.prompt}\n${value}` : "";
    })
    .filter(Boolean);
}

/**
 * Map saved Journey work onto Blueprint exercise keys.
 * Founder-only work (Three Lives, Founder Closing Reflections) is never included.
 * Chapter I–II Foundry reflection questions stay Journey-digital; Blueprint
 * writing pages for those chapters are Aliveness Project / Mirror steps.
 */
export function mapSavedJourneyToBlueprintResponses(
  input: JourneyBlueprintSource,
): BlueprintExerciseResponses {
  const byExerciseKey: Record<string, string[]> = {};

  if (input.chapter1) {
    alivenessProjectQuestions.forEach((question, index) => {
      setExercise(
        byExerciseKey,
        "chapter-1-awakening",
        index,
        cleanLines(input.chapter1!.alivenessProject.answers[question.id] ?? []),
      );
    });
    appendCommitment(
      byExerciseKey,
      "chapter-1-awakening",
      alivenessProjectQuestions.length - 1,
      input.chapter1.commitment?.note,
    );
  }

  if (input.chapter2) {
    const answers = input.chapter2.mirrorExercise.answers;
    setExercise(byExerciseKey, "chapter-2-mirror", 0, cleanLines(answers.step1));
    setExercise(byExerciseKey, "chapter-2-mirror", 1, cleanLines(answers.step2));
    setExercise(
      byExerciseKey,
      "chapter-2-mirror",
      2,
      answers.step3
        .map(formatMatrixRow)
        .map((line) => line.trim())
        .filter(Boolean),
    );
    setExercise(
      byExerciseKey,
      "chapter-2-mirror",
      3,
      MIRROR_DIMENSIONS.map((dimension) => {
        const value = answers.step4[dimension.id]?.trim() ?? "";
        return value ? `${dimension.label}: ${value}` : "";
      }).filter(Boolean),
    );
    appendCommitment(
      byExerciseKey,
      "chapter-2-mirror",
      3,
      input.chapter2.commitment?.note,
    );
  }

  if (input.chapter3) {
    setExercise(
      byExerciseKey,
      "chapter-3-decision",
      0,
      reflectionLines(
        decisionReflectionQuestions,
        input.chapter3.reflection.answers,
      ),
    );
    setExercise(
      byExerciseKey,
      "chapter-3-decision",
      1,
      cleanLines([input.chapter3.practice.statement]),
    );
    appendCommitment(
      byExerciseKey,
      "chapter-3-decision",
      1,
      input.chapter3.commitment?.note,
    );
  }

  if (input.chapter4) {
    setExercise(
      byExerciseKey,
      "chapter-4-standards",
      0,
      reflectionLines(
        standardsReflectionQuestions,
        input.chapter4.reflection.answers,
      ),
    );
    const standardLines = STANDARDS_PRACTICE.entries
      .map((entry) => {
        const value = input.chapter4!.practice.answers[entry.id]?.trim() ?? "";
        return value ? `${entry.label}: ${value}` : "";
      })
      .filter(Boolean);
    setExercise(byExerciseKey, "chapter-4-standards", 1, standardLines);
    appendCommitment(
      byExerciseKey,
      "chapter-4-standards",
      1,
      input.chapter4.commitment?.note,
    );
  }

  if (input.chapter5) {
    setExercise(
      byExerciseKey,
      "chapter-5-architect",
      0,
      reflectionLines(
        architectReflectionQuestions,
        input.chapter5.reflection.answers,
      ),
    );
    setExercise(
      byExerciseKey,
      "chapter-5-architect",
      1,
      cleanLines([input.chapter5.practice.statement]),
    );
    appendCommitment(
      byExerciseKey,
      "chapter-5-architect",
      1,
      input.chapter5.commitment?.note,
    );
  }

  if (input.chapter6) {
    setExercise(
      byExerciseKey,
      "chapter-6-expansion",
      0,
      reflectionLines(
        expansionReflectionQuestions,
        input.chapter6.reflection.answers,
      ),
    );
    const practiceLines = EXPANSION_PRACTICE.entries
      .map((entry) => {
        const value = input.chapter6!.practice.answers[entry.id]?.trim() ?? "";
        return value ? `${entry.label}: ${value}` : "";
      })
      .filter(Boolean);
    setExercise(byExerciseKey, "chapter-6-expansion", 1, practiceLines);
    appendCommitment(
      byExerciseKey,
      "chapter-6-expansion",
      1,
      input.chapter6.commitment?.note,
    );
  }

  if (input.chapter7) {
    setExercise(
      byExerciseKey,
      "chapter-7-beginning",
      0,
      reflectionLines(
        beginningReflectionQuestions,
        input.chapter7.reflection.answers,
      ),
    );
    const practiceLines = [
      input.chapter7.practice.statement?.trim()
        ? `${BEGINNING_PRACTICE.stem} ${input.chapter7.practice.statement.trim()}`.replace(
            /\s+/g,
            " ",
          )
        : "",
      input.chapter7.practice.signature?.trim() ?? "",
      input.chapter7.practice.signedDate?.trim() ?? "",
    ].filter(Boolean);
    setExercise(byExerciseKey, "chapter-7-beginning", 1, practiceLines);
    appendCommitment(
      byExerciseKey,
      "chapter-7-beginning",
      1,
      input.chapter7.commitment?.note,
    );
  }

  return {
    byExerciseKey,
    firstName: input.firstName ?? null,
  };
}
