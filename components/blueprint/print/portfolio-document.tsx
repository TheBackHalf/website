import { AlivenessIndexLayout } from "@/components/blueprint/print/aliveness-index-layout";
import { ArtifactLayout } from "@/components/blueprint/print/artifact-layout";
import { PagedProseSection } from "@/components/blueprint/print/paged-prose-section";
import { PortfolioContents } from "@/components/blueprint/print/portfolio-contents";
import { PortfolioCover } from "@/components/blueprint/print/portfolio-cover";
import { PortfolioPriorities } from "@/components/blueprint/print/portfolio-priorities";
import { PrintDocumentShell } from "@/components/blueprint/print/print-document-shell";
import { SectionContinuationPage } from "@/components/blueprint/print/section-continuation-page";
import { getBlueprintManuscript } from "@/content/blueprint/manuscript";
import type {
  BlueprintPrintVariant,
  StandaloneArtifactId,
} from "@/content/blueprint/types";
import { chunkArtifactParagraphs } from "@/lib/blueprint/artifact-pages";
import { getArchitectIdentityFillLines } from "@/lib/blueprint/architect-identity-fill";
import { getBackHalfStandardsFillLines } from "@/lib/blueprint/back-half-standards-fill";
import { getDecisionStatementFillLines } from "@/lib/blueprint/decision-statement-fill";
import { getBackHalfDeclarationFillLines } from "@/lib/blueprint/declaration-fill";
import { getExpansionPlanFillLines } from "@/lib/blueprint/expansion-plan-fill";
import { getArchitectsCommitmentChunks } from "@/lib/blueprint/guidebook-pagination";
import {
  ARCHITECT_PORTFOLIO_LABEL,
  type ArchitectPortfolioModel,
} from "@/lib/blueprint/portfolio";

type PortfolioDocumentProps = {
  variant?: BlueprintPrintVariant;
  model: ArchitectPortfolioModel;
};

const ARTIFACT_FILL: Record<
  Exclude<StandaloneArtifactId, "aliveness-index">,
  {
    label: string;
    lines: (model: ArchitectPortfolioModel) => string[];
  }
> = {
  "decision-statement": {
    label: "My Decision Statement",
    lines: (model) => getDecisionStatementFillLines(model.responses),
  },
  "back-half-standards": {
    label: "My Back Half Standards",
    lines: (model) => getBackHalfStandardsFillLines(model.responses),
  },
  "architect-identity-statement": {
    label: "My Architect Identity",
    lines: (model) => getArchitectIdentityFillLines(model.responses),
  },
  "expansion-plan": {
    label: "My Expansion Plan",
    lines: (model) => getExpansionPlanFillLines(model.responses),
  },
  "back-half-declaration": {
    label: "My Back Half Declaration",
    lines: (model) => getBackHalfDeclarationFillLines(model.responses),
  },
};

const ARTIFACT_ORDER: StandaloneArtifactId[] = [
  "aliveness-index",
  "decision-statement",
  "back-half-standards",
  "architect-identity-statement",
  "expansion-plan",
  "back-half-declaration",
];

function ArtifactSection({
  variant,
  artifactId,
  model,
  finalArtifact,
}: {
  variant: BlueprintPrintVariant;
  artifactId: StandaloneArtifactId;
  model: ArchitectPortfolioModel;
  finalArtifact: boolean;
}) {
  const manuscript = getBlueprintManuscript();
  const artifactManuscript = manuscript?.artifacts?.[artifactId] ?? null;

  if (artifactId === "aliveness-index") {
    return (
      <AlivenessIndexLayout
        variant={variant}
        manuscript={artifactManuscript}
        anchorId={`bp-portfolio-${artifactId}`}
      />
    );
  }

  const fill = ARTIFACT_FILL[artifactId];
  const chunks = chunkArtifactParagraphs(artifactManuscript);
  const fillLines = fill.lines(model);
  const title =
    artifactId === "decision-statement"
      ? "Decision Statement"
      : artifactId === "back-half-standards"
        ? "Back Half Standards"
        : artifactId === "architect-identity-statement"
          ? "Architect Identity Statement"
          : artifactId === "expansion-plan"
            ? "Expansion Plan"
            : "Back Half Declaration";

  if (!chunks.length) {
    return (
      <ArtifactLayout
        variant={variant}
        id={`bp-portfolio-${artifactId}`}
        title={title}
        manuscript={null}
        breakBefore
        responseLines={fillLines}
        fillLabel={fill.label}
      />
    );
  }

  return (
    <>
      <ArtifactLayout
        variant={variant}
        id={`bp-portfolio-${artifactId}`}
        title={title}
        manuscript={chunks[0]}
        breakBefore
        responseLines={fillLines}
        fillLabel={fill.label}
      />
      {chunks.slice(1).map((chunk, index) => (
        <SectionContinuationPage
          key={`${artifactId}-cont-${index + 1}`}
          variant={variant}
          header={title}
          manuscript={chunk}
          preserveParagraphs
          finalPage={finalArtifact && index === chunks.length - 2}
        />
      ))}
    </>
  );
}

export function PortfolioDocument({
  variant = "print",
  model,
}: PortfolioDocumentProps) {
  return (
    <PrintDocumentShell
      variant={variant}
      title={`The Back Half — ${ARCHITECT_PORTFOLIO_LABEL}`}
    >
      <PortfolioCover variant={variant} architectName={model.architectName} />
      <PortfolioContents variant={variant} model={model} />
      <PagedProseSection
        variant={variant}
        id="bp-portfolio-manifesto"
        title="Architect's Commitment"
        eyebrow="Commitment"
        className="bh-bp-signature-page"
        pages={getArchitectsCommitmentChunks()}
        lastContinuationClassName="bh-bp-signature-page"
      />
      <PortfolioPriorities variant={variant} model={model} />
      {ARTIFACT_ORDER.map((artifactId, index) => (
        <ArtifactSection
          key={artifactId}
          variant={variant}
          artifactId={artifactId}
          model={model}
          finalArtifact={index === ARTIFACT_ORDER.length - 1}
        />
      ))}
    </PrintDocumentShell>
  );
}
