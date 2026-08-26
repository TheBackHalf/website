import { journeyStages } from "@/content/journey-stages";
import type { BlueprintSectionDefinition } from "@/content/blueprint/types";

/**
 * Full Back Half Blueprint document order.
 * Body copy for every section is external founder-approved manuscript — insert via content/blueprint/manuscript/.
 * @see content/blueprint/README.md
 */

function chapterName(order: number): string | undefined {
  return journeyStages.find((stage) => stage.order === order)?.name;
}

export const blueprintDocumentSections: readonly BlueprintSectionDefinition[] = [
  { id: "title-page", kind: "title", label: "Title Page", includeInToc: false },
  { id: "copyright", kind: "copyright", label: "Copyright", includeInToc: false },
  {
    id: "table-of-contents",
    kind: "toc",
    label: "Table of Contents",
    includeInToc: false,
  },
  {
    id: "welcome-letter",
    kind: "letter",
    label: "Welcome Letter",
    includeInToc: true,
  },
  {
    id: "how-to-use",
    kind: "instruction",
    label: "How to Use This Guidebook",
    includeInToc: true,
  },
  {
    id: "architects-commitment",
    kind: "commitment",
    label: "Architect's Commitment",
    includeInToc: true,
  },
  {
    id: "chapter-1-awakening",
    kind: "chapter-opener",
    label: "Chapter I — The Awakening",
    chapterName: chapterName(1),
    romanNumeral: "I",
    includeInToc: true,
    /** Aliveness Project — five questions. */
    exercisePageCount: 5,
  },
  {
    id: "chapter-2-mirror",
    kind: "chapter-opener",
    label: "Chapter II — The Mirror",
    chapterName: chapterName(2),
    romanNumeral: "II",
    includeInToc: true,
    exercisePageCount: 4,
  },
  {
    id: "chapter-3-decision",
    kind: "chapter-opener",
    label: "Chapter III — The Decision",
    chapterName: chapterName(3),
    romanNumeral: "III",
    includeInToc: true,
    exercisePageCount: 2,
  },
  {
    id: "chapter-4-standards",
    kind: "chapter-opener",
    label: "Chapter IV — The Standards",
    chapterName: chapterName(4),
    romanNumeral: "IV",
    includeInToc: true,
    exercisePageCount: 2,
  },
  {
    id: "chapter-5-architect",
    kind: "chapter-opener",
    label: "Chapter V — Becoming the Architect",
    chapterName: chapterName(5),
    romanNumeral: "V",
    includeInToc: true,
    /** Participant exercises only — Three Lives Founder exercise excluded. */
    exercisePageCount: 2,
  },
  {
    id: "chapter-6-expansion",
    kind: "chapter-opener",
    label: "Chapter VI — Expansion",
    chapterName: chapterName(6),
    romanNumeral: "VI",
    includeInToc: true,
    exercisePageCount: 2,
  },
  {
    id: "chapter-7-beginning",
    kind: "chapter-opener",
    label: "Chapter VII — The Beginning",
    chapterName: chapterName(7),
    romanNumeral: "VII",
    includeInToc: true,
    exercisePageCount: 2,
  },
  {
    id: "aliveness-index",
    kind: "artifact",
    label: "Aliveness Index",
    includeInToc: true,
  },
  {
    id: "decision-statement",
    kind: "artifact",
    label: "Decision Statement",
    includeInToc: true,
  },
  {
    id: "back-half-standards",
    kind: "artifact",
    label: "Back Half Standards",
    includeInToc: true,
  },
  {
    id: "architect-identity-statement",
    kind: "artifact",
    label: "Architect Identity Statement",
    includeInToc: true,
  },
  {
    id: "expansion-plan",
    kind: "artifact",
    label: "Expansion Plan",
    includeInToc: true,
  },
  {
    id: "back-half-declaration",
    kind: "artifact",
    label: "Back Half Declaration",
    includeInToc: true,
  },
  {
    id: "founder-closing",
    kind: "closing",
    label: "A Letter from the Founder",
    includeInToc: true,
  },
  {
    id: "about-founder",
    kind: "about",
    label: "About Kimberly M. Walker",
    includeInToc: true,
  },
] as const;

export const standaloneArtifactIds = [
  "aliveness-index",
  "decision-statement",
  "back-half-standards",
  "architect-identity-statement",
  "expansion-plan",
  "back-half-declaration",
] as const;

export function getBlueprintSection(id: BlueprintSectionDefinition["id"]) {
  return blueprintDocumentSections.find((section) => section.id === id);
}
