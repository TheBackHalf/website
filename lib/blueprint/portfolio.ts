/**
 * Architect Portfolio assembly — Launch Readiness row 134.
 *
 * Assembles completed Journey artifacts, Architect's Commitment (manifesto),
 * Aliveness Index highest/lowest (Blueprint priorities), Decision Statement
 * (decisions), and Expansion Plan (plan) into one downloadable portfolio.
 *
 * Does not rewrite approved manuscript. Does not mark Founder acceptance.
 */

import { getArchitectIdentityFillLines } from "@/lib/blueprint/architect-identity-fill";
import { getBackHalfStandardsFillLines } from "@/lib/blueprint/back-half-standards-fill";
import { getDecisionStatementFillLines } from "@/lib/blueprint/decision-statement-fill";
import { getBackHalfDeclarationFillLines } from "@/lib/blueprint/declaration-fill";
import { getExpansionPlanFillLines } from "@/lib/blueprint/expansion-plan-fill";
import { loadArchitectGuidebookResponses } from "@/lib/blueprint/load-architect-guidebook-responses";
import type { BlueprintExerciseResponses } from "@/lib/blueprint/personalize-guidebook";
import { buildResultsSnapshot } from "@/lib/journey/assessments/aliveness";
import { getOnboardingStateForUser } from "@/lib/journey/onboarding/eligibility";
import type { AlivenessResultsSnapshot } from "@/lib/journey/onboarding/types";

export const ARCHITECT_PORTFOLIO_ASSET_ID = "portfolio" as const;
export const ARCHITECT_PORTFOLIO_LABEL = "Architect Portfolio";
export const ARCHITECT_PORTFOLIO_HREF = "/api/architect/blueprint/portfolio";

export type PortfolioContentRole =
  | "manifesto"
  | "blueprint-priorities"
  | "decisions"
  | "plan"
  | "artifact";

export type PortfolioSectionStatus = "included" | "awaiting_work";

export type PortfolioSlotId =
  | "manifesto"
  | "blueprint-priorities"
  | "aliveness-index"
  | "decision-statement"
  | "back-half-standards"
  | "architect-identity-statement"
  | "expansion-plan"
  | "back-half-declaration";

export type PortfolioSlotDefinition = {
  id: PortfolioSlotId;
  label: string;
  role: PortfolioContentRole;
};

/** Canonical Architect Portfolio contents from approved Blueprint artifacts. */
export const PORTFOLIO_CONTENT_SLOTS: readonly PortfolioSlotDefinition[] = [
  {
    id: "manifesto",
    label: "Architect's Commitment",
    role: "manifesto",
  },
  {
    id: "blueprint-priorities",
    label: "Aliveness Index — Highest and Lowest",
    role: "blueprint-priorities",
  },
  {
    id: "aliveness-index",
    label: "Aliveness Index",
    role: "artifact",
  },
  {
    id: "decision-statement",
    label: "Decision Statement",
    role: "decisions",
  },
  {
    id: "back-half-standards",
    label: "Back Half Standards",
    role: "artifact",
  },
  {
    id: "architect-identity-statement",
    label: "Architect Identity Statement",
    role: "artifact",
  },
  {
    id: "expansion-plan",
    label: "Expansion Plan",
    role: "plan",
  },
  {
    id: "back-half-declaration",
    label: "Back Half Declaration",
    role: "artifact",
  },
] as const;

export type PortfolioSection = {
  id: PortfolioSlotId;
  label: string;
  role: PortfolioContentRole;
  status: PortfolioSectionStatus;
  fillLines: string[];
};

export type ArchitectPortfolioModel = {
  title: typeof ARCHITECT_PORTFOLIO_LABEL;
  architectName: string | null;
  aliveness: AlivenessResultsSnapshot | null;
  responses: BlueprintExerciseResponses | null;
  sections: PortfolioSection[];
  completedCount: number;
  totalCount: number;
  isFinal: boolean;
  href: typeof ARCHITECT_PORTFOLIO_HREF;
};

export type AssembleArchitectPortfolioInput = {
  firstName?: string | null;
  aliveness?: AlivenessResultsSnapshot | null;
  responses?: BlueprintExerciseResponses | null;
};

function hasLines(lines: readonly string[]): boolean {
  return lines.some((line) => line.trim().length > 0);
}

function statusFor(complete: boolean): PortfolioSectionStatus {
  return complete ? "included" : "awaiting_work";
}

/**
 * Pure assembly. Blank slots remain in the package so the downloadable
 * portfolio is complete; contents marks which work is populated.
 */
export function assembleArchitectPortfolio(
  input: AssembleArchitectPortfolioInput = {},
): ArchitectPortfolioModel {
  const responses = input.responses ?? null;
  const aliveness = input.aliveness ?? null;
  const assessmentComplete = Boolean(aliveness);

  const fillById: Record<PortfolioSlotId, string[]> = {
    manifesto: [],
    "blueprint-priorities": assessmentComplete
      ? [
          ...(aliveness?.highestDomains.length
            ? [
                `Highest: ${aliveness.domainScores
                  .filter((domain) =>
                    aliveness.highestDomains.includes(domain.domainId),
                  )
                  .map((domain) => domain.name)
                  .join(", ")}`,
              ]
            : []),
          ...(aliveness?.lowestDomains.length
            ? [
                `Lowest: ${aliveness.domainScores
                  .filter((domain) =>
                    aliveness.lowestDomains.includes(domain.domainId),
                  )
                  .map((domain) => domain.name)
                  .join(", ")}`,
              ]
            : []),
        ]
      : [],
    "aliveness-index": [],
    "decision-statement": getDecisionStatementFillLines(responses),
    "back-half-standards": getBackHalfStandardsFillLines(responses),
    "architect-identity-statement": getArchitectIdentityFillLines(responses),
    "expansion-plan": getExpansionPlanFillLines(responses),
    "back-half-declaration": getBackHalfDeclarationFillLines(responses),
  };

  const completeById: Record<PortfolioSlotId, boolean> = {
    // Approved manifesto manuscript is always part of the portfolio.
    manifesto: true,
    "blueprint-priorities": assessmentComplete,
    "aliveness-index": assessmentComplete,
    "decision-statement": hasLines(fillById["decision-statement"]),
    "back-half-standards": hasLines(fillById["back-half-standards"]),
    "architect-identity-statement": hasLines(
      fillById["architect-identity-statement"],
    ),
    "expansion-plan": hasLines(fillById["expansion-plan"]),
    "back-half-declaration": hasLines(fillById["back-half-declaration"]),
  };

  const sections: PortfolioSection[] = PORTFOLIO_CONTENT_SLOTS.map((slot) => ({
    id: slot.id,
    label: slot.label,
    role: slot.role,
    status: statusFor(completeById[slot.id]),
    fillLines: fillById[slot.id],
  }));

  const completedCount = sections.filter(
    (section) => section.status === "included",
  ).length;

  const architectName = input.firstName?.trim() || responses?.firstName?.trim() || null;

  return {
    title: ARCHITECT_PORTFOLIO_LABEL,
    architectName,
    aliveness,
    responses,
    sections,
    completedCount,
    totalCount: sections.length,
    isFinal: completedCount === sections.length,
    href: ARCHITECT_PORTFOLIO_HREF,
  };
}

export function portfolioHasRequiredRoles(
  slots: readonly PortfolioSlotDefinition[] = PORTFOLIO_CONTENT_SLOTS,
): boolean {
  const roles = new Set(slots.map((slot) => slot.role));
  return (
    roles.has("manifesto") &&
    roles.has("blueprint-priorities") &&
    roles.has("decisions") &&
    roles.has("plan") &&
    roles.has("artifact")
  );
}

export async function loadArchitectPortfolio(
  userId: string,
): Promise<ArchitectPortfolioModel> {
  const trimmed = userId.trim();
  const [responses, onboarding] = await Promise.all([
    trimmed ? loadArchitectGuidebookResponses(trimmed) : Promise.resolve(null),
    trimmed ? getOnboardingStateForUser(trimmed) : Promise.resolve(null),
  ]);

  let aliveness: AlivenessResultsSnapshot | null =
    onboarding?.assessment.resultsSnapshot ?? null;
  if (!aliveness && onboarding?.assessment) {
    aliveness =
      buildResultsSnapshot(
        onboarding.assessment.responses,
        onboarding.assessment.completedAt,
      ) ?? null;
  }

  return assembleArchitectPortfolio({
    firstName: responses?.firstName ?? null,
    aliveness,
    responses,
  });
}
