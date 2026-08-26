"use server";

import { AccessDeniedError, requireAuthenticatedUser } from "@/lib/auth/access";
import { getAuthStore } from "@/lib/auth/store";
import { accountIsAgeEligible } from "@/lib/eligibility/policy";
import { getAiKimberlyStore } from "@/lib/ai-kimberly/store";
import type { LoadAiKimberlyConversationResult } from "@/lib/ai-kimberly/types";

export async function loadAiKimberlyConversationForUser(
  userId: string,
): Promise<LoadAiKimberlyConversationResult> {
  const user = await getAuthStore().findUserById(userId);
  if (!accountIsAgeEligible(user)) {
    return { status: "error", code: "age_ineligible" };
  }

  const conversation =
    await getAiKimberlyStore().getOrCreateConversationForUser(userId);
  return { status: "ok", conversation };
}

export async function loadAiKimberlyConversationAction(): Promise<LoadAiKimberlyConversationResult> {
  try {
    const actor = await requireAuthenticatedUser();
    return loadAiKimberlyConversationForUser(actor.user.id);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "unauthenticated" };
    }
    return { status: "error", code: "send_failed" };
  }
}
