/**
 * Row 84 — Aliveness assessment experience (entitled, account-scoped).
 */

import { isAlivenessAssessmentComplete } from "@/content/journey/aliveness-index";
import {
  buildResultsSnapshot,
  isAssessmentReviewOnly,
  mergeAssessmentResponses,
  toAlivenessContextSummary,
} from "@/lib/journey/assessments/aliveness";
import {
  loadOnboardingForEntitledUser,
  type OnboardingAccessError,
} from "@/lib/journey/onboarding/service";
import { getJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import type {
  AlivenessAssessmentState,
  OnboardingRecord,
  OnboardingStepId,
} from "@/lib/journey/onboarding/types";

export type AssessmentLoadResult =
  | {
      status: "ok";
      record: OnboardingRecord;
      assessment: AlivenessAssessmentState;
      reviewOnly: boolean;
      complete: boolean;
    }
  | { status: "blocked"; reason: OnboardingAccessError };

export async function loadAlivenessAssessmentForUser(
  userId: string,
): Promise<AssessmentLoadResult> {
  const loaded = await loadOnboardingForEntitledUser(userId);
  if (loaded.status !== "ok") {
    return loaded;
  }
  const assessment = loaded.record.assessment;
  const complete =
    Boolean(assessment.resultsSnapshot) ||
    isAlivenessAssessmentComplete(assessment.responses);
  return {
    status: "ok",
    record: loaded.record,
    assessment,
    reviewOnly: isAssessmentReviewOnly(assessment) || complete,
    complete,
  };
}

export async function saveAlivenessAssessmentForUser(input: {
  userId: string;
  responses: Record<string, unknown>;
}): Promise<
  | { status: "ok"; record: OnboardingRecord; reviewOnly: boolean }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "review_only" }
  | { status: "step_locked" }
> {
  const loaded = await loadOnboardingForEntitledUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const record = loaded.record;
  if (isAssessmentReviewOnly(record.assessment)) {
    return { status: "review_only" };
  }

  const allowed =
    record.currentStep === "assessment" ||
    record.completedSteps.includes("assessment") ||
    record.status === "completed";
  // After onboarding complete, assessment is review-only (handled above).
  // During onboarding, only allow saves at/after assessment step.
  if (record.status !== "completed" && !allowed) {
    return { status: "step_locked" };
  }
  if (record.status === "completed") {
    return { status: "review_only" };
  }

  const now = new Date().toISOString();
  const nextAssessment = mergeAssessmentResponses(
    record.assessment,
    input.responses,
  );
  const next: OnboardingRecord = {
    ...record,
    assessment: nextAssessment,
    updatedAt: now,
  };
  const saved = await getJourneyOnboardingStore().saveOnboarding(next);
  return {
    status: "ok",
    record: saved,
    reviewOnly: isAssessmentReviewOnly(saved.assessment),
  };
}

/**
 * Finalize assessment with server-computed snapshot.
 * Used by dedicated experience and onboarding advance.
 */
export async function completeAlivenessAssessmentForUser(input: {
  userId: string;
  responses?: Record<string, unknown>;
}): Promise<
  | { status: "ok"; record: OnboardingRecord }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "incomplete_assessment" }
  | { status: "review_only"; record: OnboardingRecord }
> {
  const loaded = await loadOnboardingForEntitledUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  let record = loaded.record;
  const now = new Date().toISOString();

  if (isAssessmentReviewOnly(record.assessment)) {
    // Ensure snapshot present; do not overwrite answers.
    if (!record.assessment.resultsSnapshot) {
      const snapshot = buildResultsSnapshot(
        record.assessment.responses,
        record.assessment.completedAt ?? now,
      );
      if (snapshot) {
        record = await getJourneyOnboardingStore().saveOnboarding({
          ...record,
          assessment: {
            ...record.assessment,
            completedAt: snapshot.completedAt,
            resultsSnapshot: snapshot,
            updatedAt: now,
          },
          assessmentCompletedAt: record.assessmentCompletedAt ?? now,
          updatedAt: now,
        });
      }
    }
    return { status: "review_only", record };
  }

  if (input.responses) {
    record = {
      ...record,
      assessment: mergeAssessmentResponses(
        record.assessment,
        input.responses,
      ),
      updatedAt: now,
    };
  }

  if (!isAlivenessAssessmentComplete(record.assessment.responses)) {
    await getJourneyOnboardingStore().saveOnboarding(record);
    return { status: "incomplete_assessment" };
  }

  const completedAt = record.assessment.completedAt ?? now;
  const resultsSnapshot =
    record.assessment.resultsSnapshot ??
    buildResultsSnapshot(record.assessment.responses, completedAt);

  record = {
    ...record,
    assessment: {
      ...record.assessment,
      completedAt,
      ...(resultsSnapshot ? { resultsSnapshot } : {}),
      updatedAt: now,
    },
    assessmentCompletedAt: record.assessmentCompletedAt ?? now,
    updatedAt: now,
  };

  // Advance onboarding assessment step when that is the current step.
  if (record.currentStep === "assessment") {
    const completedSteps: OnboardingStepId[] =
      record.completedSteps.includes("assessment")
        ? record.completedSteps
        : [...record.completedSteps, "assessment"];
    record = {
      ...record,
      completedSteps,
      currentStep: "awakening",
      status: "in_progress",
    };
  }

  const saved = await getJourneyOnboardingStore().saveOnboarding(record);
  return { status: "ok", record: saved };
}

export function getAssessmentContextSummaryForRecord(
  record: OnboardingRecord | null | undefined,
) {
  return toAlivenessContextSummary(record?.assessment);
}
