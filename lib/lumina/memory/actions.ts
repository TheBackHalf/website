"use server";

import {
  AccessDeniedError,
  requirePermission,
} from "@/lib/auth/access";
import {
  clearLuminaMemoryForUserResult,
  getLuminaMemoryBundleResultForUser,
  setLuminaMemoryEnabledForUser,
  writeLuminaMemoryForUser,
} from "@/lib/lumina/memory/service";
import { getLuminaMemoryStore } from "@/lib/lumina/memory/store";
import { toLuminaMemoryControlsView } from "@/lib/lumina/memory/retrieve";
import type {
  ClearLuminaMemoryResult,
  GetLuminaMemoryBundleResult,
  LuminaMemoryControlsView,
  LuminaMemoryWriteInput,
  SetLuminaMemoryEnabledResult,
  WriteLuminaMemoryResult,
} from "@/lib/lumina/memory/types";

/**
 * Owner-only memory actions.
 * Always scoped to the authenticated actor — never accepts a target userId
 * (support/admin have no cross-account private-memory access).
 */

async function requireOwnMemoryActor() {
  return requirePermission("architect:lumina_memory:manage_own");
}

export async function getLuminaMemoryBundleAction(): Promise<GetLuminaMemoryBundleResult> {
  try {
    const actor = await requireOwnMemoryActor();
    return getLuminaMemoryBundleResultForUser(actor.user.id);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return error.code === "unauthenticated"
        ? { status: "unauthenticated" }
        : { status: "forbidden" };
    }
    return { status: "error", message: "Unable to load memory." };
  }
}

export async function getLuminaMemoryControlsAction(): Promise<
  | { status: "ok"; controls: LuminaMemoryControlsView }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error" }
> {
  try {
    const actor = await requireOwnMemoryActor();
    const memory = await getLuminaMemoryStore().findMemoryForUser(
      actor.user.id,
    );
    return {
      status: "ok",
      controls: toLuminaMemoryControlsView(memory),
    };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return error.code === "unauthenticated"
        ? { status: "unauthenticated" }
        : { status: "forbidden" };
    }
    return { status: "error" };
  }
}

export async function setLuminaMemoryEnabledAction(input: {
  enabled: unknown;
}): Promise<SetLuminaMemoryEnabledResult> {
  try {
    const actor = await requireOwnMemoryActor();
    if (typeof input.enabled !== "boolean") {
      return { status: "error", message: "Invalid enabled value." };
    }
    return setLuminaMemoryEnabledForUser(actor.user.id, input.enabled);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return error.code === "unauthenticated"
        ? { status: "unauthenticated" }
        : { status: "forbidden" };
    }
    return { status: "error", message: "Unable to update memory preference." };
  }
}

export async function writeLuminaMemoryAction(
  input: LuminaMemoryWriteInput,
): Promise<WriteLuminaMemoryResult> {
  try {
    const actor = await requireOwnMemoryActor();
    return writeLuminaMemoryForUser(actor.user.id, input);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return error.code === "unauthenticated"
        ? { status: "unauthenticated" }
        : { status: "forbidden" };
    }
    return { status: "error", message: "Unable to write memory." };
  }
}

export async function clearLuminaMemoryAction(): Promise<ClearLuminaMemoryResult> {
  try {
    const actor = await requireOwnMemoryActor();
    return clearLuminaMemoryForUserResult(actor.user.id);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return error.code === "unauthenticated"
        ? { status: "unauthenticated" }
        : { status: "forbidden" };
    }
    return { status: "error", message: "Unable to clear memory." };
  }
}
