import { getAuthStore } from "@/lib/auth/store";
import type { UserRecord } from "@/lib/auth/types";
import { persistAgeEligibilityStatus } from "@/lib/eligibility/cookie";
import {
  accountIsAgeEligible,
  type AgeEligibilityDecision,
} from "@/lib/eligibility/policy";

export async function markAccountAgeEligibility(
  userId: string,
  status: AgeEligibilityDecision,
): Promise<UserRecord | undefined> {
  const confirmedAt = new Date().toISOString();
  return getAuthStore().updateUser(userId, {
    ageEligible: status === "eligible",
    ageEligibleConfirmedAt: confirmedAt,
  });
}

export async function syncAgeEligibilityCookieForUser(
  user: UserRecord | null | undefined,
): Promise<void> {
  if (!user) {
    return;
  }
  if (accountIsAgeEligible(user)) {
    await persistAgeEligibilityStatus("eligible");
  }
}

export async function applyAgeEligibilityToAccountAndCookie(
  userId: string | undefined,
  status: AgeEligibilityDecision,
): Promise<UserRecord | undefined> {
  await persistAgeEligibilityStatus(status);
  if (!userId) {
    return undefined;
  }
  return markAccountAgeEligibility(userId, status);
}
