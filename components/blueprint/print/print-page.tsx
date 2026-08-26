import type { ReactNode } from "react";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import { cn } from "@/lib/utils";

type PrintPageProps = {
  children: ReactNode;
  variant?: BlueprintPrintVariant;
  className?: string;
  /** Running header text (chapter/section name). */
  header?: string;
  /** Hide page number on this page (title, copyright). */
  hidePageNumber?: boolean;
  /** Force page break before this page. */
  breakBefore?: boolean;
  /** Suppress trailing page break (final document page). */
  finalPage?: boolean;
  /** Internal PDF / TOC target. */
  id?: string;
};

export function PrintPage({
  children,
  variant = "print",
  className,
  header,
  hidePageNumber = false,
  breakBefore = false,
  finalPage = false,
  id,
}: PrintPageProps) {
  return (
    <section
      id={id}
      className={cn(
        "bh-bp-page",
        variant === "digital" && "bh-bp-page--digital",
        breakBefore && "bh-bp-page--break-before",
        hidePageNumber && "bh-bp-page--no-number",
        finalPage && "bh-bp-page--final",
        className,
      )}
      data-variant={variant}
    >
      {header ? (
        <header className="bh-bp-page-header" aria-hidden="true">
          <span className="bh-bp-page-header-text">{header}</span>
        </header>
      ) : null}
      <div className="bh-bp-page-body">{children}</div>
      <footer className="bh-bp-page-footer" aria-hidden="true">
        <span className="bh-bp-page-brand">The Back Half Blueprint</span>
        {!hidePageNumber ? (
          <span className="bh-bp-page-number" />
        ) : null}
      </footer>
    </section>
  );
}
