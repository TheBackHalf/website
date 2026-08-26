import { emitAnalyticsEvent } from "@/lib/analytics/emit";
import { userHasActiveEntitlement } from "@/lib/billing/entitlements";
import { getBillingStore } from "@/lib/billing/store";
import type {
  AccountAccessRecord,
  CommunitySubscriptionStatus,
} from "@/lib/billing/types";

function resolveCommunitySubscriptionStatus(
  entitlements: Awaited<
    ReturnType<ReturnType<typeof getBillingStore>["findEntitlementsByUserId"]>
  >,
): CommunitySubscriptionStatus {
  const community = entitlements.find(
    (entry) => entry.kind === "community_access",
  );
  if (!community) {
    return "none";
  }

  if (community.status === "past_due") {
    return "past_due";
  }
  if (community.status === "canceled" || community.status === "revoked") {
    return "canceled";
  }
  if (community.status === "active") {
    return "active";
  }
  if (community.status === "expired") {
    return "canceled";
  }
  return "none";
}

/**
 * Compute and persist durable account access snapshot for a user.
 */
export async function syncAccountAccessStatus(
  userId: string,
  source: string,
): Promise<AccountAccessRecord> {
  const store = getBillingStore();
  const [purchases, entitlements, journeyAccess, communityAccess] =
    await Promise.all([
      store.findPurchasesByUserId(userId),
      store.findEntitlementsByUserId(userId),
      userHasActiveEntitlement(userId, "journey_access"),
      userHasActiveEntitlement(userId, "community_access"),
    ]);

  const stripeCustomerId =
    purchases
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .find((entry) => entry.stripeCustomerId)?.stripeCustomerId ??
    entitlements
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .find((entry) => entry.stripeCustomerId)?.stripeCustomerId;

  const record: AccountAccessRecord = {
    userId,
    journeyAccess,
    communityAccess,
    hasPaidPurchase: purchases.some((entry) => entry.status === "paid"),
    hasFailedPurchase: purchases.some((entry) => entry.status === "failed"),
    hasRefundedPurchase: purchases.some(
      (entry) => entry.status === "refunded" || entry.status === "reversed",
    ),
    communitySubscriptionStatus: resolveCommunitySubscriptionStatus(entitlements),
    stripeCustomerId,
    syncedAt: new Date().toISOString(),
    source,
  };

  await store.upsertAccountAccess(record);

  await emitAnalyticsEvent({
    name: "account_access.synced",
    userId,
    idempotencyKey: `account_access.synced:${userId}:${source}:${record.syncedAt}`,
    payload: {
      source,
      journeyAccess: record.journeyAccess,
      communityAccess: record.communityAccess,
      communitySubscriptionStatus: record.communitySubscriptionStatus,
      hasPaidPurchase: record.hasPaidPurchase,
      hasFailedPurchase: record.hasFailedPurchase,
      hasRefundedPurchase: record.hasRefundedPurchase,
      stripeCustomerId: record.stripeCustomerId,
    },
  });

  return record;
}

/** Safe flags for support lookup — never includes Stripe secrets. */
export type SafeAccountAccessFlags = {
  journeyAccess: boolean;
  communityAccess: boolean;
  hasPaidPurchase: boolean;
  hasFailedPurchase: boolean;
  hasRefundedPurchase: boolean;
  communitySubscriptionStatus: CommunitySubscriptionStatus;
  syncedAt: string | null;
};

export async function getSafeAccountAccessFlags(
  userId: string,
): Promise<SafeAccountAccessFlags> {
  const existing = await getBillingStore().findAccountAccessByUserId(userId);
  if (existing) {
    return {
      journeyAccess: existing.journeyAccess,
      communityAccess: existing.communityAccess,
      hasPaidPurchase: existing.hasPaidPurchase,
      hasFailedPurchase: existing.hasFailedPurchase,
      hasRefundedPurchase: existing.hasRefundedPurchase,
      communitySubscriptionStatus: existing.communitySubscriptionStatus,
      syncedAt: existing.syncedAt,
    };
  }

  const [journeyAccess, communityAccess, purchases, entitlements] =
    await Promise.all([
      userHasActiveEntitlement(userId, "journey_access"),
      userHasActiveEntitlement(userId, "community_access"),
      getBillingStore().findPurchasesByUserId(userId),
      getBillingStore().findEntitlementsByUserId(userId),
    ]);

  return {
    journeyAccess,
    communityAccess,
    hasPaidPurchase: purchases.some((entry) => entry.status === "paid"),
    hasFailedPurchase: purchases.some((entry) => entry.status === "failed"),
    hasRefundedPurchase: purchases.some(
      (entry) => entry.status === "refunded" || entry.status === "reversed",
    ),
    communitySubscriptionStatus: resolveCommunitySubscriptionStatus(entitlements),
    syncedAt: null,
  };
}
