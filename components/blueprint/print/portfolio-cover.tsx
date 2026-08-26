import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import { ARCHITECT_PORTFOLIO_LABEL } from "@/lib/blueprint/portfolio";

type PortfolioCoverProps = {
  variant?: BlueprintPrintVariant;
  architectName?: string | null;
};

export function PortfolioCover({
  variant = "print",
  architectName = null,
}: PortfolioCoverProps) {
  const name = architectName?.trim() || "";

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
          <p className="bh-bp-title-copy">{ARCHITECT_PORTFOLIO_LABEL}</p>
        </div>
        {name ? (
          <div className="bh-bp-subtitle">
            <p className="bh-bp-subtitle-line">{name}</p>
          </div>
        ) : null}
        <div className="bh-bp-title-rule" aria-hidden="true" />
        <p className="bh-bp-title-tagline">Magical is Possible.</p>
      </div>
    </PrintPage>
  );
}
