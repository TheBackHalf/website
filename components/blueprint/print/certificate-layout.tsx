import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";

type CertificateLayoutProps = {
  variant?: BlueprintPrintVariant;
  manuscript?: ManuscriptBlock | null;
  architectName?: string | null;
  completionDate?: string | null;
};

export function CertificateLayout({
  variant = "print",
  manuscript,
  architectName = null,
  completionDate = null,
}: CertificateLayoutProps) {
  const name = architectName?.trim() || "";
  const date = completionDate?.trim() || "";
  const approved =
    manuscript?.paragraphs?.find((paragraph) => paragraph.trim())?.trim() ??
    "This certifies that {Architect Name} has successfully completed The Back Half Blueprint and has demonstrated a commitment to intentionally creating a life of fullness, purpose, and possibility.";
  const body = name
    ? approved.replace("{Architect Name}", name)
    : approved.replace("{Architect Name}", "____________________");

  return (
    <PrintPage variant={variant} hidePageNumber className="bh-bp-certificate">
      <div className="bh-bp-certificate-border" aria-hidden="true" />
      <div className="bh-bp-certificate-border-inner" aria-hidden="true" />
      <div className="bh-bp-certificate-inner">
        <p className="bh-bp-certificate-eyebrow">The Back Half</p>
        <h1 className="bh-bp-certificate-heading">The Back Half Blueprint</h1>
        <div className="bh-bp-certificate-rule" aria-hidden="true" />
        <p className="bh-bp-certificate-body">{body}</p>
        <div className="bh-bp-certificate-fields bh-bp-certificate-fields-centered">
          <div className="bh-bp-certificate-field">
            <span className="bh-bp-certificate-field-label">Architect Name</span>
            {name ? (
              <span className="bh-bp-certificate-field-value">{name}</span>
            ) : null}
            <span className="bh-bp-certificate-field-line" aria-hidden="true" />
          </div>
          <div className="bh-bp-certificate-field">
            <span className="bh-bp-certificate-field-label">Completion Date</span>
            {date ? (
              <span className="bh-bp-certificate-field-value">{date}</span>
            ) : null}
            <span className="bh-bp-certificate-field-line" aria-hidden="true" />
          </div>
        </div>
        <div className="bh-bp-certificate-founder">
          <p className="bh-bp-certificate-founder-name">Kimberly M. Walker</p>
          <p className="bh-bp-certificate-founder-title">Founder</p>
        </div>
      </div>
    </PrintPage>
  );
}
