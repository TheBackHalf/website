import type { CheckoutOfferId } from "@/lib/checkout/offers";
import { getConfiguredStripePriceId } from "@/lib/checkout/offers";
import { getBillingStore } from "@/lib/billing/store";
import type {
  EntitlementKind,
  EntitlementRecord,
  EntitlementStatus,
} from "@/lib/billing/types";

export function addOneYear(isoDate: string): string {
  const date = new Date(isoDate);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString();
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
    const endsAt =
      kind === "community_access"
        ? input.communityEndsAt ??
          (input.offerId === "bundle" ? addOneYear(grantedAt) : undefined)
        : undefined;

    // Idempotent: if bundle community already exists with endsAt, do not extend.
    const existing = await store.findEntitlementByUserAndKind(
      input.userId,
      kind,
    );

    if (
      existing &&
      input.offerId === "bundle" &&
      kind === "community_access" &&
      existing.sourceOfferId === "bundle" &&
      existing.endsAt &&
      existing.stripeCheckoutSessionId === input.stripeCheckoutSessionId
    ) {
      results.push(existing);
      continue;
    }

    if (
      existing &&
      existing.stripeCheckoutSessionId === input.stripeCheckoutSessionId &&
      existing.status === "active"
    ) {
      results.push(existing);
      continue;
    }

    const record = await store.upsertEntitlement({
      userId: input.userId,
      kind,
      status: input.status ?? "active",
      sourceOfferId: input.offerId,
      stripeCustomerId: input.stripeCustomerId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripePriceId: input.stripePriceId,
      grantedAt: existing?.grantedAt ?? grantedAt,
      startsAt: existing?.startsAt ?? grantedAt,
      endsAt:
        kind === "community_access"
          ? existing?.sourceOfferId === "bundle" && existing.endsAt
            ? existing.endsAt
            : endsAt
          : undefined,
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

  if (entitlements.length === 0 && input.userId) {
    entitlements = await store.findEntitlementsByUserId(input.userId);
  }

  const now = new Date().toISOString();
  let count = 0;
  for (const entitlement of entitlements) {
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
