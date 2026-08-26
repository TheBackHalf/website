import { ApprovedCopySlot } from "@/components/blueprint/approved-copy-slot";
import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import { formatManuscriptBlock } from "@/lib/blueprint/format-manuscript";
import { cn } from "@/lib/utils";

type ArtifactLayoutProps = {
  variant?: BlueprintPrintVariant;
  title: string;
  manuscript?: ManuscriptBlock | null;
  /** Standalone export uses full-page artifact framing. */
  standalone?: boolean;
  writingLines?: number;
  breakBefore?: boolean;
  /**
   * Optional participant fill (e.g. Chapter III Decision Statement).
   * Shown after approved manuscript, or in place of blank form lines.
   */
  responseLines?: readonly string[];
  /** Label above participant fill when manuscript + responses are both present. */
  fillLabel?: string;
  id?: string;
  className?: string;
};

export function ArtifactLayout({
  variant = "print",
  title,
  manuscript,
  standalone = false,
  writingLines = 12,
  breakBefore = false,
  responseLines,
  fillLabel = "My Decision Statement",
  id,
  className,
}: ArtifactLayoutProps) {
  // Preserve approved paragraph boundaries — do not re-pair sentences for artifacts.
  const formatted = formatManuscriptBlock(manuscript, {
    preserveParagraphs: true,
  });
  const filled = (responseLines ?? []).map((line) => line.trim()).filter(Boolean);
  const hasManuscript = Boolean(formatted?.paragraphs?.length);

  return (
    <PrintPage
      variant={variant}
      header={title}
      breakBefore={standalone || breakBefore}
      className={cn(
        standalone ? "bh-bp-artifact-standalone" : "bh-bp-artifact-inline",
        "bh-bp-signature-page",
        className,
      )}
      id={id}
    >
      <div className="bh-bp-artifact-frame">
        <p className="bh-bp-artifact-eyebrow">Architect Resource</p>
        <h1 className="bh-bp-artifact-title">{title}</h1>
        <div className="bh-bp-artifact-rule" aria-hidden="true" />
        {hasManuscript ? (
          <>
            <ApprovedCopySlot manuscript={formatted} format={false} />
            {filled.length > 0 ? (
              <div className="bh-bp-artifact-participant-fill">
                <p className="bh-bp-exercise-label">{fillLabel}</p>
                <ApprovedCopySlot
                  label={fillLabel}
                  manuscript={null}
                  variant="lines"
                  responseLines={filled}
                />
              </div>
            ) : null}
          </>
        ) : (
          <ApprovedCopySlot
            manuscript={null}
            variant="form"
            placeholderLines={writingLines}
            responseLines={filled}
            label={fillLabel}
          />
        )}
      </div>
    </PrintPage>
  );
}
