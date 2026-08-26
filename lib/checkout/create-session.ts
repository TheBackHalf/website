import { getSiteUrl } from "@/lib/auth/config";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { recordConsentsForUser } from "@/lib/consent/record-consent";
import type { ConsentValue } from "@/lib/consent/types";
import {
  buildConsentRecords,
  validateRequiredConsents,
} from "@/lib/consent/validation";
import { checkoutConsents } from "@/content/legal/documents";
import type { Locale } from "@/lib/i18n/config";
import {
  getCheckoutOffer,
  isCheckoutOfferId,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";
import { authorizeCheckoutPriceSelection } from "@/lib/checkout/authorize-price";
import {
  getStripe,
  isStripeConfigured,
} from "@/lib/checkout/stripe";
import {
  attributionToStripeMetadata,
  parseAttributionFromUnknown,
  unknownAttribution,
} from "@/lib/marketing-kpi/attribution";
import { recordCheckoutStart } from "@/lib/marketing-kpi/collect";
import { trackProductEvent } from "@/lib/analytics/track";
import { accountIsAgeEligible } from "@/lib/eligibility/policy";

export type CreateCheckoutSessionInput = {
  offerId: unknown;
  consents: ConsentValue[];
  billingAccepted: boolean;
  locale: Locale;
  /**
   * Rejected if present — clients must never supply Stripe price IDs or amounts.
   */
  priceId?: unknown;
  amount?: unknown;
  userId?: unknown;
  /** First-party campaign attribution. Sanitized server-side. */
  attribution?: unknown;
};

export type CreateCheckoutSessionResult =
  | { status: "ok"; url: string; sessionId: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "invalid_offer" }
  | { status: "consent_required" }
  | { status: "not_configured" }
  | { status: "price_mismatch" }
  | { status: "age_ineligible" }
  | { status: "stripe_error"; message: string };

function localizedCheckoutPath(
  path: `/checkout/${string}`,
  locale: Locale,
): string {
  return locale === "es" ? `/es${path}` : path;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  // Explicitly ignore any client-supplied identity, price, or amount.
  void input.priceId;
  void input.amount;
  void input.userId;

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

  if (!accountIsAgeEligible(actor.user)) {
    return { status: "age_ineligible" };
  }

  if (!isCheckoutOfferId(input.offerId)) {
    return { status: "invalid_offer" };
  }

  const offerId: CheckoutOfferId = input.offerId;
  const offer = getCheckoutOffer(offerId);

  const priceAuthorization = authorizeCheckoutPriceSelection({
    offerId,
    clientPriceId: input.priceId,
    clientAmount:
      typeof input.amount === "number" ? input.amount : undefined,
  });

  if (priceAuthorization.status === "invalid_offer") {
    return { status: "invalid_offer" };
  }

  if (priceAuthorization.status === "not_configured") {
    return { status: "not_configured" };
  }

  // Document acknowledgments are validated from checkoutConsents.
  // Billing acknowledgment is tracked separately via billingAccepted.
  const consentErrors = validateRequiredConsents(
    checkoutConsents,
    input.consents,
  );

  if (!input.billingAccepted) {
    consentErrors.billing_subscription =
      "Required acknowledgment has not been provided.";
  }

  if (Object.keys(consentErrors).length > 0) {
    return { status: "consent_required" };
  }

  if (!isStripeConfigured()) {
    return { status: "not_configured" };
  }

  const configuredPriceId = priceAuthorization.priceId;
  const stripe = getStripe();
  const attribution = input.attribution
    ? parseAttributionFromUnknown(input.attribution)
    : unknownAttribution();

  try {
    const price = await stripe.prices.retrieve(configuredPriceId);

    if (price.unit_amount !== offer.amountCents) {
      return { status: "price_mismatch" };
    }

    if (price.currency !== offer.currency) {
      return { status: "price_mismatch" };
    }

    if (offer.mode === "subscription") {
      if (price.type !== "recurring" || price.recurring?.interval !== "month") {
        return { status: "price_mismatch" };
      }
    } else if (price.type !== "one_time") {
      return { status: "price_mismatch" };
    }

    const consentRecords = buildConsentRecords(input.consents, {
      userId: actor.user.id,
      locale: input.locale,
    });

    if (input.billingAccepted) {
      consentRecords.push({
        consentType: "billing_subscription",
        documentId: "billing-subscription",
        consentedAt: new Date().toISOString(),
        userId: actor.user.id,
        locale: input.locale,
        documentVersion: "checkout-billing-acknowledgment",
      });
    }

    await recordConsentsForUser(actor.user.id, consentRecords);

    const siteUrl = getSiteUrl();
    const successPath = localizedCheckoutPath(
      `/checkout/success?offer=${offerId}`,
      input.locale,
    );
    const cancelPath = localizedCheckoutPath(
      `/checkout/cancel?offer=${offerId}`,
      input.locale,
    );

    const session = await stripe.checkout.sessions.create({
      mode: offer.mode,
      // Card-only at launch — no coupons, no installment/BNPL methods.
      payment_method_types: ["card"],
      line_items: [{ price: configuredPriceId, quantity: 1 }],
      success_url: `${siteUrl}${successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${cancelPath}`,
      client_reference_id: actor.user.id,
      customer_email: actor.user.email,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      locale: input.locale === "es" ? "es" : "en",
      metadata: {
        bh_user_id: actor.user.id,
        bh_offer_id: offerId,
        bh_locale: input.locale,
        ...attributionToStripeMetadata(attribution),
      },
      ...(offer.mode === "subscription"
        ? {
            subscription_data: {
              metadata: {
                bh_user_id: actor.user.id,
                bh_offer_id: offerId,
              },
            },
          }
        : {
            payment_intent_data: {
              metadata: {
                bh_user_id: actor.user.id,
                bh_offer_id: offerId,
              },
            },
          }),
      custom_text: {
        submit: {
          message:
            input.locale === "es"
              ? "The Back Half — el pago confirma la compra. El acceso se habilita después del procesamiento."
              : "The Back Half — payment confirms purchase. Access is enabled after processing.",
        },
      },
    });

    if (!session.url) {
      return {
        status: "stripe_error",
        message: "Checkout session did not return a redirect URL.",
      };
    }

    try {
      await recordCheckoutStart({
        attribution,
        stripeCheckoutSessionId: session.id,
        test: session.id.startsWith("cs_test_"),
      });
      await trackProductEvent({
        name: "checkout_started",
        userId: actor.user.id,
        productArea: "checkout",
        locale: input.locale,
        attribution,
        idempotencyKey: `checkout_started:${session.id}`,
        payload: {
          offerId,
          stripeCheckoutSessionId: session.id,
          amountCents: offer.amountCents,
          currency: offer.currency,
        },
      });
    } catch {
      // Marketing KPI / product analytics must not block a successful Stripe checkout.
    }

    return {
      status: "ok",
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe checkout failed.";
    await trackProductEvent({
      name: "checkout_failed",
      userId: actor.user.id,
      productArea: "checkout",
      locale: input.locale,
      attribution,
      idempotencyKey: `checkout_failed:${actor.user.id}:${Date.now()}`,
      payload: { offerId, errorCategory: "stripe_error" },
    });
    return { status: "stripe_error", message };
  }
}
