/**
 * Map Chapter VII practice into Back Half Declaration print fill.
 * Does not rewrite the approved pledge manuscript.
 */

import { BEGINNING_PRACTICE } from "@/content/journey/chapter-7-beginning";
import {
  getExerciseResponseLines,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";

export type BackHalfDeclarationFill = {
  statement: string | null;
  signature: string | null;
  signedDate: string | null;
  /** Ready-to-print lines for ArtifactLayout / ApprovedCopySlot. */
  lines: string[];
};

/** Practice answers live at chapter-7-beginning exercise index 1. */
export const BACK_HALF_DECLARATION_EXERCISE_INDEX = 1;

function formatPracticeStatement(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^beginning today/i.test(trimmed)) return trimmed;

  const stem = BEGINNING_PRACTICE.stem.replace(/\.\.\.\s*$/, "").trim();
  const completion = trimmed.replace(/^\.\.\.\s*/, "").trim();
  return `${stem} ${completion}`.replace(/\s+/g, " ").trim();
}

/**
 * Derive Back Half Declaration fill from assembled guidebook responses.
 * Statement first; signature second; signed date third when present.
 */
export function getBackHalfDeclarationFill(
  responses: BlueprintExerciseResponses | null | undefined,
): BackHalfDeclarationFill {
  const raw = getExerciseResponseLines(
    responses,
    "chapter-7-beginning",
    BACK_HALF_DECLARATION_EXERCISE_INDEX,
  );
  const statement = raw[0]?.trim() || null;
  const signature = raw[1]?.trim() || null;
  const signedDate = raw[2]?.trim() || null;

  const lines: string[] = [];
  if (statement) {
    lines.push(formatPracticeStatement(statement));
  }
  if (signature) {
    lines.push(signature);
  }
  if (signedDate) {
    lines.push(signedDate);
  }

  return { statement, signature, signedDate, lines };
}

export function getBackHalfDeclarationFillLines(
  responses: BlueprintExerciseResponses | null | undefined,
): string[] {
  return getBackHalfDeclarationFill(responses).lines;
}
