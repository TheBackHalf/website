/** Marker shown wherever founder-approved manuscript text must be inserted. */
export const APPROVED_COPY_REQUIRED = "APPROVED COPY REQUIRED" as const;

export type BlueprintPageKind =
  | "title"
  | "copyright"
  | "toc"
  | "letter"
  | "instruction"
  | "commitment"
  | "chapter-opener"
  | "chapter-body"
  | "exercise"
  | "artifact"
  | "about"
  | "closing";

export type BlueprintSectionId =
  | "title-page"
  | "copyright"
  | "table-of-contents"
  | "welcome-letter"
  | "how-to-use"
  | "architects-commitment"
  | "chapter-1-awakening"
  | "chapter-2-mirror"
  | "chapter-3-decision"
  | "chapter-4-standards"
  | "chapter-5-architect"
  | "chapter-6-expansion"
  | "chapter-7-beginning"
  | "founder-closing"
  | "about-founder"
  | "aliveness-index"
  | "decision-statement"
  | "back-half-standards"
  | "architect-identity-statement"
  | "expansion-plan"
  | "back-half-declaration";

export type StandaloneArtifactId = Extract<
  BlueprintSectionId,
  | "aliveness-index"
  | "decision-statement"
  | "back-half-standards"
  | "architect-identity-statement"
  | "expansion-plan"
  | "back-half-declaration"
>;

export type BlueprintSectionDefinition = {
  id: BlueprintSectionId;
  kind: BlueprintPageKind;
  /** Structural label for TOC/navigation — not manuscript body copy. */
  label: string;
  /** When set, chapter opener may display this approved name from journey-stages. */
  chapterName?: string;
  romanNumeral?: string;
  /** Number of exercise/writing pages to reserve in layout template. */
  exercisePageCount?: number;
  includeInToc?: boolean;
  tocPageHint?: string;
};

export type BlueprintPrintVariant = "print" | "digital";
