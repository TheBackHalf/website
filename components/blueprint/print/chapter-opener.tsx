import { ApprovedCopySlot } from "@/components/blueprint/approved-copy-slot";
import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";

type ChapterOpenerProps = {
  variant?: BlueprintPrintVariant;
  romanNumeral: string;
  chapterName: string;
  label: string;
  manuscript?: ManuscriptBlock | null;
  atmosphereSrc?: string;
  id?: string;
};

export function ChapterOpener({
  variant = "print",
  romanNumeral,
  chapterName,
  label,
  manuscript,
  atmosphereSrc = "/images/journey-light.jpg",
  id,
}: ChapterOpenerProps) {
  return (
    <PrintPage
      variant={variant}
      header={chapterName}
      className="bh-bp-chapter-opener"
      id={id}
    >
      <div
        className="bh-bp-chapter-atmosphere"
        style={{ backgroundImage: `url('${atmosphereSrc}')` }}
        aria-hidden="true"
      />
      <div className="bh-bp-chapter-opener-inner">
        <p className="bh-bp-chapter-index">Chapter {romanNumeral}</p>
        <h1 className="bh-bp-chapter-name">{chapterName}</h1>
        {label &&
        label.trim().toLowerCase() !== chapterName.trim().toLowerCase() &&
        !label.toLowerCase().includes(chapterName.trim().toLowerCase()) ? (
          <p className="bh-bp-chapter-label">{label}</p>
        ) : null}
        <div className="bh-bp-chapter-rule" aria-hidden="true" />
        <ApprovedCopySlot
          manuscript={manuscript}
          className="bh-bp-chapter-intro"
          format={false}
        />
      </div>
    </PrintPage>
  );
}
