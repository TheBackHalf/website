/**
 * Shared Puppeteer PDF options for launch-critical Blueprint downloads.
 * Chrome tagged PDF + outline are required for screen-reader compatibility.
 */

export const ACCESSIBLE_PDF_OPTIONS = {
  format: "Letter" as const,
  printBackground: true,
  preferCSSPageSize: true,
  tagged: true,
  outline: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
};

/**
 * Runs in the Chromium page before PDF generation.
 * Removes screen-only chrome, keeps reading order intact, and sets a
 * document title/lang that tagged PDFs inherit.
 */
export function preparePrintDocumentForAccessiblePdf(): void {
  document
    .querySelectorAll(".bh-bp-screen-notice")
    .forEach((el) => el.remove());

  const shell = document.querySelector(".bh-bp-production-root");
  if (shell instanceof HTMLElement) {
    shell.style.padding = "0";
    shell.style.margin = "0";
    shell.style.background = "transparent";
    shell.style.minHeight = "0";
  }

  const root = document.querySelector(".bh-bp-document");
  if (root instanceof HTMLElement) {
    root.style.background = "transparent";
    root.style.margin = "0";
    root.style.padding = "0";
    const title = root.getAttribute("data-document")?.trim();
    if (title) {
      document.title = title;
    }
  }

  document.querySelectorAll(".bh-bp-page").forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.margin = "0";
      el.style.boxShadow = "none";
    }
  });

  document.documentElement.lang = "en";
}
