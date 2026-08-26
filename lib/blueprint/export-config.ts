import {
  BLUEPRINT_DOWNLOAD_DIR,
  BLUEPRINT_EXPORT_FILES,
  BLUEPRINT_PRINT_ROUTES,
} from "@/content/blueprint/constants";
import { standaloneArtifactIds } from "@/content/blueprint/document-structure";

export type BlueprintExportJob = {
  filename: string;
  route: string;
  label: string;
};

export function getBlueprintExportJobs(baseUrl: string): BlueprintExportJob[] {
  const origin = baseUrl.replace(/\/$/, "");

  const jobs: BlueprintExportJob[] = [
    {
      filename: BLUEPRINT_EXPORT_FILES.guidebook,
      route: `${origin}${BLUEPRINT_PRINT_ROUTES.guidebook("print")}`,
      label: "The Back Half Blueprint",
    },
    {
      filename: BLUEPRINT_EXPORT_FILES.certificate,
      route: `${origin}${BLUEPRINT_PRINT_ROUTES.certificate}`,
      label: "Completion certificate",
    },
    {
      filename: BLUEPRINT_EXPORT_FILES.architectsCommitment,
      route: `${origin}${BLUEPRINT_PRINT_ROUTES.architectsCommitment}`,
      label: "Architect's Commitment",
    },
  ];

  const artifactFileMap: Record<(typeof standaloneArtifactIds)[number], string> = {
    "aliveness-index": BLUEPRINT_EXPORT_FILES.alivenessIndex,
    "decision-statement": BLUEPRINT_EXPORT_FILES.decisionStatement,
    "back-half-standards": BLUEPRINT_EXPORT_FILES.backHalfStandards,
    "architect-identity-statement": BLUEPRINT_EXPORT_FILES.architectIdentityStatement,
    "expansion-plan": BLUEPRINT_EXPORT_FILES.expansionPlan,
    "back-half-declaration": BLUEPRINT_EXPORT_FILES.backHalfDeclaration,
  };

  for (const slug of standaloneArtifactIds) {
    jobs.push({
      filename: artifactFileMap[slug],
      route: `${origin}${BLUEPRINT_PRINT_ROUTES.artifact(slug)}`,
      label: slug,
    });
  }

  return jobs;
}

export { BLUEPRINT_DOWNLOAD_DIR };
