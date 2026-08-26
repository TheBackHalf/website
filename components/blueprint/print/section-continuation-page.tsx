import { ApprovedCopySlot } from "@/components/blueprint/approved-copy-slot";
import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import { formatManuscriptBlock } from "@/lib/blueprint/format-manuscript";
import { cn } from "@/lib/utils";

type SectionContinuationPageProps = {
  variant?: BlueprintPrintVariant;
  /** Running header only — no repeated section title. */
  header: string;
  manuscript?: ManuscriptBlock | null;
  breakBefore?: boolean;
  finalPage?: boolean;
  /** Optional closing lines (e.g. welcome letter signature). */
  closingLines?: readonly string[];
  /** Keep source paragraphs intact (welcome letters, etc.). */
  preserveParagraphs?: boolean;
  className?: string;
};

/**
 * Continuation page for multi-page sections.
 * No eyebrow, no repeated H1, no "Continued" markers — continuous editorial flow.
 */
export function SectionContinuationPage({
  variant = "print",
  header,
  manuscript,
  breakBefore,
  finalPage = false,
  closingLines,
  preserveParagraphs = false,
  className,
}: SectionContinuationPageProps) {
  const formatted = formatManuscriptBlock(manuscript, { preserveParagraphs });

  return (
    <PrintPage
      variant={variant}
      header={header}
      breakBefore={breakBefore}
      finalPage={finalPage}
      className={cn(
        "bh-bp-section-page bh-bp-section-continuation",
        className,
      )}
    >
      <ApprovedCopySlot manuscript={formatted} format={false} />
      {closingLines?.length ? (
        <div className="bh-bp-prose bh-bp-section-closing">
          {closingLines.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
      ) : null}
    </PrintPage>
  );
}
