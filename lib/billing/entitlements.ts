import type { CheckoutOfferId } from "@/lib/checkout/offers";
import { getConfiguredStripePriceId } from "@/lib/checkout/offers";
import { getBillingStore } from "@/lib/billing/store";
import type {
  EntitlementKind,
  EntitlementRecord,
  EntitlementStatus,
} from "@/lib/billing/types";

/**
 * Founder-approved Architect Community launch and Founding Architect window.
 * Not first year / twelve months. Access is exclusive of the end instant.
 */
export const ARCHITECT_COMMUNITY_LAUNCH_AT = "2026-10-25T00:00:00.000Z";
export const FOUNDING_ARCHITECT_COMMUNITY_ENDS_AT =
  "2027-04-26T00:00:00.000Z";

export function laterIso(left: string, right: string): string {
  return left > right ? left : right;
}

export function communityStartsAt(grantedAt: string): string {
  return laterIso(grantedAt, ARCHITECT_COMMUNITY_LAUNCH_AT);
}

export function foundingArchitectCommunityEndsAt(): string {
  return FOUNDING_ARCHITECT_COMMUNITY_ENDS_AT;
}

export function isEntitlementCurrentlyActive(
  entitlement: EntitlementRecord | undefined,
  now = new Date(),
): boolean {
  if (!entitlement) {
    return false;
  }

  const starts = new Date(entitlement.startsAt);
  if (Number.isFinite(starts.getTime()) && starts.getTime() > now.getTime()) {
    return false;
  }

  const withinPaidTerm =
    !entitlement.endsAt ||
    (Number.isFinite(new Date(entitlement.endsAt).getTime()) &&
      new Date(entitlement.endsAt).getTime() > now.getTime());

  if (!withinPaidTerm) {
    return false;
  }

  // Active unlocks. Canceled-at-period-end retains access through endsAt.
  // past_due / revoked / expired never unlock.
  if (entitlement.status === "active") {
    return true;
  }

  if (entitlement.status === "canceled" && entitlement.endsAt) {
    return true;
  }

  return false;
}

export async function userHasActiveEntitlement(
  userId: string,
  kind: EntitlementKind,
): Promise<boolean> {
  const entitlement = await getBillingStore().findEntitlementByUserAndKind(
    userId,
    kind,
  );

  if (!entitlement) {
    return false;
  }

  // Lazy expire without destroying history.
  if (
    entitlement.status === "active" &&
    entitlement.endsAt &&
    new Date(entitlement.endsAt).getTime() <= Date.now()
  ) {
    await getBillingStore().upsertEntitlement({
      ...entitlement,
      status: "expired",
      reason: "term_ended",
    });
    return false;
  }

  return isEntitlementCurrentlyActive(entitlement);
}

export function offerGrants(offerId: CheckoutOfferId): EntitlementKind[] {
  switch (offerId) {
    case "blueprint":
      return ["journey_access"];
    case "bundle":
      return ["journey_access", "community_access"];
    case "community":
      return ["community_access"];
    default:
      return [];
  }
}

export function resolveOfferIdFromPriceId(
  priceId: string | null | undefined,
): CheckoutOfferId | undefined {
  if (!priceId) {
    return undefined;
  }

  if (priceId === getConfiguredStripePriceId("blueprint")) {
    return "blueprint";
  }
  if (priceId === getConfiguredStripePriceId("bundle")) {
    return "bundle";
  }
  if (priceId === getConfiguredStripePriceId("community")) {
    return "community";
  }
  return undefined;
}

export async function grantOfferEntitlements(input: {
  userId: string;
  offerId: CheckoutOfferId;
  eventId: string;
  stripeCustomerId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  grantedAt?: string;
  communityEndsAt?: string;
  status?: EntitlementStatus;
}): Promise<EntitlementRecord[]> {
  const store = getBillingStore();
  const grantedAt = input.grantedAt ?? new Date().toISOString();
  const kinds = offerGrants(input.offerId);
  const results: EntitlementRecord[] = [];

  for (const kind of kinds) {
    const existing = await store.findEntitlementByUserAndKind(
      input.userId,
      kind,
    );

    // Duplicate webhook for the same checkout must not extend or rewrite.
    if (
      existing &&
      input.stripeCheckoutSessionId &&
      existing.stripeCheckoutSessionId === input.stripeCheckoutSessionId &&
      existing.status === "active"
    ) {
      results.push(existing);
      continue;
    }

    const journeyLifetime = kind === "journey_access";
    let endsAt: string | undefined;
    if (!journeyLifetime) {
      if (input.offerId === "bundle") {
        // Duplicate bundle events keep the original included window.
        endsAt =
          existing?.sourceOfferId === "bundle" && existing.endsAt
            ? existing.endsAt
            : foundingArchitectCommunityEndsAt();
      } else if (input.communityEndsAt) {
        // Paid Community subscription may extend past the included window.
        endsAt =
          existing?.sourceOfferId === "bundle" && existing.endsAt
            ? laterIso(existing.endsAt, input.communityEndsAt)
            : input.communityEndsAt;
      } else {
        endsAt = existing?.endsAt;
      }
    }

    const record = await store.upsertEntitlement({
      userId: input.userId,
      kind,
      status: input.status ?? "active",
      sourceOfferId:
        input.offerId === "community" || !existing
          ? input.offerId
          : existing.sourceOfferId,
      stripeCustomerId: input.stripeCustomerId ?? existing?.stripeCustomerId,
      stripeCheckoutSessionId:
        input.stripeCheckoutSessionId ?? existing?.stripeCheckoutSessionId,
      stripePaymentIntentId:
        input.stripePaymentIntentId ?? existing?.stripePaymentIntentId,
      stripeSubscriptionId:
        input.stripeSubscriptionId ?? existing?.stripeSubscriptionId,
      stripePriceId: input.stripePriceId ?? existing?.stripePriceId,
      grantedAt: existing?.grantedAt ?? grantedAt,
      startsAt:
        existing?.startsAt ??
        (journeyLifetime ? grantedAt : communityStartsAt(grantedAt)),
      endsAt,
      sourceEventId: input.eventId,
      reason: `grant:${input.offerId}`,
    });
    results.push(record);
  }

  return results;
}

export async function revokeEntitlementsForPayment(input: {
  userId?: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  chargeId?: string;
  eventId: string;
  reason: string;
  offerId?: CheckoutOfferId;
}): Promise<number> {
  const store = getBillingStore();
  let entitlements: EntitlementRecord[] = [];

  if (input.checkoutSessionId) {
    entitlements = await store.findEntitlementsByCheckoutSessionId(
      input.checkoutSessionId,
    );
  } else if (input.paymentIntentId) {
    entitlements = await store.findEntitlementsByPaymentIntentId(
      input.paymentIntentId,
    );
  }

  // Never fall back to every entitlement on the account. That path can
  // accidentally revoke lifetime Blueprint / Journey access after an
  // unrelated Community refund or unmatched charge.
  void input.userId;
  void input.chargeId;

  if (input.offerId) {
    const allowed = new Set(offerGrants(input.offerId));
    entitlements = entitlements.filter((entry) => allowed.has(entry.kind));
  }

  const now = new Date().toISOString();
  let count = 0;
  for (const entitlement of entitlements) {
    if (
      entitlement.kind === "journey_access" &&
      input.offerId === "community"
    ) {
      continue;
    }
    await store.upsertEntitlement({
      ...entitlement,
      status: "revoked",
      revokedAt: now,
      sourceEventId: input.eventId,
      reason: input.reason,
    });
    count += 1;
  }
  return count;
}
