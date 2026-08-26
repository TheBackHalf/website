import { isAlivenessAssessmentComplete } from "@/content/journey/aliveness-index";
import { getBillingStore } from "@/lib/billing/store";
import { getAuthStore } from "@/lib/auth/store";
import {
  buildResultsSnapshot,
  isAssessmentReviewOnly,
  mergeAssessmentResponses,
} from "@/lib/journey/assessments/aliveness";
import { listMissingRequiredOnboardingConsents } from "@/lib/journey/onboarding/consent";
import {
  resolveJourneyOnboardingEligibility,
} from "@/lib/journey/onboarding/eligibility";
import {
  getJourneyOnboardingStore,
  nextStepAfter,
} from "@/lib/journey/onboarding/store";
import type {
  AlivenessRating,
  OnboardingRecord,
  OnboardingStepId,
} from "@/lib/journey/onboarding/types";
import { isOnboardingStepId } from "@/lib/journey/onboarding/types";
import { getJourneyProgressStore } from "@/lib/journey/progress";
import { recordConsentsForUser } from "@/lib/consent/record-consent";
import {
  buildConsentRecords,
  validateRequiredConsents,
} from "@/lib/consent/validation";
import type { ConsentValue } from "@/lib/consent/types";
import { setLuminaMemoryEnabledForUser } from "@/lib/lumina/memory/service";

const AWAKENING_CHAPTER_ID = "chapter-1-awakening";

export type OnboardingAccessError =
  | "unauthenticated"
  | "community_only"
  | "not_entitled"
  | "forbidden";

export type AdvanceOnboardingResult =
  | { status: "ok"; record: OnboardingRecord }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "step_locked"; currentStep: OnboardingStepId | "completed" }
  | { status: "validation_error"; message: string }
  | { status: "incomplete_assessment" }
  | { status: "consent_required"; missingDocumentIds: string[] };

function markStepComplete(
  record: OnboardingRecord,
  step: OnboardingStepId,
  now: string,
): OnboardingRecord {
  const completedSteps = record.completedSteps.includes(step)
    ? record.completedSteps
    : [...record.completedSteps, step];

  const next: OnboardingRecord = {
    ...record,
    completedSteps,
    updatedAt: now,
  };

  switch (step) {
    case "welcome":
      next.welcomeCompletedAt = record.welcomeCompletedAt ?? now;
      break;
    case "preferences":
      next.preferencesCompletedAt = record.preferencesCompletedAt ?? now;
      break;
    case "consent":
      next.consentCompletedAt = record.consentCompletedAt ?? now;
      break;
    case "lumina":
      next.luminaCompletedAt = record.luminaCompletedAt ?? now;
      break;
    case "assessment":
      next.assessmentCompletedAt = record.assessmentCompletedAt ?? now;
      break;
    case "awakening":
      next.awakeningEnteredAt = record.awakeningEnteredAt ?? now;
      break;
  }

  const following = nextStepAfter(step);
  if (following === "completed") {
    next.status = "completed";
    next.currentStep = "completed";
    next.completedAt = record.completedAt ?? now;
  } else {
    next.status = "in_progress";
    next.currentStep = following;
  }

  return next;
}

export async function loadOnboardingForEntitledUser(
  userId: string,
): Promise<
  | { status: "ok"; record: OnboardingRecord }
  | { status: "blocked"; reason: OnboardingAccessError }
> {
  const eligibility = await resolveJourneyOnboardingEligibility(userId);
  if (eligibility.status === "community_only") {
    return { status: "blocked", reason: "community_only" };
  }
  if (eligibility.status === "not_entitled") {
    return { status: "blocked", reason: "not_entitled" };
  }

  const record =
    await getJourneyOnboardingStore().getOrCreateOnboardingForUser(userId);
  return { status: "ok", record };
}

export function canAccessOnboardingStep(
  record: OnboardingRecord,
  step: OnboardingStepId,
): boolean {
  if (record.status === "completed") {
    return false;
  }
  if (record.completedSteps.includes(step)) {
    return true;
  }
  return record.currentStep === step;
}

export function resolveResumeStep(
  record: OnboardingRecord,
): OnboardingStepId | "completed" {
  if (record.status === "completed" || record.currentStep === "completed") {
    return "completed";
  }
  if (isOnboardingStepId(record.currentStep)) {
    return record.currentStep;
  }
  // Legacy records may still store removed "purchase" step — resume at welcome.
  return "welcome";
}

/** Background entitlement check — not an onboarding UI step. */
export async function hasVerifiedJourneyPurchase(
  userId: string,
): Promise<{
  verified: boolean;
  journeyAccess: boolean;
  paidPurchase: boolean;
}> {
  const eligibility = await resolveJourneyOnboardingEligibility(userId);
  if (eligibility.status !== "eligible") {
    return { verified: false, journeyAccess: false, paidPurchase: false };
  }

  const purchases = await getBillingStore().findPurchasesByUserId(userId);
  const paidPurchase = purchases.some((purchase) => purchase.status === "paid");

  // Active journey_access entitlement is authoritative (blueprint or bundle).
  return {
    verified: true,
    journeyAccess: true,
    paidPurchase,
  };
}

export async function advanceOnboardingStep(input: {
  userId: string;
  step: OnboardingStepId;
  consents?: ConsentValue[];
  assessmentResponses?: Record<string, unknown>;
  luminaMemoryEnabled?: boolean;
}): Promise<AdvanceOnboardingResult> {
  const loaded = await loadOnboardingForEntitledUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  let record = loaded.record;
  if (record.status === "completed") {
    return { status: "step_locked", currentStep: "completed" };
  }

  // Advancement is only allowed from the authoritative current step (no skipping ahead).
  if (record.currentStep !== input.step) {
    return {
      status: "step_locked",
      currentStep: record.currentStep,
    };
  }

  const now = new Date().toISOString();
  const store = getJourneyOnboardingStore();

  switch (input.step) {
    case "welcome": {
      record = markStepComplete(record, "welcome", now);
      record = await store.saveOnboarding(record);
      return { status: "ok", record };
    }
    case "preferences": {
      // Preferences persistence is handled by updateArchitectProfileAction (Row 65).
      // This step advances only after the client confirms a successful save.
      record = markStepComplete(record, "preferences", now);
      record = await store.saveOnboarding(record);
      return { status: "ok", record };
    }
    case "consent": {
      const requiredDocs = (
        await listMissingRequiredOnboardingConsents(input.userId)
      ).map((entry) => entry.document);

      if (requiredDocs.length > 0) {
        const values = input.consents ?? [];
        const errors = validateRequiredConsents(requiredDocs, values);
        if (Object.keys(errors).length > 0) {
          return {
            status: "consent_required",
            missingDocumentIds: requiredDocs.map((doc) => doc.id),
          };
        }
        const user = await getAuthStore().findUserById(input.userId);
        const records = buildConsentRecords(values, {
          userId: input.userId,
          locale: user?.locale === "es" ? "es" : "en",
        });
        await recordConsentsForUser(input.userId, records);
      }

      if (typeof input.luminaMemoryEnabled === "boolean") {
        await setLuminaMemoryEnabledForUser(
          input.userId,
          input.luminaMemoryEnabled,
        );
      }

      const stillMissing = await listMissingRequiredOnboardingConsents(
        input.userId,
      );
      if (stillMissing.length > 0) {
        return {
          status: "consent_required",
          missingDocumentIds: stillMissing.map((entry) => entry.document.id),
        };
      }

      record = markStepComplete(record, "consent", now);
      record = await store.saveOnboarding(record);
      return { status: "ok", record };
    }
    case "lumina": {
      record = markStepComplete(record, "lumina", now);
      record = await store.saveOnboarding(record);
      return { status: "ok", record };
    }
    case "assessment": {
      if (
        input.assessmentResponses &&
        !isAssessmentReviewOnly(record.assessment)
      ) {
        record = {
          ...record,
          assessment: mergeAssessmentResponses(
            record.assessment,
            input.assessmentResponses,
          ),
          updatedAt: now,
        };
        record = await store.saveOnboarding(record);
      }

      if (!isAlivenessAssessmentComplete(record.assessment.responses)) {
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
      };

      record = markStepComplete(record, "assessment", now);
      record = await store.saveOnboarding(record);
      return { status: "ok", record };
    }
    case "awakening": {
      await getJourneyProgressStore().upsertProgress({
        userId: input.userId,
        chapterId: AWAKENING_CHAPTER_ID,
        status: "in_progress",
      });
      record = markStepComplete(record, "awakening", now);
      record = await store.saveOnboarding(record);
      return { status: "ok", record };
    }
    default:
      return {
        status: "validation_error",
        message: "Unknown onboarding step.",
      };
  }
}

export async function saveAssessmentResponsesForUser(input: {
  userId: string;
  responses: Record<string, unknown>;
}): Promise<
  | { status: "ok"; record: OnboardingRecord }
  | { status: "blocked"; reason: OnboardingAccessError }
  | { status: "step_locked"; currentStep: OnboardingStepId | "completed" }
> {
  const loaded = await loadOnboardingForEntitledUser(input.userId);
  if (loaded.status !== "ok") {
    return loaded;
  }

  const record = loaded.record;

  // Completed assessment is review-only — do not overwrite baseline.
  if (isAssessmentReviewOnly(record.assessment)) {
    return { status: "step_locked", currentStep: record.currentStep };
  }

  if (record.status === "completed") {
    return { status: "step_locked", currentStep: "completed" };
  }

  // Allow saves while on assessment (or if assessment already completed but not advanced).
  const allowed =
    record.currentStep === "assessment" ||
    record.completedSteps.includes("assessment");
  if (!allowed) {
    return { status: "step_locked", currentStep: record.currentStep };
  }

  const now = new Date().toISOString();
  const next: OnboardingRecord = {
    ...record,
    assessment: mergeAssessmentResponses(record.assessment, input.responses),
    updatedAt: now,
  };
  const saved = await getJourneyOnboardingStore().saveOnboarding(next);
  return { status: "ok", record: saved };
}

export type { AlivenessRating };
