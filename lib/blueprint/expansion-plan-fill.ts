/**
 * Map Chapter VI practice into Expansion Plan print fill.
 */

import { EXPANSION_PRACTICE } from "@/content/journey/chapter-6-expansion";
import {
  getExerciseResponseLines,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";

export type ExpansionPlanFill = {
  yourself: string | null;
  someoneElse: string | null;
  world: string | null;
  commitment: string | null;
  /** Ready-to-print lines for ArtifactLayout / ApprovedCopySlot. */
  lines: string[];
};

/** Practice answers live at chapter-6-expansion exercise index 1. */
export const EXPANSION_PLAN_EXERCISE_INDEX = 1;

const ARTIFACT_PROMPTS = {
  yourself: "1. I Will Continue Growing By...",
  someoneElse: "2. I Will Intentionally Encourage Others By...",
  world: "3. I Will Contribute To My Community By...",
} as const;

function stripLabeledPrefix(line: string, labels: readonly string[]): string {
  for (const label of labels) {
    const prefix = `${label}:`;
    if (line.toLowerCase().startsWith(prefix.toLowerCase())) {
      return line.slice(prefix.length).trim();
    }
  }
  return line;
}

/**
 * Derive Expansion Plan fill from assembled guidebook responses.
 * Maps the approved three-area Journey practice onto the nearest
 * Expansion Plan artifact prompts. Extra artifact prompts remain blank.
 */
export function getExpansionPlanFill(
  responses: BlueprintExerciseResponses | null | undefined,
): ExpansionPlanFill {
  const raw = getExerciseResponseLines(
    responses,
    "chapter-6-expansion",
    EXPANSION_PLAN_EXERCISE_INDEX,
  );
  const labels = EXPANSION_PRACTICE.entries.map((entry) => entry.label);
  let yourself: string | null = null;
  let someoneElse: string | null = null;
  let world: string | null = null;
  let commitment: string | null = null;

  for (const line of raw) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("for yourself:")) {
      yourself = stripLabeledPrefix(trimmed, labels);
      continue;
    }
    if (lower.startsWith("for someone else:")) {
      someoneElse = stripLabeledPrefix(trimmed, labels);
      continue;
    }
    if (lower.startsWith("for the world around you:")) {
      world = stripLabeledPrefix(trimmed, labels);
      continue;
    }
    if (!commitment && !trimmed.includes("?") && !trimmed.includes("\n")) {
      commitment = trimmed;
    }
  }

  const lines: string[] = [];
  if (yourself) {
    lines.push(`${ARTIFACT_PROMPTS.yourself} ${yourself}`.trim());
  }
  if (someoneElse) {
    lines.push(`${ARTIFACT_PROMPTS.someoneElse} ${someoneElse}`.trim());
  }
  if (world) {
    lines.push(`${ARTIFACT_PROMPTS.world} ${world}`.trim());
  }
  if (commitment) {
    lines.push(commitment);
  }

  return { yourself, someoneElse, world, commitment, lines };
}

export function getExpansionPlanFillLines(
  responses: BlueprintExerciseResponses | null | undefined,
): string[] {
  return getExpansionPlanFill(responses).lines;
}
