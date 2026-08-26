import { getSiteUrl } from "@/lib/auth/config";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { ensureStripeCustomerForUser } from "@/lib/billing/customer";
import { getStripe } from "@/lib/checkout/stripe";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";

export type CreateBillingPortalResult =
  | { status: "ok"; url: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "no_customer" }
  | { status: "not_configured" }
  | { status: "stripe_error"; message: string };

export async function createBillingPortalSession(input: {
  locale: Locale;
  /** Ignored — never trust client customer IDs. */
  customerId?: unknown;
}): Promise<CreateBillingPortalResult> {
  void input.customerId;

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

  try {
    const customerId = await ensureStripeCustomerForUser({
      userId: actor.user.id,
      email: actor.user.email,
    });

    if (!customerId) {
      return { status: "no_customer" };
    }

    const stripe = getStripe();
    const configurations = await stripe.billingPortal.configurations.list({
      limit: 5,
      active: true,
    });
    const configuration =
      process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim() ||
      configurations.data[0]?.id;

    if (!configuration) {
      return { status: "not_configured" };
    }

    const returnUrl = `${getSiteUrl()}${getLocalizedArchitectPath("billing", input.locale)}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      configuration,
    });

    if (!session.url) {
      return {
        status: "stripe_error",
        message: "Billing Portal session did not return a URL.",
      };
    }

    return { status: "ok", url: session.url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Billing Portal failed.";
    if (message.toLowerCase().includes("configuration")) {
      return { status: "not_configured" };
    }
    return { status: "stripe_error", message };
  }
}
