"use server";

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import type {
  ArchitectReflectionQuestionId,
  Chapter5SectionId,
} from "@/content/journey/chapter-5-architect";
import {
  advanceChapter5SectionForUser,
  saveChapter5CommitmentForUser,
  saveChapter5PracticeForUser,
  saveChapter5ReflectionForUser,
  setChapter5CurrentSectionForUser,
} from "@/lib/journey/chapters/chapter-5-service";

export type Chapter5ActionResult =
  | { status: "ok"; nextSectionId?: Chapter5SectionId; complete?: boolean }
  | { status: "error"; code: string };

export async function saveChapter5ReflectionAction(input: {
  answers: Partial<Record<ArchitectReflectionQuestionId, unknown>>;
}): Promise<Chapter5ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter5ReflectionForUser({
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

export async function saveChapter5PracticeAction(input: {
  statement: unknown;
}): Promise<Chapter5ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter5PracticeForUser({
    userId: actor.user.id,
    statement: input.statement,
  });

  if (result.status === "ok") {
    return {
      status: "ok",
      complete: result.record.status === "completed",
    };
  }
  return { status: "error", code: result.reason };
}

export async function saveChapter5CommitmentAction(input: {
  affirmed?: unknown;
  note?: unknown;
}): Promise<Chapter5ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter5CommitmentForUser({
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

export async function advanceChapter5SectionAction(input: {
  sectionId: Chapter5SectionId;
}): Promise<Chapter5ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await advanceChapter5SectionForUser({
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

export async function setChapter5SectionAction(input: {
  sectionId: Chapter5SectionId;
}): Promise<Chapter5ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await setChapter5CurrentSectionForUser({
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
