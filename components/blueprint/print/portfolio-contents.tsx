import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ArchitectPortfolioModel } from "@/lib/blueprint/portfolio";

type PortfolioContentsProps = {
  variant?: BlueprintPrintVariant;
  model: ArchitectPortfolioModel;
};

export function PortfolioContents({
  variant = "print",
  model,
}: PortfolioContentsProps) {
  return (
    <PrintPage
      variant={variant}
      header="Architect Portfolio"
      id="bp-portfolio-contents"
      className="bh-bp-portfolio-contents-page"
    >
      <p className="bh-bp-artifact-eyebrow">Architect Portfolio</p>
      <h1 className="bh-bp-artifact-title">Contents</h1>
      <div className="bh-bp-artifact-rule" aria-hidden="true" />
      <p className="bh-bp-portfolio-contents-summary">
        {model.completedCount} of {model.totalCount} assembled
        {model.isFinal ? " — final portfolio" : ""}.
      </p>
      <ol className="bh-bp-portfolio-contents-list">
        {model.sections.map((section) => (
          <li key={section.id} className="bh-bp-portfolio-contents-item">
            <span className="bh-bp-portfolio-contents-label">
              {section.label}
            </span>
            <span
              className={
                section.status === "included"
                  ? "bh-bp-portfolio-status-included"
                  : "bh-bp-portfolio-status-awaiting"
              }
            >
              {section.status === "included" ? "Included" : "Awaiting work"}
            </span>
          </li>
        ))}
      </ol>
    </PrintPage>
  );
}
