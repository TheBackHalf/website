/**
 * Map Chapter III practice / commitment into Decision Statement print fill.
 */

import { DECISION_PRACTICE } from "@/content/journey/chapter-3-decision";
import {
  getExerciseResponseLines,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";

export type DecisionStatementFill = {
  statement: string | null;
  commitment: string | null;
  /** Ready-to-print lines for ArtifactLayout / ApprovedCopySlot. */
  lines: string[];
};

/** Practice answers live at chapter-3-decision exercise index 1. */
export const DECISION_STATEMENT_EXERCISE_INDEX = 1;

function formatPracticeStatement(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^beginning today/i.test(trimmed)) return trimmed;

  const stem = DECISION_PRACTICE.stem.replace(/\.\.\.\s*$/, "").trim();
  const completion = trimmed.replace(/^\.\.\.\s*/, "").trim();
  return `${stem} ${completion}`.replace(/\s+/g, " ").trim();
}

/**
 * Derive Decision Statement fill from assembled guidebook responses.
 * Uses the same chapter-3 practice key as exercise personalization
 * (statement first; commitment note second when present).
 */
export function getDecisionStatementFill(
  responses: BlueprintExerciseResponses | null | undefined,
): DecisionStatementFill {
  const raw = getExerciseResponseLines(
    responses,
    "chapter-3-decision",
    DECISION_STATEMENT_EXERCISE_INDEX,
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

export function getDecisionStatementFillLines(
  responses: BlueprintExerciseResponses | null | undefined,
): string[] {
  return getDecisionStatementFill(responses).lines;
}
