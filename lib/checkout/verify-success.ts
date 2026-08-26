import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getEntitlementSnapshot } from "@/lib/billing/access";
import {
  getCheckoutOffer,
  isCheckoutOfferId,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";
import {
  getStripe,
  isStripeConfigured,
} from "@/lib/checkout/stripe";

export type VerifiedCheckoutSuccess =
  | {
      status: "ok";
      offerId: CheckoutOfferId;
      offerName: string;
      mode: "payment" | "subscription";
      stripeSessionId: string;
      paymentStatus: string;
      /** True only after Row 69 webhook entitlement provisioning. */
      accessProvisioned: boolean;
      journeyAccess: boolean;
      communityAccess: boolean;
    }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "invalid_session" }
  | { status: "incomplete" }
  | { status: "not_configured" };

/**
 * Success pages must verify payment with Stripe — never trust URL params alone.
 */
export async function verifyCheckoutSuccess(
  sessionId: string | undefined,
): Promise<VerifiedCheckoutSuccess> {
  if (!sessionId?.startsWith("cs_")) {
    return { status: "invalid_session" };
  }

  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return {
        status:
          error.code === "unauthenticated" ? "unauthenticated" : "forbidden",
      };
    }
    throw error;
  }

  if (!isStripeConfigured()) {
    return { status: "not_configured" };
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    const metadataUserId = session.metadata?.bh_user_id;
    const referenceId = session.client_reference_id;

    if (
      metadataUserId !== actor.user.id &&
      referenceId !== actor.user.id
    ) {
      return { status: "forbidden" };
    }

    const offerIdRaw = session.metadata?.bh_offer_id;
    if (!isCheckoutOfferId(offerIdRaw)) {
      return { status: "invalid_session" };
    }

    const offer = getCheckoutOffer(offerIdRaw);
    const completed =
      session.status === "complete" &&
      (session.payment_status === "paid" ||
        session.payment_status === "no_payment_required");

    if (!completed) {
      return { status: "incomplete" };
    }

    const entitlements = await getEntitlementSnapshot(actor.user.id);

    return {
      status: "ok",
      offerId: offerIdRaw,
      offerName: offer.name,
      mode: offer.mode,
      stripeSessionId: session.id,
      paymentStatus: session.payment_status ?? "unknown",
      accessProvisioned:
        entitlements.journeyAccess || entitlements.communityAccess,
      journeyAccess: entitlements.journeyAccess,
      communityAccess: entitlements.communityAccess,
    };
  } catch {
    return { status: "invalid_session" };
  }
}
