import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import { getBlueprintTocEntries } from "@/lib/blueprint/toc-pages";

type TocPageProps = {
  variant?: BlueprintPrintVariant;
};

export function TocPage({ variant = "print" }: TocPageProps) {
  const entries = getBlueprintTocEntries();

  return (
    <PrintPage variant={variant} className="bh-bp-toc-page bh-bp-toc-page--compact">
      <p className="bh-bp-section-eyebrow">Contents</p>
      <h1 className="bh-bp-toc-heading">Table of Contents</h1>
      <div className="bh-bp-toc-rule" aria-hidden="true" />
      <ol className="bh-bp-toc-list">
        {entries.map((entry) => (
          <li key={entry.id} className="bh-bp-toc-item">
            <span className="bh-bp-toc-number">{entry.number}</span>
            <span className="bh-bp-toc-dash" aria-hidden="true">
              —
            </span>
            <a className="bh-bp-toc-label" href={`#bp-${entry.id}`}>
              {entry.label}
            </a>
            <span className="bh-bp-toc-leader" aria-hidden="true" />
            <span className="bh-bp-toc-page-hint">{entry.page}</span>
          </li>
        ))}
      </ol>
    </PrintPage>
  );
}
