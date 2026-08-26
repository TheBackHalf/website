"use server";

import { chapterActionErrorCode } from "@/lib/journey/progress/action-error";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import type {
  Chapter2SectionId,
  MirrorReflectionQuestionId,
} from "@/content/journey/chapter-2-mirror";
import {
  advanceChapter2SectionForUser,
  saveChapter2CommitmentForUser,
  saveChapter2ReflectionForUser,
  saveMirrorExerciseForUser,
  setChapter2CurrentSectionForUser,
} from "@/lib/journey/chapters/chapter-2-service";

export type Chapter2ActionResult =
  | { status: "ok"; nextSectionId?: Chapter2SectionId; complete?: boolean }
  | { status: "error"; code: string };

export async function saveChapter2MirrorExerciseAction(input: {
  answers: Partial<{
    step1: unknown;
    step2: unknown;
    step3: unknown;
    step4: unknown;
  }>;
}): Promise<Chapter2ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveMirrorExerciseForUser({
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

export async function saveChapter2ReflectionAction(input: {
  answers: Partial<Record<MirrorReflectionQuestionId, unknown>>;
}): Promise<Chapter2ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter2ReflectionForUser({
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

export async function saveChapter2CommitmentAction(input: {
  affirmed?: unknown;
  note?: unknown;
}): Promise<Chapter2ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter2CommitmentForUser({
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

export async function advanceChapter2SectionAction(input: {
  sectionId: Chapter2SectionId;
}): Promise<Chapter2ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await advanceChapter2SectionForUser({
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

export async function setChapter2SectionAction(input: {
  sectionId: Chapter2SectionId;
}): Promise<Chapter2ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await setChapter2CurrentSectionForUser({
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
