import {
  toArchitectProfileView,
  toConsentHistoryItems,
  type ArchitectProfileView,
  type ConsentHistoryItem,
} from "@/lib/account/profile";
import {
  AccessDeniedError,
  assertSameArchitectOrAdmin,
  requirePermission,
} from "@/lib/auth/access";
import { getAuthStore } from "@/lib/auth/store";

export async function getArchitectProfileForSession(): Promise<ArchitectProfileView | null> {
  try {
    const actor = await requirePermission("architect:profile:read_own");
    assertSameArchitectOrAdmin(actor, actor.sessionSub);
    return toArchitectProfileView(actor.user);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return null;
    }
    throw error;
  }
}

export async function getConsentHistoryForSession(): Promise<ConsentHistoryItem[]> {
  try {
    const actor = await requirePermission("architect:consent:read_own");
    assertSameArchitectOrAdmin(actor, actor.sessionSub);
    const records = await getAuthStore().findConsentRecordsByUserId(
      actor.sessionSub,
    );
    return toConsentHistoryItems(records);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return [];
    }
    throw error;
  }
}

/** Cross-account probe — always denied for Architects. */
export async function getArchitectProfileByUserIdForSession(
  userId: string,
): Promise<ArchitectProfileView | null> {
  try {
    const actor = await requirePermission("architect:profile:read_own");
    assertSameArchitectOrAdmin(actor, userId);
    const user = await getAuthStore().findUserById(userId);
    return user ? toArchitectProfileView(user) : null;
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return null;
    }
    throw error;
  }
}
