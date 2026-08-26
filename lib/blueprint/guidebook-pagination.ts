/**
 * Shared Blueprint guidebook page chunks so print layout and TOC stay aligned.
 */

import { getBlueprintManuscript } from "@/content/blueprint/manuscript";
import {
  paginateParagraphs,
  PROSE_BUDGET,
} from "@/lib/blueprint/paginate-prose";

export function getWelcomeLetterChunks(
  manuscript = getBlueprintManuscript(),
): string[][] {
  return paginateParagraphs(manuscript?.welcomeLetter?.paragraphs ?? [], {
    firstPageBudgetIn: 6.15,
    continuationBudgetIn: PROSE_BUDGET.continuationWithClose,
  });
}

export function getHowToUseChunks(
  manuscript = getBlueprintManuscript(),
): string[][] {
  return paginateParagraphs(manuscript?.howToUse?.paragraphs ?? [], {
    firstPageBudgetIn: PROSE_BUDGET.sectionOpener,
    continuationBudgetIn: PROSE_BUDGET.continuation,
  });
}

export function getArchitectsCommitmentChunks(
  manuscript = getBlueprintManuscript(),
): string[][] {
  return paginateParagraphs(
    manuscript?.architectsCommitment?.paragraphs ?? [],
    {
      firstPageBudgetIn: PROSE_BUDGET.sectionOpener,
      continuationBudgetIn: PROSE_BUDGET.continuation,
    },
  );
}

export function getFounderClosingChunks(
  manuscript = getBlueprintManuscript(),
): string[][] {
  return paginateParagraphs(manuscript?.founderClosing?.paragraphs ?? [], {
    firstPageBudgetIn: 5.9,
    continuationBudgetIn: PROSE_BUDGET.continuation,
  });
}
