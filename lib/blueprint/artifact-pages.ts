import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import {
  paginateParagraphs,
  PROSE_BUDGET,
} from "@/lib/blueprint/paginate-prose";

export function chunkArtifactParagraphs(
  manuscript: ManuscriptBlock | null | undefined,
): ManuscriptBlock[] {
  const pages = paginateParagraphs(manuscript?.paragraphs ?? [], {
    firstPageBudgetIn: PROSE_BUDGET.artifactFirst,
    continuationBudgetIn: PROSE_BUDGET.artifactContinuation,
  });
  return pages.map((paragraphs) => ({ paragraphs }));
}

export function countArtifactPages(
  manuscript: ManuscriptBlock | null | undefined,
): number {
  return Math.max(1, chunkArtifactParagraphs(manuscript).length);
}
