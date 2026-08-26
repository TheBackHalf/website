/**
 * Row 83 — Journey onboarding flow types.
 * Row 84 — Aliveness results snapshot on assessment state.
 */

import type { AlivenessDomainId } from "@/content/journey/aliveness-index";

export const ONBOARDING_STEPS = [
  "welcome",
  "preferences",
  "consent",
  "lumina",
  "assessment",
  "awakening",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export type OnboardingStatus = "in_progress" | "completed";

export type AlivenessRating = 1 | 2 | 3 | 4 | 5;

/** Server-authored results snapshot — never accept client-submitted totals. */
export type AlivenessResultsSnapshot = {
  domainScores: Array<{
    domainId: AlivenessDomainId;
    name: string;
    score: number;
    maxScore: 25;
  }>;
  total: number;
  maxTotal: 225;
  highestDomains: AlivenessDomainId[];
  lowestDomains: AlivenessDomainId[];
  completedAt: string;
};

export type AlivenessAssessmentState = {
  /** statementId → rating */
  responses: Record<string, AlivenessRating>;
  completedAt?: string;
  /** Authoritative scores computed server-side on completion. */
  resultsSnapshot?: AlivenessResultsSnapshot;
  updatedAt: string;
};

export type OnboardingRecord = {
  userId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStepId | "completed";
  completedSteps: OnboardingStepId[];
  purchaseConfirmedAt?: string;
  welcomeCompletedAt?: string;
  preferencesCompletedAt?: string;
  consentCompletedAt?: string;
  luminaCompletedAt?: string;
  assessmentCompletedAt?: string;
  awakeningEnteredAt?: string;
  completedAt?: string;
  assessment: AlivenessAssessmentState;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingDatabase = {
  records: OnboardingRecord[];
};

export function isOnboardingStepId(value: string): value is OnboardingStepId {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

export function emptyAssessmentState(now = new Date().toISOString()): AlivenessAssessmentState {
  return {
    responses: {},
    updatedAt: now,
  };
}

export function createEmptyOnboardingRecord(
  userId: string,
  now = new Date().toISOString(),
): OnboardingRecord {
  return {
    userId,
    status: "in_progress",
    currentStep: "welcome",
    completedSteps: [],
    assessment: emptyAssessmentState(now),
    createdAt: now,
    updatedAt: now,
  };
}
