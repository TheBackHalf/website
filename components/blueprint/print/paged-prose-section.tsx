import { SectionContinuationPage } from "@/components/blueprint/print/section-continuation-page";
import { SectionPage } from "@/components/blueprint/print/section-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";

type PagedProseSectionProps = {
  variant?: BlueprintPrintVariant;
  id?: string;
  title: string;
  eyebrow?: string;
  className?: string;
  atmosphereSrc?: string | null;
  pages: string[][];
  preserveParagraphs?: boolean;
  closingLines?: readonly string[];
  markLastPageFinal?: boolean;
  lastContinuationClassName?: string;
};

export function PagedProseSection({
  variant = "print",
  id,
  title,
  eyebrow,
  className,
  atmosphereSrc = null,
  pages,
  preserveParagraphs = true,
  closingLines,
  markLastPageFinal = false,
  lastContinuationClassName,
}: PagedProseSectionProps) {
  const chunks = pages.length ? pages : [[]];

  return (
    <>
      <SectionPage
        variant={variant}
        id={id}
        title={title}
        eyebrow={eyebrow}
        className={className}
        atmosphereSrc={atmosphereSrc}
        preserveParagraphs={preserveParagraphs}
        manuscript={{ paragraphs: chunks[0] ?? [] }}
        closingLines={chunks.length === 1 ? closingLines : undefined}
        finalPage={markLastPageFinal && chunks.length === 1}
      />
      {chunks.slice(1).map((chunk, index) => (
        <SectionContinuationPage
          key={`${id ?? title}-cont-${index + 1}`}
          variant={variant}
          header={title}
          preserveParagraphs={preserveParagraphs}
          manuscript={{ paragraphs: chunk }}
          closingLines={
            index === chunks.length - 2 ? closingLines : undefined
          }
          finalPage={markLastPageFinal && index === chunks.length - 2}
          className={
            index === chunks.length - 2
              ? lastContinuationClassName
              : undefined
          }
        />
      ))}
    </>
  );
}
