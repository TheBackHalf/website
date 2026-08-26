import { ApprovedCopySlot } from "@/components/blueprint/approved-copy-slot";
import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";

type ChapterBodyPageProps = {
  variant?: BlueprintPrintVariant;
  header: string;
  manuscript?: ManuscriptBlock | null;
  pageIndex?: number;
};

export function ChapterBodyPage({
  variant = "print",
  header,
  manuscript,
  pageIndex = 1,
}: ChapterBodyPageProps) {
  return (
    <PrintPage variant={variant} header={header} className="bh-bp-chapter-body">
      <p className="bh-bp-section-eyebrow">Core Teaching</p>
      <h2 className="bh-bp-chapter-body-heading">{header}</h2>
      <div className="bh-bp-section-rule" aria-hidden="true" />
      <ApprovedCopySlot
        label={`Chapter body — page ${pageIndex}`}
        manuscript={manuscript}
        format={false}
      />
    </PrintPage>
  );
}
