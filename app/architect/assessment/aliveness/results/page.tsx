import type { Metadata } from "next";
import { AlivenessAssessmentPage } from "@/components/assessment/aliveness-assessment-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata(
  "en",
  "assessmentResults",
);

export default function ArchitectAlivenessResultsPage() {
  return <AlivenessAssessmentPage locale="en" view="results" />;
}
