/**
 * Structure the approved Aliveness Index manuscript for print layout.
 * Does not change wording, scoring, categories, or interpretation.
 */

import type { ManuscriptBlock } from "@/content/blueprint/manuscript";

export type AlivenessScaleItem = string;
export type AlivenessStatement = string;

export type AlivenessCategory = {
  heading: string;
  statements: AlivenessStatement[];
  scoreLine: string;
};

export type AlivenessPrintModel = {
  intro: string[];
  ratingScaleHeading: string;
  ratingScaleItems: AlivenessScaleItem[];
  categories: AlivenessCategory[];
  overallHeading: string;
  overallLines: string[];
  totalLine: string;
  reflectionHeading: string;
  reflectionPrompts: string[];
  rememberHeading: string;
  rememberParagraphs: string[];
};

const SCALE_HEADING = "Rating Scale";
const OVERALL_HEADING = "Your Overall Aliveness Score";
const REFLECTION_HEADING = "Reflection";
const REMEMBER_HEADING = "Remember";

export const ALIVENESS_PRINT_PAGE_COUNT = 5;

export function parseAlivenessIndex(
  manuscript: ManuscriptBlock | null | undefined,
): AlivenessPrintModel | null {
  const paragraphs = (manuscript?.paragraphs ?? [])
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (!paragraphs.length) return null;

  const scaleIndex = paragraphs.indexOf(SCALE_HEADING);
  const overallIndex = paragraphs.indexOf(OVERALL_HEADING);
  const reflectionIndex = paragraphs.indexOf(REFLECTION_HEADING);
  const rememberIndex = paragraphs.indexOf(REMEMBER_HEADING);
  if (
    scaleIndex < 0 ||
    overallIndex < 0 ||
    reflectionIndex < 0 ||
    rememberIndex < 0
  ) {
    return null;
  }

  const intro = paragraphs.slice(0, scaleIndex);
  const ratingScaleItems = paragraphs.slice(scaleIndex + 1, overallIndex).filter(
    (line) => /^\d — /.test(line),
  );

  const categoryBlock = paragraphs.slice(scaleIndex + 1, overallIndex).filter(
    (line) => !/^\d — /.test(line),
  );
  const categories: AlivenessCategory[] = [];
  let current: AlivenessCategory | null = null;
  for (const line of categoryBlock) {
    if (/^\d+\. /.test(line)) {
      if (current) categories.push(current);
      current = { heading: line, statements: [], scoreLine: "" };
      continue;
    }
    if (!current) continue;
    if (/Score:/.test(line)) {
      current.scoreLine = line;
    } else {
      current.statements.push(line);
    }
  }
  if (current) categories.push(current);

  const overallLines = paragraphs
    .slice(overallIndex + 1, reflectionIndex)
    .filter((line) => !line.startsWith("TOTAL:"));
  const totalLine =
    paragraphs.slice(overallIndex + 1, reflectionIndex).find((line) =>
      line.startsWith("TOTAL:"),
    ) ?? "TOTAL: _______ /225";

  return {
    intro,
    ratingScaleHeading: SCALE_HEADING,
    ratingScaleItems,
    categories,
    overallHeading: OVERALL_HEADING,
    overallLines,
    totalLine,
    reflectionHeading: REFLECTION_HEADING,
    reflectionPrompts: paragraphs.slice(reflectionIndex + 1, rememberIndex),
    rememberHeading: REMEMBER_HEADING,
    rememberParagraphs: paragraphs.slice(rememberIndex + 1),
  };
}
