import { PortfolioDocument } from "@/components/blueprint/print/portfolio-document";
import { assembleArchitectPortfolio } from "@/lib/blueprint/portfolio";
import { loadArchitectGuidebookResponses } from "@/lib/blueprint/load-architect-guidebook-responses";
import { resolveBlueprintPrintArchitectId } from "@/lib/blueprint/print-access";
import { buildResultsSnapshot } from "@/lib/journey/assessments/aliveness";
import { getOnboardingStateForUser } from "@/lib/journey/onboarding/eligibility";
import type { AlivenessResultsSnapshot } from "@/lib/journey/onboarding/types";

type PortfolioPrintPageProps = {
  searchParams: Promise<{ architectId?: string }>;
};

export default async function PortfolioPrintPage({
  searchParams,
}: PortfolioPrintPageProps) {
  const params = await searchParams;
  const architectId = await resolveBlueprintPrintArchitectId(
    params.architectId,
  );

  let responses = null;
  let aliveness: AlivenessResultsSnapshot | null = null;

  if (architectId) {
    try {
      responses = await loadArchitectGuidebookResponses(architectId);
    } catch {
      responses = null;
    }
    try {
      const onboarding = await getOnboardingStateForUser(architectId);
      aliveness = onboarding?.assessment.resultsSnapshot ?? null;
      if (!aliveness && onboarding?.assessment) {
        aliveness =
          buildResultsSnapshot(
            onboarding.assessment.responses,
            onboarding.assessment.completedAt,
          ) ?? null;
      }
    } catch {
      aliveness = null;
    }
  }

  const model = assembleArchitectPortfolio({
    firstName: responses?.firstName ?? null,
    aliveness,
    responses,
  });

  return <PortfolioDocument model={model} />;
}
