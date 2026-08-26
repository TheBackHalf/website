"use server";

import {
  AccessDeniedError,
  requirePermission,
} from "@/lib/auth/access";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getAuthStore } from "@/lib/auth/store";
import { getSafeAccountAccessFlags } from "@/lib/billing/account-status";

export type SupportAccountView = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  arcCode: string;
  emailVerified: boolean;
  authProvider: string;
  locale: string;
  supportPreference: string | null;
  timeZone: string | null;
  role: string;
  /** Safe access flags only — no Stripe secrets or billing mutation. */
  journeyAccess: boolean;
  communityAccess: boolean;
  hasPaidPurchase: boolean;
  hasFailedPurchase: boolean;
  hasRefundedPurchase: boolean;
  communitySubscriptionStatus: string;
  accessSyncedAt: string | null;
};

/**
 * Minimum support lookup — excludes password hashes and all secrets.
 * Cannot mutate consent history, roles, or billing.
 */
export async function lookupAccountForSupport(
  email: string,
): Promise<
  | { status: "ok"; account: SupportAccountView }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  try {
    await requirePermission("support:accounts:lookup");
    const user = await getAuthStore().findUserByEmail(normalizeEmail(email));
    if (!user) {
      return { status: "not_found" };
    }

    const access = await getSafeAccountAccessFlags(user.id);

    return {
      status: "ok",
      account: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        arcCode: user.arcCode,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider,
        locale: user.locale,
        supportPreference: user.supportPreference ?? null,
        timeZone: user.timeZone ?? null,
        role: user.role,
        journeyAccess: access.journeyAccess,
        communityAccess: access.communityAccess,
        hasPaidPurchase: access.hasPaidPurchase,
        hasFailedPurchase: access.hasFailedPurchase,
        hasRefundedPurchase: access.hasRefundedPurchase,
        communitySubscriptionStatus: access.communitySubscriptionStatus,
        accessSyncedAt: access.syncedAt,
      },
    };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return {
        status: error.code === "unauthenticated" ? "unauthorized" : "forbidden",
      };
    }
    throw error;
  }
}

/** Explicitly blocked for support — consent history remains append-only audit data. */
export async function mutateConsentHistoryForSupport(): Promise<
  | { status: "forbidden" }
  | { status: "unauthorized" }
> {
  try {
    await requirePermission("support:accounts:lookup");
    // Support is intentionally denied mutation of consent history.
    return { status: "forbidden" };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return {
        status: error.code === "unauthenticated" ? "unauthorized" : "forbidden",
      };
    }
    throw error;
  }
}
