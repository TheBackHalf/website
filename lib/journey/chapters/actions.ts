"use server";

import { chapterActionErrorCode } from "@/lib/journey/progress/action-error";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import type {
  AlivenessProjectQuestionId,
  AwakeningReflectionQuestionId,
  Chapter1SectionId,
} from "@/content/journey/chapter-1-awakening";
import {
  advanceChapter1SectionForUser,
  saveAlivenessProjectForUser,
  saveChapter1CommitmentForUser,
  saveChapter1ReflectionForUser,
  setChapter1CurrentSectionForUser,
} from "@/lib/journey/chapters/service";

export type Chapter1ActionResult =
  | { status: "ok"; nextSectionId?: Chapter1SectionId; complete?: boolean }
  | { status: "error"; code: string };

export async function saveChapter1AlivenessProjectAction(input: {
  answers: Partial<Record<AlivenessProjectQuestionId, unknown>>;
}): Promise<Chapter1ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveAlivenessProjectForUser({
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

export async function saveChapter1ReflectionAction(input: {
  answers: Partial<Record<AwakeningReflectionQuestionId, unknown>>;
}): Promise<Chapter1ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter1ReflectionForUser({
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

export async function saveChapter1CommitmentAction(input: {
  affirmed?: unknown;
  note?: unknown;
}): Promise<Chapter1ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter1CommitmentForUser({
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

export async function advanceChapter1SectionAction(input: {
  sectionId: Chapter1SectionId;
}): Promise<Chapter1ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await advanceChapter1SectionForUser({
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
  if (result.status === "incomplete_exercise") {
    return { status: "error", code: "incomplete_exercise" };
  }
  return { status: "error", code: "invalid_section" };
}

export async function setChapter1SectionAction(input: {
  sectionId: Chapter1SectionId;
}): Promise<Chapter1ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await setChapter1CurrentSectionForUser({
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
