import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import {
  parseAlivenessIndex,
  type AlivenessCategory,
} from "@/lib/blueprint/aliveness-print";

type AlivenessIndexLayoutProps = {
  variant?: BlueprintPrintVariant;
  manuscript?: ManuscriptBlock | null;
  standalone?: boolean;
  anchorId?: string;
};

function RatingBoxes() {
  return (
    <span className="bh-bp-alive-boxes">
      <span className="bh-bp-sr-only">Rate 1 lowest to 5 highest. </span>
      <span aria-hidden="true">
        {[1, 2, 3, 4, 5].map((value) => (
          <span key={value} className="bh-bp-alive-box">
            {value}
          </span>
        ))}
      </span>
    </span>
  );
}

function CategoryBlock({ category }: { category: AlivenessCategory }) {
  return (
    <section className="bh-bp-alive-category">
      <h2 className="bh-bp-alive-category-heading">{category.heading}</h2>
      <ol className="bh-bp-alive-statements">
        {category.statements.map((statement) => (
          <li key={statement} className="bh-bp-alive-statement">
            <span className="bh-bp-alive-statement-text">{statement}</span>
            <RatingBoxes />
          </li>
        ))}
      </ol>
      <p className="bh-bp-alive-score">{category.scoreLine}</p>
    </section>
  );
}

export function AlivenessIndexLayout({
  variant = "print",
  manuscript,
  standalone = false,
  anchorId,
}: AlivenessIndexLayoutProps) {
  const model = parseAlivenessIndex(manuscript);
  if (!model) {
    return (
      <PrintPage
        variant={variant}
        header="Aliveness Index"
        id={anchorId}
        breakBefore={standalone}
      >
        <p className="bh-bp-prose">Aliveness Index</p>
      </PrintPage>
    );
  }

  const pages = [
    model.categories.slice(0, 1),
    model.categories.slice(1, 4),
    model.categories.slice(4, 7),
    model.categories.slice(7),
  ];

  return (
    <>
      <PrintPage
        variant={variant}
        header="Aliveness Index"
        id={anchorId}
        className="bh-bp-aliveness-page"
        breakBefore={standalone}
      >
        <p className="bh-bp-artifact-eyebrow">Architect Resource</p>
        <h1 className="bh-bp-artifact-title">Aliveness Index</h1>
        <div className="bh-bp-artifact-rule" aria-hidden="true" />
        <div className="bh-bp-prose">
          {model.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <h2 className="bh-bp-alive-scale-heading">{model.ratingScaleHeading}</h2>
        <ol className="bh-bp-alive-scale">
          {model.ratingScaleItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        {pages[0].map((category) => (
          <CategoryBlock key={category.heading} category={category} />
        ))}
      </PrintPage>

      <PrintPage
        variant={variant}
        header="Aliveness Index"
        className="bh-bp-aliveness-page"
      >
        {pages[1].map((category) => (
          <CategoryBlock key={category.heading} category={category} />
        ))}
      </PrintPage>

      <PrintPage
        variant={variant}
        header="Aliveness Index"
        className="bh-bp-aliveness-page"
      >
        {pages[2].map((category) => (
          <CategoryBlock key={category.heading} category={category} />
        ))}
      </PrintPage>

      <PrintPage
        variant={variant}
        header="Aliveness Index"
        className="bh-bp-aliveness-page"
      >
        {pages[3].map((category) => (
          <CategoryBlock key={category.heading} category={category} />
        ))}
        <section className="bh-bp-alive-overall">
          <h2 className="bh-bp-alive-category-heading">{model.overallHeading}</h2>
          <ul className="bh-bp-alive-overall-list">
            {model.overallLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="bh-bp-alive-total">{model.totalLine}</p>
        </section>
      </PrintPage>

      <PrintPage
        variant={variant}
        header="Aliveness Index"
        className="bh-bp-aliveness-page"
        finalPage={standalone}
      >
        <section className="bh-bp-alive-reflection">
          <h2 className="bh-bp-alive-category-heading">
            {model.reflectionHeading}
          </h2>
          {model.reflectionPrompts.map((prompt) => (
            <div key={prompt} className="bh-bp-alive-prompt">
              <p>{prompt}</p>
              <p className="bh-bp-sr-only">
                Blank lines are provided for a handwritten or typed response.
              </p>
              <span className="bh-bp-writing-line" aria-hidden="true" />
              <span className="bh-bp-writing-line" aria-hidden="true" />
            </div>
          ))}
        </section>
        <section className="bh-bp-alive-remember">
          <h2 className="bh-bp-alive-category-heading">{model.rememberHeading}</h2>
          <div className="bh-bp-prose">
            {model.rememberParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      </PrintPage>
    </>
  );
}
