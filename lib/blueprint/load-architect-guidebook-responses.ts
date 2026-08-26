/**
 * Read-only Architect Journey → Blueprint response assembly.
 * Does not mutate chapter progress or entitlement state.
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
import { getAuthStore } from "@/lib/auth/store";
import {
  exerciseResponseKey,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";
import { getChapter2Store } from "@/lib/journey/chapters/chapter-2-store";
import { getChapter3Store } from "@/lib/journey/chapters/chapter-3-store";
import { getChapter4Store } from "@/lib/journey/chapters/chapter-4-store";
import { getChapter5Store } from "@/lib/journey/chapters/chapter-5-store";
import { getChapter6Store } from "@/lib/journey/chapters/chapter-6-store";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";
import { getChapter1Store } from "@/lib/journey/chapters/store";

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

/**
 * Load saved Journey answers for Blueprint population.
 * Missing chapters/exercises simply omit keys (blank writing lines remain).
 */
export async function loadArchitectGuidebookResponses(
  userId: string,
): Promise<BlueprintExerciseResponses> {
  const byExerciseKey: Record<string, string[]> = {};
  let firstName: string | null = null;

  try {
    const user = await getAuthStore().findUserById(userId);
    firstName = user?.firstName?.trim() || null;
  } catch {
    firstName = null;
  }

  try {
    const chapter1 = await getChapter1Store().findChapter1ForUser(userId);
    if (chapter1) {
      alivenessProjectQuestions.forEach((question, index) => {
        setExercise(
          byExerciseKey,
          "chapter-1-awakening",
          index,
          cleanLines(chapter1.alivenessProject.answers[question.id] ?? []),
        );
      });
    }
  } catch {
    // Leave chapter blank in Blueprint when store is unavailable.
  }

  try {
    const chapter2 = await getChapter2Store().findChapter2ForUser(userId);
    if (chapter2) {
      const answers = chapter2.mirrorExercise.answers;
      setExercise(
        byExerciseKey,
        "chapter-2-mirror",
        0,
        cleanLines(answers.step1),
      );
      setExercise(
        byExerciseKey,
        "chapter-2-mirror",
        1,
        cleanLines(answers.step2),
      );
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
    }
  } catch {
    // Leave chapter blank in Blueprint when store is unavailable.
  }

  try {
    const chapter3 = await getChapter3Store().findChapter3ForUser(userId);
    if (chapter3) {
      setExercise(
        byExerciseKey,
        "chapter-3-decision",
        0,
        decisionReflectionQuestions
          .map((question) => {
            const value = chapter3.reflection.answers[question.id]?.trim() ?? "";
            return value ? `${question.prompt}\n${value}` : "";
          })
          .filter(Boolean),
      );
      setExercise(
        byExerciseKey,
        "chapter-3-decision",
        1,
        cleanLines([chapter3.practice.statement]),
      );
      // Weekly commitment note attaches to practice page when present.
      const commitment = chapter3.commitment.note?.trim();
      if (commitment) {
        const practiceKey = exerciseResponseKey("chapter-3-decision", 1);
        byExerciseKey[practiceKey] = [
          ...(byExerciseKey[practiceKey] ?? []),
          commitment,
        ];
      }
    }
  } catch {
    // Leave chapter blank in Blueprint when store is unavailable.
  }

  try {
    const chapter4 = await getChapter4Store().findChapter4ForUser(userId);
    if (chapter4) {
      const standardLines = STANDARDS_PRACTICE.entries
        .map((entry) => {
          const value = chapter4.practice.answers[entry.id]?.trim() ?? "";
          return value ? `${entry.label}: ${value}` : "";
        })
        .filter(Boolean);
      const reflectionLines = standardsReflectionQuestions
        .map((question) => {
          const value = chapter4.reflection.answers[question.id]?.trim() ?? "";
          return value ? `${question.prompt}\n${value}` : "";
        })
        .filter(Boolean);
      setExercise(
        byExerciseKey,
        "chapter-4-standards",
        0,
        [...standardLines, ...reflectionLines],
      );
      const commitment = chapter4.commitment.note?.trim();
      if (commitment) {
        const practiceKey = exerciseResponseKey("chapter-4-standards", 0);
        byExerciseKey[practiceKey] = [
          ...(byExerciseKey[practiceKey] ?? []),
          commitment,
        ];
      }
    }
  } catch {
    // Leave chapter blank in Blueprint when store is unavailable.
  }

  try {
    const chapter5 = await getChapter5Store().findChapter5ForUser(userId);
    if (chapter5) {
      setExercise(
        byExerciseKey,
        "chapter-5-architect",
        0,
        architectReflectionQuestions
          .map((question) => {
            const value = chapter5.reflection.answers[question.id]?.trim() ?? "";
            return value ? `${question.prompt}\n${value}` : "";
          })
          .filter(Boolean),
      );
      setExercise(
        byExerciseKey,
        "chapter-5-architect",
        1,
        cleanLines([chapter5.practice.statement]),
      );
      const commitment = chapter5.commitment.note?.trim();
      if (commitment) {
        const practiceKey = exerciseResponseKey("chapter-5-architect", 1);
        byExerciseKey[practiceKey] = [
          ...(byExerciseKey[practiceKey] ?? []),
          commitment,
        ];
      }
    }
  } catch {
    // Leave chapter blank in Blueprint when store is unavailable.
  }

  try {
    const chapter6 = await getChapter6Store().findChapter6ForUser(userId);
    if (chapter6) {
      setExercise(
        byExerciseKey,
        "chapter-6-expansion",
        0,
        expansionReflectionQuestions
          .map((question) => {
            const value = chapter6.reflection.answers[question.id]?.trim() ?? "";
            return value ? `${question.prompt}\n${value}` : "";
          })
          .filter(Boolean),
      );
      const practiceLines = EXPANSION_PRACTICE.entries
        .map((entry) => {
          const value = chapter6.practice.answers[entry.id]?.trim() ?? "";
          return value ? `${entry.label}: ${value}` : "";
        })
        .filter(Boolean);
      setExercise(byExerciseKey, "chapter-6-expansion", 1, practiceLines);
      const commitment = chapter6.commitment.note?.trim();
      if (commitment) {
        const practiceKey = exerciseResponseKey("chapter-6-expansion", 1);
        byExerciseKey[practiceKey] = [
          ...(byExerciseKey[practiceKey] ?? []),
          commitment,
        ];
      }
    }
  } catch {
    // Leave chapter blank in Blueprint when store is unavailable.
  }

  try {
    const chapter7 = await getChapter7Store().findChapter7ForUser(userId);
    if (chapter7) {
      setExercise(
        byExerciseKey,
        "chapter-7-beginning",
        0,
        beginningReflectionQuestions
          .map((question) => {
            const value = chapter7.reflection.answers[question.id]?.trim() ?? "";
            return value ? `${question.prompt}\n${value}` : "";
          })
          .filter(Boolean),
      );
      const practiceLines = [
        chapter7.practice.statement?.trim()
          ? `${BEGINNING_PRACTICE.stem} ${chapter7.practice.statement.trim()}`.replace(
              /\s+/g,
              " ",
            )
          : "",
        chapter7.practice.signature?.trim() ?? "",
        chapter7.practice.signedDate?.trim() ?? "",
      ].filter(Boolean);
      setExercise(byExerciseKey, "chapter-7-beginning", 1, practiceLines);
      const commitment = chapter7.commitment.note?.trim();
      if (commitment) {
        const practiceKey = exerciseResponseKey("chapter-7-beginning", 1);
        byExerciseKey[practiceKey] = [
          ...(byExerciseKey[practiceKey] ?? []),
          commitment,
        ];
      }
    }
  } catch {
    // Leave chapter blank in Blueprint when store is unavailable.
  }

  return { byExerciseKey, firstName };
}
