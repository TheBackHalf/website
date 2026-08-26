import { ApprovedCopySlot } from "@/components/blueprint/approved-copy-slot";
import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import { formatManuscriptBlock } from "@/lib/blueprint/format-manuscript";

type CopyrightPageProps = {
  variant?: BlueprintPrintVariant;
  copyright?: ManuscriptBlock | null;
};

export function CopyrightPage({
  variant = "print",
  copyright,
}: CopyrightPageProps) {
  const formatted = formatManuscriptBlock(copyright, { personalize: false });

  return (
    <PrintPage
      variant={variant}
      hidePageNumber
      className="bh-bp-copyright-page"
    >
      <p className="bh-bp-section-eyebrow">Legal</p>
      <h1 className="bh-bp-section-heading">Copyright</h1>
      <div className="bh-bp-section-rule" aria-hidden="true" />
      <ApprovedCopySlot
        label="Copyright"
        manuscript={formatted}
        className="bh-bp-copyright-copy"
        format={false}
      />
    </PrintPage>
  );
}
