/**
 * Map Chapter V practice / commitment into Architect Identity Statement print fill.
 */

import { ARCHITECT_PRACTICE } from "@/content/journey/chapter-5-architect";
import {
  getExerciseResponseLines,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";

export type ArchitectIdentityFill = {
  statement: string | null;
  commitment: string | null;
  /** Ready-to-print lines for ArtifactLayout / ApprovedCopySlot. */
  lines: string[];
};

/** Practice answers live at chapter-5-architect exercise index 1. */
export const ARCHITECT_IDENTITY_EXERCISE_INDEX = 1;

function formatPracticeStatement(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^i am an architect who/i.test(trimmed)) return trimmed;

  const stem = ARCHITECT_PRACTICE.stem.replace(/\.\.\.\s*$/, "").trim();
  const completion = trimmed.replace(/^\.\.\.\s*/, "").trim();
  return `${stem} ${completion}`.replace(/\s+/g, " ").trim();
}

/**
 * Derive Architect Identity Statement fill from assembled guidebook responses.
 * Uses the same chapter-5 practice key as exercise personalization
 * (statement first; commitment note second when present).
 */
export function getArchitectIdentityFill(
  responses: BlueprintExerciseResponses | null | undefined,
): ArchitectIdentityFill {
  const raw = getExerciseResponseLines(
    responses,
    "chapter-5-architect",
    ARCHITECT_IDENTITY_EXERCISE_INDEX,
  );
  const statement = raw[0]?.trim() || null;
  const commitment = raw[1]?.trim() || null;

  const lines: string[] = [];
  if (statement) {
    lines.push(formatPracticeStatement(statement));
  }
  if (commitment) {
    lines.push(commitment);
  }

  return { statement, commitment, lines };
}

export function getArchitectIdentityFillLines(
  responses: BlueprintExerciseResponses | null | undefined,
): string[] {
  return getArchitectIdentityFill(responses).lines;
}
