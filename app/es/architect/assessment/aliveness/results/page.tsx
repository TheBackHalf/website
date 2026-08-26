import type { Metadata } from "next";
import { AlivenessAssessmentPage } from "@/components/assessment/aliveness-assessment-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata(
  "es",
  "assessmentResults",
);

export default function EsArchitectAlivenessResultsPage() {
  return <AlivenessAssessmentPage locale="es" view="results" />;
}
