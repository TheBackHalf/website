import { AlivenessIndexLayout } from "@/components/blueprint/print/aliveness-index-layout";
import { ArtifactLayout } from "@/components/blueprint/print/artifact-layout";
import { ChapterBodyPage } from "@/components/blueprint/print/chapter-body-page";
import { ChapterOpener } from "@/components/blueprint/print/chapter-opener";
import { CopyrightPage } from "@/components/blueprint/print/copyright-page";
import { ExercisePage } from "@/components/blueprint/print/exercise-page";
import { PagedProseSection } from "@/components/blueprint/print/paged-prose-section";
import { PrintDocumentShell } from "@/components/blueprint/print/print-document-shell";
import { SectionContinuationPage } from "@/components/blueprint/print/section-continuation-page";
import { SectionPage } from "@/components/blueprint/print/section-page";
import { TitlePage } from "@/components/blueprint/print/title-page";
import { TocPage } from "@/components/blueprint/print/toc-page";
import { blueprintDocumentSections } from "@/content/blueprint/document-structure";
import { getBlueprintManuscript } from "@/content/blueprint/manuscript";
import { signature as welcomeLetterSignature } from "@/content/blueprint/manuscript/generated/welcomeLetter";
import type {
  BlueprintPrintVariant,
  BlueprintSectionId,
  StandaloneArtifactId,
} from "@/content/blueprint/types";
import { chunkArtifactParagraphs } from "@/lib/blueprint/artifact-pages";
import { getChapterPrintParts } from "@/lib/blueprint/chapter-print-content";
import {
  getArchitectsCommitmentChunks,
  getFounderClosingChunks,
  getHowToUseChunks,
  getWelcomeLetterChunks,
} from "@/lib/blueprint/guidebook-pagination";
import { getDecisionStatementFillLines } from "@/lib/blueprint/decision-statement-fill";
import { getBackHalfStandardsFillLines } from "@/lib/blueprint/back-half-standards-fill";
import { getArchitectIdentityFillLines } from "@/lib/blueprint/architect-identity-fill";
import { getExpansionPlanFillLines } from "@/lib/blueprint/expansion-plan-fill";
import { getBackHalfDeclarationFillLines } from "@/lib/blueprint/declaration-fill";
import {
  getExerciseResponseLines,
  type BlueprintExerciseResponses,
} from "@/lib/blueprint/personalize-guidebook";

type GuidebookDocumentProps = {
  variant?: BlueprintPrintVariant;
  /** Optional Architect Journey responses for personalized exercise pages. */
  responses?: BlueprintExerciseResponses | null;
};

const chapterIds = [
  "chapter-1-awakening",
  "chapter-2-mirror",
  "chapter-3-decision",
  "chapter-4-standards",
  "chapter-5-architect",
  "chapter-6-expansion",
  "chapter-7-beginning",
] as const;

const CHAPTER_ATMOSPHERE: Record<(typeof chapterIds)[number], string> = {
  "chapter-1-awakening": "/images/journey-light.jpg",
  "chapter-2-mirror": "/images/hero-atmosphere.jpg",
  "chapter-3-decision": "/images/journey-light.jpg",
  "chapter-4-standards": "/images/hero-atmosphere.jpg",
  "chapter-5-architect": "/images/journey-light.jpg",
  "chapter-6-expansion": "/images/hero-atmosphere.jpg",
  "chapter-7-beginning": "/images/journey-light.jpg",
};

function isChapterId(id: BlueprintSectionId): id is (typeof chapterIds)[number] {
  return (chapterIds as readonly string[]).includes(id);
}

function isStandaloneArtifactId(id: BlueprintSectionId): id is StandaloneArtifactId {
  return (
    id === "aliveness-index" ||
    id === "decision-statement" ||
    id === "back-half-standards" ||
    id === "architect-identity-statement" ||
    id === "expansion-plan" ||
    id === "back-half-declaration"
  );
}

export function GuidebookDocument({
  variant = "print",
  responses = null,
}: GuidebookDocumentProps) {
  const manuscript = getBlueprintManuscript();

  return (
    <PrintDocumentShell variant={variant} title="The Back Half Blueprint">
      <TitlePage
        variant={variant}
        title={manuscript?.title ?? null}
        subtitle={manuscript?.subtitle ?? null}
      />
      <CopyrightPage
        variant={variant}
        copyright={manuscript?.copyright ?? null}
      />
      <TocPage variant={variant} />

      <PagedProseSection
        variant={variant}
        id="bp-welcome-letter"
        title="Welcome Letter"
        className="bh-bp-letter-page"
        atmosphereSrc="/images/founder-atmosphere.jpg"
        pages={getWelcomeLetterChunks(manuscript)}
        closingLines={welcomeLetterSignature}
      />
      <PagedProseSection
        variant={variant}
        id="bp-how-to-use"
        title="How to Use This Guidebook"
        eyebrow="Orientation"
        pages={getHowToUseChunks(manuscript)}
      />
      <PagedProseSection
        variant={variant}
        id="bp-architects-commitment"
        title="Architect's Commitment"
        eyebrow="Commitment"
        className="bh-bp-signature-page"
        pages={getArchitectsCommitmentChunks(manuscript)}
        lastContinuationClassName="bh-bp-signature-page"
      />

      {blueprintDocumentSections
        .filter((section) => section.kind === "chapter-opener")
        .map((section) => {
          if (!isChapterId(section.id)) return null;

          const chapterManuscript = manuscript?.chapters?.[section.id] ?? null;
          const parts = getChapterPrintParts(section.id, chapterManuscript);
          const chapterName = section.chapterName ?? section.label;
          const exercises = parts.exercises;

          return (
            <div key={section.id}>
              <ChapterOpener
                variant={variant}
                id={`bp-${section.id}`}
                romanNumeral={section.romanNumeral ?? ""}
                chapterName={chapterName}
                label={section.label}
                manuscript={parts.opener}
                atmosphereSrc={CHAPTER_ATMOSPHERE[section.id]}
              />
              <ChapterBodyPage
                variant={variant}
                header={chapterName}
                manuscript={parts.body}
              />
              {exercises.map((exercise, index) => (
                <ExercisePage
                  key={`${section.id}-exercise-${index + 1}`}
                  variant={variant}
                  header={chapterName}
                  exerciseIndex={index + 1}
                  exercise={exercise}
                  responseLines={getExerciseResponseLines(
                    responses,
                    section.id,
                    index,
                  )}
                />
              ))}
            </div>
          );
        })}

      {blueprintDocumentSections
        .filter((section) => section.kind === "artifact")
        .map((section) => {
          const artifactManuscript = isStandaloneArtifactId(section.id)
            ? manuscript?.artifacts?.[section.id] ?? null
            : null;
          if (section.id === "aliveness-index") {
            return (
              <AlivenessIndexLayout
                key={section.id}
                variant={variant}
                manuscript={artifactManuscript}
                anchorId={`bp-${section.id}`}
              />
            );
          }
          const chunks = chunkArtifactParagraphs(artifactManuscript);
          const fillLines =
            section.id === "decision-statement"
              ? getDecisionStatementFillLines(responses)
              : section.id === "back-half-standards"
                ? getBackHalfStandardsFillLines(responses)
                : section.id === "architect-identity-statement"
                  ? getArchitectIdentityFillLines(responses)
                  : section.id === "expansion-plan"
                    ? getExpansionPlanFillLines(responses)
                    : section.id === "back-half-declaration"
                      ? getBackHalfDeclarationFillLines(responses)
                  : [];
          const fillLabel =
            section.id === "back-half-standards"
              ? "My Back Half Standards"
              : section.id === "architect-identity-statement"
                ? "My Architect Identity"
                : section.id === "expansion-plan"
                  ? "My Expansion Plan"
                  : section.id === "back-half-declaration"
                    ? "My Back Half Declaration"
                : "My Decision Statement";
          if (!chunks.length) {
            return (
              <ArtifactLayout
                key={section.id}
                variant={variant}
                id={`bp-${section.id}`}
                title={section.label}
                manuscript={null}
                breakBefore={false}
                responseLines={fillLines}
                fillLabel={fillLabel}
              />
            );
          }
          return (
            <div key={section.id}>
              <ArtifactLayout
                variant={variant}
                id={`bp-${section.id}`}
                title={section.label}
                manuscript={chunks[0]}
                breakBefore={false}
                responseLines={fillLines}
                fillLabel={fillLabel}
              />
              {chunks.slice(1).map((chunk, index) => (
                <SectionContinuationPage
                  key={`${section.id}-cont-${index + 1}`}
                  variant={variant}
                  header={section.label}
                  manuscript={chunk}
                  preserveParagraphs
                />
              ))}
            </div>
          );
        })}

      <PagedProseSection
        variant={variant}
        id="bp-founder-closing"
        title="A Letter from the Founder"
        eyebrow="Closing"
        className="bh-bp-letter-page"
        atmosphereSrc="/images/founder-atmosphere.jpg"
        pages={getFounderClosingChunks(manuscript)}
      />
      <SectionPage
        variant={variant}
        id="bp-about-founder"
        title="About Kimberly M. Walker"
        eyebrow="Founder"
        className="bh-bp-letter-page"
        manuscript={manuscript?.aboutFounder ?? null}
        atmosphereSrc="/images/founder-atmosphere.jpg"
        finalPage
      />
    </PrintDocumentShell>
  );
}
