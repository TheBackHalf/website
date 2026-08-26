import { ApprovedCopySlot } from "@/components/blueprint/approved-copy-slot";
import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import { formatManuscriptBlock } from "@/lib/blueprint/format-manuscript";
import { cn } from "@/lib/utils";

type SectionPageProps = {
  variant?: BlueprintPrintVariant;
  title: string;
  manuscript?: ManuscriptBlock | null;
  header?: string;
  breakBefore?: boolean;
  atmosphereSrc?: string | null;
  eyebrow?: string;
  finalPage?: boolean;
  /** Keep source paragraphs intact (welcome letters, etc.). */
  preserveParagraphs?: boolean;
  /** Optional closing lines (e.g. welcome letter signature). */
  closingLines?: readonly string[];
  className?: string;
  id?: string;
};

export function SectionPage({
  variant = "print",
  title,
  manuscript,
  header,
  breakBefore,
  atmosphereSrc = null,
  eyebrow,
  finalPage = false,
  preserveParagraphs = false,
  closingLines,
  className,
  id,
}: SectionPageProps) {
  const formatted = formatManuscriptBlock(manuscript, { preserveParagraphs });
  const paragraphs = formatted?.paragraphs?.filter(
    (paragraph) => paragraph.trim().toLowerCase() !== title.trim().toLowerCase(),
  );

  return (
    <PrintPage
      variant={variant}
      header={header ?? title}
      breakBefore={breakBefore}
      finalPage={finalPage}
      id={id}
      className={cn("bh-bp-section-page", className)}
    >
      {atmosphereSrc ? (
        <div
          className="bh-bp-section-atmosphere"
          style={{ backgroundImage: `url('${atmosphereSrc}')` }}
          aria-hidden="true"
        />
      ) : null}
      {eyebrow ? <p className="bh-bp-section-eyebrow">{eyebrow}</p> : null}
      <h1 className="bh-bp-section-heading">{title}</h1>
      <div className="bh-bp-section-rule" aria-hidden="true" />
      <ApprovedCopySlot
        manuscript={paragraphs?.length ? { paragraphs } : formatted}
        format={false}
      />
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
