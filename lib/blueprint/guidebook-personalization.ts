/**
 * Guidebook personalization path used by the downloadable Blueprint.
 * Mirrors GuidebookDocument: print parts + exercise keys + artifact fills.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ExercisePage } from "@/components/blueprint/print/exercise-page";
import { blueprintDocumentSections } from "@/content/blueprint/document-structure";
import { getBlueprintManuscript } from "@/content/blueprint/manuscript";
import { getArchitectIdentityFillLines } from "@/lib/blueprint/architect-identity-fill";
import { getBackHalfStandardsFillLines } from "@/lib/blueprint/back-half-standards-fill";
import { getChapterPrintParts } from "@/lib/blueprint/chapter-print-content";
import { getBackHalfDeclarationFillLines } from "@/lib/blueprint/declaration-fill";
import { getDecisionStatementFillLines } from "@/lib/blueprint/decision-statement-fill";
import { getExpansionPlanFillLines } from "@/lib/blueprint/expansion-plan-fill";
import {
  getExerciseResponseLines,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";

const CHAPTER_IDS = [
  "chapter-1-awakening",
  "chapter-2-mirror",
  "chapter-3-decision",
  "chapter-4-standards",
  "chapter-5-architect",
  "chapter-6-expansion",
  "chapter-7-beginning",
] as const;

export type GuidebookPersonalizedExercise = {
  chapterId: (typeof CHAPTER_IDS)[number];
  chapterLabel: string;
  exerciseIndex: number;
  heading: string;
  title: string;
  responseLines: string[];
  html: string;
};

export type GuidebookPersonalizedDocument = {
  exercises: GuidebookPersonalizedExercise[];
  artifacts: {
    decisionStatement: string[];
    backHalfStandards: string[];
    architectIdentity: string[];
    expansionPlan: string[];
    declaration: string[];
  };
};

/**
 * Assemble the same exercise/artifact payloads the print guidebook renders.
 */
export function collectGuidebookPersonalizedDocument(
  responses: BlueprintExerciseResponses,
): GuidebookPersonalizedDocument {
  const manuscript = getBlueprintManuscript();
  const exercises: GuidebookPersonalizedExercise[] = [];

  for (const section of blueprintDocumentSections) {
    if (section.kind !== "chapter-opener") continue;
    if (!(CHAPTER_IDS as readonly string[]).includes(section.id)) continue;
    const chapterId = section.id as (typeof CHAPTER_IDS)[number];
    const parts = getChapterPrintParts(
      chapterId,
      manuscript?.chapters?.[chapterId] ?? null,
    );
    parts.exercises.forEach((exercise, index) => {
      const responseLines = getExerciseResponseLines(
        responses,
        chapterId,
        index,
      );
      exercises.push({
        chapterId,
        chapterLabel: section.label,
        exerciseIndex: index,
        heading: exercise.heading,
        title: exercise.title,
        responseLines,
        html: renderToStaticMarkup(
          createElement(ExercisePage, {
            variant: "print",
            header: section.chapterName ?? section.label,
            exerciseIndex: index + 1,
            exercise,
            responseLines,
          }),
        ),
      });
    });
  }

  return {
    exercises,
    artifacts: {
      decisionStatement: getDecisionStatementFillLines(responses),
      backHalfStandards: getBackHalfStandardsFillLines(responses),
      architectIdentity: getArchitectIdentityFillLines(responses),
      expansionPlan: getExpansionPlanFillLines(responses),
      declaration: getBackHalfDeclarationFillLines(responses),
    },
  };
}
