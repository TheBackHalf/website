import { BLUEPRINT_EXPORT_FILES } from "@/content/blueprint/constants";
import { isManuscriptInserted } from "@/content/blueprint/manuscript";

export type BlueprintDownloadAsset = {
  id: string;
  filename: string;
  href: string;
  label: string;
};

/** Standalone + guidebook assets for Architect Resources. */
export function getBlueprintDownloadAssets(): BlueprintDownloadAsset[] {
  return [
    {
      id: "guidebook",
      filename: BLUEPRINT_EXPORT_FILES.guidebook,
      /** Personalized PDF generated from the Architect's saved Journey responses. */
      href: "/api/architect/blueprint/guidebook",
      label: "The Back Half Blueprint",
    },
    {
      id: "aliveness-index",
      filename: BLUEPRINT_EXPORT_FILES.alivenessIndex,
      href: "/api/architect/blueprint/aliveness-index",
      label: "Aliveness Index",
    },
    {
      id: "architects-commitment",
      filename: BLUEPRINT_EXPORT_FILES.architectsCommitment,
      href: "/api/architect/blueprint/architects-commitment",
      label: "Architect's Commitment",
    },
    {
      id: "decision-statement",
      filename: BLUEPRINT_EXPORT_FILES.decisionStatement,
      /** Personalized PDF from the Architect's Chapter III practice statement. */
      href: "/api/architect/blueprint/decision-statement",
      label: "Decision Statement",
    },
    {
      id: "back-half-standards",
      filename: BLUEPRINT_EXPORT_FILES.backHalfStandards,
      /** Personalized PDF from the Architect's Chapter IV practice standards. */
      href: "/api/architect/blueprint/back-half-standards",
      label: "Back Half Standards",
    },
    {
      id: "architect-identity",
      filename: BLUEPRINT_EXPORT_FILES.architectIdentityStatement,
      /** Personalized PDF from the Architect's Chapter V identity statement. */
      href: "/api/architect/blueprint/architect-identity",
      label: "Architect Identity Statement",
    },
    {
      id: "expansion-plan",
      filename: BLUEPRINT_EXPORT_FILES.expansionPlan,
      /** Personalized PDF from the Architect's Chapter VI Expansion Plan. */
      href: "/api/architect/blueprint/expansion-plan",
      label: "Expansion Plan",
    },
    {
      id: "declaration",
      filename: BLUEPRINT_EXPORT_FILES.backHalfDeclaration,
      /** Personalized PDF from the Architect's Chapter VII Back Half Declaration. */
      href: "/api/architect/blueprint/declaration",
      label: "Back Half Declaration",
    },
    {
      id: "certificate",
      filename: BLUEPRINT_EXPORT_FILES.certificate,
      /** Personalized PDF after Journey completion. */
      href: "/api/architect/blueprint/certificate",
      label: "Architect Completion Certificate",
    },
  ];
}

export function getBlueprintProductionStatus() {
  return {
    infrastructureReady: true,
    manuscriptInserted: isManuscriptInserted(),
    previewBasePath: "/blueprint/print/guidebook",
  };
}
