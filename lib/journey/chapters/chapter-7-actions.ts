"use server";

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import type {
  BeginningReflectionQuestionId,
  Chapter7SectionId,
} from "@/content/journey/chapter-7-beginning";
import {
  advanceChapter7SectionForUser,
  saveChapter7CommitmentForUser,
  saveChapter7PracticeForUser,
  saveChapter7ReflectionForUser,
  setChapter7CurrentSectionForUser,
} from "@/lib/journey/chapters/chapter-7-service";

export type Chapter7ActionResult =
  | { status: "ok"; nextSectionId?: Chapter7SectionId; complete?: boolean }
  | { status: "error"; code: string };

export async function saveChapter7ReflectionAction(input: {
  answers: Partial<Record<BeginningReflectionQuestionId, unknown>>;
}): Promise<Chapter7ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter7ReflectionForUser({
    userId: actor.user.id,
    answers: input.answers ?? {},
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      complete: result.record.status === "completed",
    };
  }
  return { status: "error", code: result.reason };
}

export async function saveChapter7PracticeAction(input: {
  statement?: unknown;
  signature?: unknown;
  signedDate?: unknown;
}): Promise<Chapter7ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter7PracticeForUser({
    userId: actor.user.id,
    statement: input.statement,
    signature: input.signature,
    signedDate: input.signedDate,
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      complete: result.record.status === "completed",
    };
  }
  return { status: "error", code: result.reason };
}

export async function saveChapter7CommitmentAction(input: {
  affirmed?: unknown;
  note?: unknown;
}): Promise<Chapter7ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter7CommitmentForUser({
    userId: actor.user.id,
    affirmed: input.affirmed,
    note: input.note,
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      complete: result.record.status === "completed",
    };
  }
  return { status: "error", code: result.reason };
}

export async function advanceChapter7SectionAction(input: {
  sectionId: Chapter7SectionId;
}): Promise<Chapter7ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await advanceChapter7SectionForUser({
    userId: actor.user.id,
    sectionId: input.sectionId,
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      nextSectionId: result.nextSectionId,
      complete: result.record.status === "completed",
    };
  }
  if (result.status === "blocked") {
    return { status: "error", code: result.reason };
  }
  if (result.status === "incomplete_work") {
    return { status: "error", code: "incomplete_work" };
  }
  return { status: "error", code: "invalid_section" };
}

export async function setChapter7SectionAction(input: {
  sectionId: Chapter7SectionId;
}): Promise<Chapter7ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await setChapter7CurrentSectionForUser({
    userId: actor.user.id,
    sectionId: input.sectionId,
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      nextSectionId: result.record.currentSectionId,
      complete: result.record.status === "completed",
    };
  }
  if (result.status === "blocked") {
    return { status: "error", code: result.reason };
  }
  return { status: "error", code: "invalid_section" };
}
