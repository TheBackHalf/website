import type { Metadata } from "next";
import { AlivenessAssessmentPage } from "@/components/assessment/aliveness-assessment-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata(
  "es",
  "assessment",
);

export default function EsArchitectAlivenessAssessmentPage() {
  return <AlivenessAssessmentPage locale="es" view="questions" />;
}
