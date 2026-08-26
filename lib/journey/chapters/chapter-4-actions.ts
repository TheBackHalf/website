"use server";

import { chapterActionErrorCode } from "@/lib/journey/progress/action-error";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import type {
  Chapter4SectionId,
  StandardsPracticeId,
  StandardsReflectionQuestionId,
} from "@/content/journey/chapter-4-standards";
import {
  advanceChapter4SectionForUser,
  saveChapter4CommitmentForUser,
  saveChapter4PracticeForUser,
  saveChapter4ReflectionForUser,
  setChapter4CurrentSectionForUser,
} from "@/lib/journey/chapters/chapter-4-service";

export type Chapter4ActionResult =
  | { status: "ok"; nextSectionId?: Chapter4SectionId; complete?: boolean }
  | { status: "error"; code: string };

export async function saveChapter4ReflectionAction(input: {
  answers: Partial<Record<StandardsReflectionQuestionId, unknown>>;
}): Promise<Chapter4ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter4ReflectionForUser({
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

export async function saveChapter4PracticeAction(input: {
  answers: Partial<Record<StandardsPracticeId, unknown>>;
}): Promise<Chapter4ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter4PracticeForUser({
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

export async function saveChapter4CommitmentAction(input: {
  affirmed?: unknown;
  note?: unknown;
}): Promise<Chapter4ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter4CommitmentForUser({
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

export async function advanceChapter4SectionAction(input: {
  sectionId: Chapter4SectionId;
}): Promise<Chapter4ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await advanceChapter4SectionForUser({
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

export async function setChapter4SectionAction(input: {
  sectionId: Chapter4SectionId;
}): Promise<Chapter4ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await setChapter4CurrentSectionForUser({
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
