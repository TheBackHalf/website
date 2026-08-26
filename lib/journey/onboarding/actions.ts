"use server";

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import {
  advanceOnboardingStep,
  saveAssessmentResponsesForUser,
} from "@/lib/journey/onboarding/service";
import {
  isOnboardingStepId,
  type OnboardingStepId,
} from "@/lib/journey/onboarding/types";
import { documentToConsentType } from "@/lib/consent/validation";
import type { ConsentValue } from "@/lib/consent/types";

export type OnboardingActionResult =
  | { status: "ok"; currentStep: OnboardingStepId | "completed" }
  | { status: "error"; code: string; message?: string };

function mapAdvanceError(
  result: Awaited<ReturnType<typeof advanceOnboardingStep>>,
): OnboardingActionResult {
  if (result.status === "ok") {
    return { status: "ok", currentStep: result.record.currentStep };
  }
  if (result.status === "blocked") {
    return { status: "error", code: result.reason };
  }
  if (result.status === "step_locked") {
    return {
      status: "error",
      code: "step_locked",
      message: String(result.currentStep),
    };
  }
  if (result.status === "consent_required") {
    return {
      status: "error",
      code: "consent_required",
      message: result.missingDocumentIds.join(","),
    };
  }
  if (result.status === "incomplete_assessment") {
    return { status: "error", code: "incomplete_assessment" };
  }
  return {
    status: "error",
    code: "validation_error",
    message: result.message,
  };
}

export async function advanceJourneyOnboardingAction(input: {
  step: string;
  consents?: Array<{ documentId: string; accepted: boolean }>;
  assessmentResponses?: Record<string, unknown>;
  luminaMemoryEnabled?: boolean;
}): Promise<OnboardingActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  if (!isOnboardingStepId(input.step)) {
    return { status: "error", code: "invalid_step" };
  }

  const consents: ConsentValue[] | undefined = input.consents?.map((entry) => ({
    documentId: entry.documentId,
    accepted: Boolean(entry.accepted),
    consentType: documentToConsentType(entry.documentId),
  }));

  const result = await advanceOnboardingStep({
    userId: actor.user.id,
    step: input.step,
    consents,
    assessmentResponses: input.assessmentResponses,
    luminaMemoryEnabled: input.luminaMemoryEnabled,
  });

  return mapAdvanceError(result);
}

export async function saveOnboardingAssessmentAction(input: {
  responses: Record<string, unknown>;
}): Promise<OnboardingActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveAssessmentResponsesForUser({
    userId: actor.user.id,
    responses: input.responses ?? {},
  });

  if (result.status === "ok") {
    return { status: "ok", currentStep: result.record.currentStep };
  }
  if (result.status === "blocked") {
    return { status: "error", code: result.reason };
  }
  return {
    status: "error",
    code: "step_locked",
    message: String(result.currentStep),
  };
}
