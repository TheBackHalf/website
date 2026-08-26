import { userHasActiveEntitlement } from "@/lib/billing/entitlements";
import { getEntitlementSnapshot } from "@/lib/billing/access";
import { getJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import type { OnboardingRecord } from "@/lib/journey/onboarding/types";

export type JourneyOnboardingEligibility =
  | { status: "eligible"; journeyAccess: true; communityAccess: boolean }
  | {
      status: "community_only";
      journeyAccess: false;
      communityAccess: true;
    }
  | {
      status: "not_entitled";
      journeyAccess: false;
      communityAccess: boolean;
    };

/**
 * Journey onboarding requires `journey_access` (blueprint or bundle).
 * Community-only accounts are explicitly blocked.
 */
export async function resolveJourneyOnboardingEligibility(
  userId: string,
): Promise<JourneyOnboardingEligibility> {
  const snapshot = await getEntitlementSnapshot(userId);
  if (snapshot.journeyAccess) {
    return {
      status: "eligible",
      journeyAccess: true,
      communityAccess: snapshot.communityAccess,
    };
  }
  if (snapshot.communityAccess) {
    return {
      status: "community_only",
      journeyAccess: false,
      communityAccess: true,
    };
  }
  return {
    status: "not_entitled",
    journeyAccess: false,
    communityAccess: false,
  };
}

export async function userHasJourneyAccess(userId: string): Promise<boolean> {
  return userHasActiveEntitlement(userId, "journey_access");
}

export async function getOnboardingStateForUser(
  userId: string,
): Promise<OnboardingRecord | null> {
  const trimmed = userId.trim();
  if (!trimmed) {
    return null;
  }
  const record = await getJourneyOnboardingStore().findOnboardingForUser(
    trimmed,
  );
  return record ?? null;
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const record = await getOnboardingStateForUser(userId);
  return record?.status === "completed";
}
