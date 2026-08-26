import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ArchitectPortfolioModel } from "@/lib/blueprint/portfolio";

type PortfolioPrioritiesProps = {
  variant?: BlueprintPrintVariant;
  model: ArchitectPortfolioModel;
};

export function PortfolioPriorities({
  variant = "print",
  model,
}: PortfolioPrioritiesProps) {
  const snapshot = model.aliveness;

  return (
    <PrintPage
      variant={variant}
      header="Aliveness Index — Highest and Lowest"
      id="bp-portfolio-priorities"
      className="bh-bp-portfolio-priorities-page"
    >
      <p className="bh-bp-artifact-eyebrow">Architect Resource</p>
      <h1 className="bh-bp-artifact-title">Highest and Lowest</h1>
      <div className="bh-bp-artifact-rule" aria-hidden="true" />

      {snapshot ? (
        <>
          <p className="bh-bp-portfolio-priorities-total">
            Overall Aliveness Score: {snapshot.total} / {snapshot.maxTotal}
          </p>
          <section className="bh-bp-portfolio-priorities-highlight">
            <h2 className="bh-bp-alive-category-heading">Highest</h2>
            <p>
              {snapshot.domainScores
                .filter((domain) =>
                  snapshot.highestDomains.includes(domain.domainId),
                )
                .map((domain) => `${domain.name} (${domain.score}/${domain.maxScore})`)
                .join(", ") || "—"}
            </p>
          </section>
          <section className="bh-bp-portfolio-priorities-highlight">
            <h2 className="bh-bp-alive-category-heading">Lowest</h2>
            <p>
              {snapshot.domainScores
                .filter((domain) =>
                  snapshot.lowestDomains.includes(domain.domainId),
                )
                .map((domain) => `${domain.name} (${domain.score}/${domain.maxScore})`)
                .join(", ") || "—"}
            </p>
          </section>
          <section className="bh-bp-portfolio-priorities-domains">
            <h2 className="bh-bp-alive-category-heading">Domain scores</h2>
            <ul className="bh-bp-portfolio-priorities-domain-list">
              {snapshot.domainScores.map((domain) => (
                <li key={domain.domainId}>
                  <span>{domain.name}</span>
                  <span>
                    {domain.score} / {domain.maxScore}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="bh-bp-prose">
          Highest and lowest Aliveness Index categories appear here after the
          assessment is complete.
        </p>
      )}
    </PrintPage>
  );
}
