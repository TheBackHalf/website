"use server";

import {
  AccessDeniedError,
  requirePermission,
} from "@/lib/auth/access";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getAuthStore } from "@/lib/auth/store";
import {
  reconcileUserBilling,
  type ReconcileUserBillingResult,
} from "@/lib/billing/reconcile";

export type ReconcileBillingActionResult =
  | { status: "ok"; result: ReconcileUserBillingResult }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "invalid" };

/**
 * Admin-only Stripe ↔ local billing reconciliation by email or userId.
 * Support must not receive `admin:billing:reconcile`.
 */
export async function reconcileBillingForAdmin(input: {
  email?: string;
  userId?: string;
}): Promise<ReconcileBillingActionResult> {
  try {
    await requirePermission("admin:billing:reconcile");

    const store = getAuthStore();
    let userId = input.userId?.trim() || undefined;

    if (!userId && input.email?.trim()) {
      const user = await store.findUserByEmail(normalizeEmail(input.email));
      if (!user) {
        return { status: "not_found" };
      }
      userId = user.id;
    }

    if (!userId) {
      return { status: "invalid" };
    }

    const existing = await store.findUserById(userId);
    if (!existing) {
      return { status: "not_found" };
    }

    const result = await reconcileUserBilling(userId);
    return { status: "ok", result };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return {
        status: error.code === "unauthenticated" ? "unauthorized" : "forbidden",
      };
    }
    throw error;
  }
}
