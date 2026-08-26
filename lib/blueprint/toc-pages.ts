/**
 * Compute Blueprint TOC page numbers from the fixed page template structure.
 * Each PrintPage renders as one Letter page in PDF export.
 */

import { blueprintDocumentSections } from "@/content/blueprint/document-structure";
import { getBlueprintManuscript } from "@/content/blueprint/manuscript";
import type { BlueprintSectionId } from "@/content/blueprint/types";
import { countArtifactPages } from "@/lib/blueprint/artifact-pages";
import { ALIVENESS_PRINT_PAGE_COUNT } from "@/lib/blueprint/aliveness-print";
import { getChapterPrintParts } from "@/lib/blueprint/chapter-print-content";
import {
  getArchitectsCommitmentChunks,
  getFounderClosingChunks,
  getHowToUseChunks,
  getWelcomeLetterChunks,
} from "@/lib/blueprint/guidebook-pagination";

export type BlueprintTocEntry = {
  id: BlueprintSectionId;
  number: string;
  label: string;
  page: number;
};

const chapterIds = [
  "chapter-1-awakening",
  "chapter-2-mirror",
  "chapter-3-decision",
  "chapter-4-standards",
  "chapter-5-architect",
  "chapter-6-expansion",
  "chapter-7-beginning",
] as const;

export function getBlueprintTocEntries(): readonly BlueprintTocEntry[] {
  const manuscript = getBlueprintManuscript();
  let page = 1; // title
  page += 1; // copyright
  page += 1; // toc
  // Next content page begins after the TOC page.
  page += 1;

  const entries: BlueprintTocEntry[] = [];
  let index = 1;

  const push = (id: BlueprintSectionId, label: string, startPage: number) => {
    entries.push({
      id,
      number: String(index).padStart(2, "0"),
      label,
      page: startPage,
    });
    index += 1;
  };

  push("welcome-letter", "Welcome Letter", page);
  page += Math.max(1, getWelcomeLetterChunks(manuscript).length);
  push("how-to-use", "How to Use This Guidebook", page);
  page += Math.max(1, getHowToUseChunks(manuscript).length);
  push("architects-commitment", "Architect's Commitment", page);
  page += Math.max(1, getArchitectsCommitmentChunks(manuscript).length);

  for (const section of blueprintDocumentSections) {
    if (section.kind !== "chapter-opener") continue;
    if (!(chapterIds as readonly string[]).includes(section.id)) continue;

    push(section.id, section.label, page);
    page += 1; // opener
    page += 1; // body

    const chapterId = section.id as (typeof chapterIds)[number];
    const parts = getChapterPrintParts(
      chapterId,
      manuscript?.chapters?.[chapterId] ?? null,
    );
    const exerciseCount =
      parts.exercises.length || section.exercisePageCount || 2;
    page += exerciseCount;
  }

  for (const section of blueprintDocumentSections) {
    if (section.kind !== "artifact") continue;
    push(section.id, section.label, page);
    const artifactId = section.id as
      | "aliveness-index"
      | "decision-statement"
      | "back-half-standards"
      | "architect-identity-statement"
      | "expansion-plan"
      | "back-half-declaration";
    page +=
      artifactId === "aliveness-index"
        ? ALIVENESS_PRINT_PAGE_COUNT
        : countArtifactPages(manuscript?.artifacts?.[artifactId] ?? null);
  }

  push("founder-closing", "A Letter from the Founder", page);
  page += Math.max(1, getFounderClosingChunks(manuscript).length);
  push("about-founder", "About Kimberly M. Walker", page);

  return entries;
}
