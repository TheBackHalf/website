"use server";

import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import type {
  Chapter6SectionId,
  ExpansionPracticeId,
  ExpansionReflectionQuestionId,
} from "@/content/journey/chapter-6-expansion";
import {
  advanceChapter6SectionForUser,
  saveChapter6CommitmentForUser,
  saveChapter6PracticeForUser,
  saveChapter6ReflectionForUser,
  setChapter6CurrentSectionForUser,
} from "@/lib/journey/chapters/chapter-6-service";

export type Chapter6ActionResult =
  | { status: "ok"; nextSectionId?: Chapter6SectionId; complete?: boolean }
  | { status: "error"; code: string };

export async function saveChapter6ReflectionAction(input: {
  answers: Partial<Record<ExpansionReflectionQuestionId, unknown>>;
}): Promise<Chapter6ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter6ReflectionForUser({
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

export async function saveChapter6PracticeAction(input: {
  answers: Partial<Record<ExpansionPracticeId, unknown>>;
}): Promise<Chapter6ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter6PracticeForUser({
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

export async function saveChapter6CommitmentAction(input: {
  affirmed?: unknown;
  note?: unknown;
}): Promise<Chapter6ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await saveChapter6CommitmentForUser({
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

export async function advanceChapter6SectionAction(input: {
  sectionId: Chapter6SectionId;
}): Promise<Chapter6ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await advanceChapter6SectionForUser({
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

export async function setChapter6SectionAction(input: {
  sectionId: Chapter6SectionId;
}): Promise<Chapter6ActionResult> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const result = await setChapter6CurrentSectionForUser({
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
