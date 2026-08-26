import { PagedProseSection } from "@/components/blueprint/print/paged-prose-section";
import { PrintDocumentShell } from "@/components/blueprint/print/print-document-shell";
import { getArchitectsCommitmentChunks } from "@/lib/blueprint/guidebook-pagination";

export default function ArchitectsCommitmentPrintPage() {
  return (
    <PrintDocumentShell title="The Back Half Blueprint — Architect's Commitment">
      <PagedProseSection
        title="Architect's Commitment"
        eyebrow="Commitment"
        className="bh-bp-signature-page"
        pages={getArchitectsCommitmentChunks()}
        markLastPageFinal
        lastContinuationClassName="bh-bp-signature-page"
      />
    </PrintDocumentShell>
  );
}
