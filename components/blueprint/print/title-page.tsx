import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import { formatManuscriptBlock } from "@/lib/blueprint/format-manuscript";

type TitlePageProps = {
  variant?: BlueprintPrintVariant;
  title?: ManuscriptBlock | null;
  subtitle?: ManuscriptBlock | null;
};

export function TitlePage({ variant = "print", title, subtitle }: TitlePageProps) {
  const formattedTitle = formatManuscriptBlock(title, { personalize: false });
  const formattedSubtitle = formatManuscriptBlock(subtitle, {
    personalize: false,
    preserveParagraphs: true,
  });

  return (
    <PrintPage
      variant={variant}
      hidePageNumber
      className="bh-bp-title-page bh-bp-cover-page"
    >
      <div
        className="bh-bp-cover-media"
        style={{ backgroundImage: "url('/images/hero-atmosphere.jpg')" }}
        aria-hidden="true"
      />
      <div className="bh-bp-cover-veil" aria-hidden="true" />
      <div className="bh-bp-title-frame">
        <img
          src="/images/brand/back-half-butterfly-logo.png"
          alt=""
          className="bh-bp-cover-mark"
          width={304}
          height={255}
        />
        <p className="bh-bp-title-eyebrow">The Back Half</p>
        <div className="bh-bp-title-main">
          <h1 className="bh-bp-title-copy">
            {(formattedTitle?.paragraphs ?? ["The Back Half Blueprint"]).join(
              " ",
            )}
          </h1>
        </div>
        <div className="bh-bp-subtitle">
          <p className="bh-bp-subtitle-line">
            {(formattedSubtitle?.paragraphs ?? []).join(" ")}
          </p>
        </div>
        <div className="bh-bp-title-rule" aria-hidden="true" />
        <p className="bh-bp-title-tagline">Magical is Possible.</p>
      </div>
    </PrintPage>
  );
}
