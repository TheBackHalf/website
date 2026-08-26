"use server";

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import {
  completeAlivenessAssessmentForUser,
  saveAlivenessAssessmentForUser,
} from "@/lib/journey/assessments/service";

export type AssessmentActionResult =
  | { status: "ok"; complete: boolean }
  | { status: "error"; code: string };

export async function saveAlivenessAssessmentAction(input: {
  responses: Record<string, unknown>;
}): Promise<AssessmentActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveAlivenessAssessmentForUser({
    userId: actor.user.id,
    responses: input.responses ?? {},
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      complete: Boolean(result.record.assessment.resultsSnapshot),
    };
  }
  if (result.status === "blocked") {
    return { status: "error", code: result.reason };
  }
  if (result.status === "review_only") {
    return { status: "error", code: "review_only" };
  }
  return { status: "error", code: "step_locked" };
}

export async function completeAlivenessAssessmentAction(input: {
  responses: Record<string, unknown>;
}): Promise<AssessmentActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await completeAlivenessAssessmentForUser({
    userId: actor.user.id,
    responses: input.responses ?? {},
  });

  if (result.status === "ok" || result.status === "review_only") {
    return {
      status: "ok",
      complete: Boolean(result.record.assessment.resultsSnapshot),
    };
  }
  if (result.status === "blocked") {
    return { status: "error", code: result.reason };
  }
  return { status: "error", code: "incomplete_assessment" };
}
