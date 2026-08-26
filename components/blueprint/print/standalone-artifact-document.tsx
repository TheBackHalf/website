import { AlivenessIndexLayout } from "@/components/blueprint/print/aliveness-index-layout";
import { ArtifactLayout } from "@/components/blueprint/print/artifact-layout";
import { PrintDocumentShell } from "@/components/blueprint/print/print-document-shell";
import { SectionContinuationPage } from "@/components/blueprint/print/section-continuation-page";
import { getBlueprintSection } from "@/content/blueprint/document-structure";
import { getBlueprintManuscript } from "@/content/blueprint/manuscript";
import { chunkArtifactParagraphs } from "@/lib/blueprint/artifact-pages";
import { getDecisionStatementFillLines } from "@/lib/blueprint/decision-statement-fill";
import { getBackHalfStandardsFillLines } from "@/lib/blueprint/back-half-standards-fill";
import { getArchitectIdentityFillLines } from "@/lib/blueprint/architect-identity-fill";
import { getExpansionPlanFillLines } from "@/lib/blueprint/expansion-plan-fill";
import { getBackHalfDeclarationFillLines } from "@/lib/blueprint/declaration-fill";
import type { BlueprintExerciseResponses } from "@/lib/blueprint/personalize-guidebook";
import type {
  BlueprintPrintVariant,
  StandaloneArtifactId,
} from "@/content/blueprint/types";

type StandaloneArtifactDocumentProps = {
  artifactId: StandaloneArtifactId;
  variant?: BlueprintPrintVariant;
  /** Optional Architect Journey responses (Decision Statement personalization). */
  responses?: BlueprintExerciseResponses | null;
};

export function StandaloneArtifactDocument({
  artifactId,
  variant = "print",
  responses = null,
}: StandaloneArtifactDocumentProps) {
  const section = getBlueprintSection(artifactId);
  const manuscript = getBlueprintManuscript();

  if (!section || section.kind !== "artifact") {
    return null;
  }

  const chunks = chunkArtifactParagraphs(
    manuscript?.artifacts?.[artifactId] ?? null,
  );

  if (artifactId === "aliveness-index") {
    return (
      <PrintDocumentShell
        variant={variant}
        title={`The Back Half Blueprint — ${section.label}`}
      >
        <AlivenessIndexLayout
          variant={variant}
          manuscript={manuscript?.artifacts?.[artifactId] ?? null}
          standalone
        />
      </PrintDocumentShell>
    );
  }
  const fillLines =
    artifactId === "decision-statement"
      ? getDecisionStatementFillLines(responses)
      : artifactId === "back-half-standards"
        ? getBackHalfStandardsFillLines(responses)
        : artifactId === "architect-identity-statement"
          ? getArchitectIdentityFillLines(responses)
          : artifactId === "expansion-plan"
            ? getExpansionPlanFillLines(responses)
            : artifactId === "back-half-declaration"
              ? getBackHalfDeclarationFillLines(responses)
          : [];
  const fillLabel =
    artifactId === "back-half-standards"
      ? "My Back Half Standards"
      : artifactId === "architect-identity-statement"
        ? "My Architect Identity"
        : artifactId === "expansion-plan"
          ? "My Expansion Plan"
          : artifactId === "back-half-declaration"
            ? "My Back Half Declaration"
        : "My Decision Statement";

  return (
    <PrintDocumentShell
      variant={variant}
      title={`The Back Half Blueprint — ${section.label}`}
    >
      {!chunks.length ? (
        <ArtifactLayout
          variant={variant}
          title={section.label}
          manuscript={null}
          standalone
          responseLines={fillLines}
          fillLabel={fillLabel}
        />
      ) : (
        <>
          <ArtifactLayout
            variant={variant}
            title={section.label}
            manuscript={chunks[0]}
            standalone
            responseLines={fillLines}
          fillLabel={fillLabel}
          />
          {chunks.slice(1).map((chunk, index) => (
            <SectionContinuationPage
              key={`${artifactId}-cont-${index + 1}`}
              variant={variant}
              header={section.label}
              manuscript={chunk}
              finalPage={index === chunks.length - 2}
            />
          ))}
        </>
      )}
    </PrintDocumentShell>
  );
}
