/**
 * Map Chapter IV practice / commitment into Back Half Standards print fill.
 */

import { STANDARDS_PRACTICE } from "@/content/journey/chapter-4-standards";
import {
  getExerciseResponseLines,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";

export type BackHalfStandardsFill = {
  standards: string[];
  commitment: string | null;
  /** Ready-to-print lines for ArtifactLayout / ApprovedCopySlot. */
  lines: string[];
};

/** Practice answers live at chapter-4-standards exercise index 0. */
export const BACK_HALF_STANDARDS_EXERCISE_INDEX = 0;

/**
 * Derive Back Half Standards fill from assembled guidebook responses.
 */
export function getBackHalfStandardsFill(
  responses: BlueprintExerciseResponses | null | undefined,
): BackHalfStandardsFill {
  const raw = getExerciseResponseLines(
    responses,
    "chapter-4-standards",
    BACK_HALF_STANDARDS_EXERCISE_INDEX,
  );
  const labels = STANDARDS_PRACTICE.entries.map((entry) => entry.label);
  const standards: string[] = [];
  let commitment: string | null = null;

  for (const line of raw) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const labeled = labels.find((label) =>
      trimmed.toLowerCase().startsWith(`${label.toLowerCase()}:`),
    );
    if (labeled) {
      standards.push(trimmed);
      continue;
    }
    if (
      !commitment &&
      !trimmed.includes("?") &&
      !trimmed.includes("\n")
    ) {
      commitment = trimmed;
    }
  }

  const lines = [...standards];
  if (commitment) {
    lines.push(commitment);
  }

  return { standards, commitment, lines };
}

export function getBackHalfStandardsFillLines(
  responses: BlueprintExerciseResponses | null | undefined,
): string[] {
  return getBackHalfStandardsFill(responses).lines;
}
