import type { BlueprintPrintVariant } from "@/content/blueprint/types";

/** US Letter production spec — Row 46 print default. */
export const BLUEPRINT_PAGE = {
  widthIn: 8.5,
  heightIn: 11,
  print: {
    marginTopIn: 0.75,
    marginBottomIn: 1,
    marginLeftIn: 0.875,
    marginRightIn: 0.875,
  },
  digital: {
    marginTopIn: 0.625,
    marginBottomIn: 0.75,
    marginLeftIn: 0.75,
    marginRightIn: 0.75,
  },
} as const;

export const BLUEPRINT_EXPORT_FILES = {
  /** Canonical Architect Blueprint guidebook download. */
  guidebook: "the-back-half-blueprint.pdf",
  /** @deprecated Print edition removed from Architect-facing downloads. */
  guidebookPrint: "the-back-half-blueprint-guidebook-print.pdf",
  /** Legacy filename — redirects/replaced by `guidebook`. */
  guidebookDigital: "the-back-half-blueprint.pdf",
  alivenessIndex: "back-half-aliveness-index.pdf",
  architectsCommitment: "back-half-architects-commitment.pdf",
  decisionStatement: "back-half-decision-statement.pdf",
  backHalfStandards: "back-half-standards.pdf",
  architectIdentityStatement: "back-half-architect-identity-statement.pdf",
  expansionPlan: "back-half-expansion-plan.pdf",
  backHalfDeclaration: "back-half-declaration.pdf",
  certificate: "back-half-architect-completion-certificate.pdf",
} as const;

export const BLUEPRINT_PRINT_ROUTES = {
  guidebook: (variant: BlueprintPrintVariant = "print") =>
    `/blueprint/print/guidebook?variant=${variant}`,
  certificate: "/blueprint/print/certificate",
  architectsCommitment: "/blueprint/print/architects-commitment",
  artifact: (slug: string) => `/blueprint/print/artifacts/${slug}`,
} as const;

export const BLUEPRINT_DOWNLOAD_DIR = "public/downloads/blueprint";
