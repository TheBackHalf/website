/**
 * Assemble Architect Journey responses for Blueprint population.
 * Blank writing lines remain when a response is absent.
 */

export type BlueprintExerciseResponses = {
  /** Keyed by chapter id + exercise index, e.g. "chapter-1-awakening:0" */
  byExerciseKey: Record<string, string[]>;
  firstName?: string | null;
};

export function exerciseResponseKey(
  chapterId: string,
  exerciseIndex: number,
): string {
  return `${chapterId}:${exerciseIndex}`;
}

/**
 * Build populated response map from journey chapter payloads.
 * Accepts loosely shaped saved data so Ch1–Ch3 stores can feed the Blueprint.
 */
export function assembleBlueprintResponses(input: {
  firstName?: string | null;
  chapterResponses?: Record<
    string,
    | {
        reflections?: Array<string | null | undefined>;
        practice?: string | null;
        commitment?: string | null;
        answers?: Array<string | null | undefined>;
        fields?: Record<string, string | null | undefined>;
      }
    | null
    | undefined
  >;
}): BlueprintExerciseResponses {
  const byExerciseKey: Record<string, string[]> = {};

  for (const [chapterId, payload] of Object.entries(input.chapterResponses ?? {})) {
    if (!payload) continue;
    const buckets: string[][] = [];

    if (payload.reflections?.length) {
      buckets.push(
        payload.reflections
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean),
      );
    }
    if (payload.answers?.length) {
      buckets.push(
        payload.answers
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean),
      );
    }
    if (payload.practice?.trim()) {
      buckets.push([payload.practice.trim()]);
    }
    if (payload.commitment?.trim()) {
      buckets.push([payload.commitment.trim()]);
    }
    if (payload.fields) {
      const fieldLines = Object.values(payload.fields)
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);
      if (fieldLines.length) buckets.push(fieldLines);
    }

    buckets.forEach((lines, index) => {
      if (!lines.length) return;
      byExerciseKey[exerciseResponseKey(chapterId, index)] = lines;
    });
  }

  return {
    byExerciseKey,
    firstName: input.firstName ?? null,
  };
}

export function getExerciseResponseLines(
  responses: BlueprintExerciseResponses | null | undefined,
  chapterId: string,
  exerciseIndex: number,
): string[] {
  if (!responses) return [];
  return responses.byExerciseKey[exerciseResponseKey(chapterId, exerciseIndex)] ?? [];
}
