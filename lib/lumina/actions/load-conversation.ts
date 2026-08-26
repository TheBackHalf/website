"use server";

import { AccessDeniedError, requireAuthenticatedUser } from "@/lib/auth/access";
import { getAuthStore } from "@/lib/auth/store";
import { accountIsAgeEligible } from "@/lib/eligibility/policy";
import { getLuminaStore } from "@/lib/lumina/store";
import type { LoadLuminaConversationResult } from "@/lib/lumina/types";

export async function loadLuminaConversationForUser(
  userId: string,
): Promise<LoadLuminaConversationResult> {
  const user = await getAuthStore().findUserById(userId);
  if (!accountIsAgeEligible(user)) {
    return { status: "error", code: "age_ineligible" };
  }

  const conversation =
    await getLuminaStore().getOrCreateConversationForUser(userId);
  const { trackProductEvent } = await import("@/lib/analytics/track");
  await trackProductEvent({
    name: "lumina_opened",
    userId,
    productArea: "lumina",
    idempotencyKey: `lumina_opened:${userId}:${conversation.id}`,
    payload: { conversationId: conversation.id },
  });
  await trackProductEvent({
    name: "lumina_session_started",
    userId,
    productArea: "lumina",
    idempotencyKey: `lumina_session_started:${conversation.id}`,
    payload: { conversationId: conversation.id },
  });
  return { status: "ok", conversation };
}

export async function loadLuminaConversationAction(): Promise<LoadLuminaConversationResult> {
  try {
    const actor = await requireAuthenticatedUser();
    return loadLuminaConversationForUser(actor.user.id);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "unauthenticated" };
    }
    return { status: "error", code: "send_failed" };
  }
}
