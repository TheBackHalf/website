"use server";

import { chapterActionErrorCode } from "@/lib/journey/progress/action-error";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import type {
  Chapter3SectionId,
  DecisionReflectionQuestionId,
} from "@/content/journey/chapter-3-decision";
import {
  advanceChapter3SectionForUser,
  saveChapter3CommitmentForUser,
  saveChapter3PracticeForUser,
  saveChapter3ReflectionForUser,
  setChapter3CurrentSectionForUser,
} from "@/lib/journey/chapters/chapter-3-service";

export type Chapter3ActionResult =
  | { status: "ok"; nextSectionId?: Chapter3SectionId; complete?: boolean }
  | { status: "error"; code: string };

export async function saveChapter3ReflectionAction(input: {
  answers: Partial<Record<DecisionReflectionQuestionId, unknown>>;
}): Promise<Chapter3ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter3ReflectionForUser({
    userId: actor.user.id,
    answers: input.answers ?? {},
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      complete: result.record.status === "completed",
    };
  }
  return { status: "error", code: chapterActionErrorCode(result) };
}

export async function saveChapter3PracticeAction(input: {
  statement: unknown;
}): Promise<Chapter3ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter3PracticeForUser({
    userId: actor.user.id,
    statement: input.statement,
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      complete: result.record.status === "completed",
    };
  }
  return { status: "error", code: chapterActionErrorCode(result) };
}

export async function saveChapter3CommitmentAction(input: {
  affirmed?: unknown;
  note?: unknown;
}): Promise<Chapter3ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter3CommitmentForUser({
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
  return { status: "error", code: chapterActionErrorCode(result) };
}

export async function advanceChapter3SectionAction(input: {
  sectionId: Chapter3SectionId;
}): Promise<Chapter3ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await advanceChapter3SectionForUser({
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
    return { status: "error", code: chapterActionErrorCode(result) };
  }
  if (result.status === "incomplete_work") {
    return { status: "error", code: "incomplete_work" };
  }
  return { status: "error", code: "invalid_section" };
}

export async function setChapter3SectionAction(input: {
  sectionId: Chapter3SectionId;
}): Promise<Chapter3ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await setChapter3CurrentSectionForUser({
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
    return { status: "error", code: chapterActionErrorCode(result) };
  }
  return { status: "error", code: "invalid_section" };
}
