"use client";

import { useCallback, useState, useTransition } from "react";
import {
  BillingConsentCheckbox,
  ConsentCheckbox,
  ConsentFieldset,
  consentStateFromDocuments,
  consentValuesFromState,
  type ConsentState,
} from "@/components/legal/consent-controls";
import { FormError, FormPanel } from "@/components/design-system";
import { checkoutConsents } from "@/content/legal/documents";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { startCheckoutAction } from "@/lib/checkout/actions";
import {
  formatOfferPrice,
  getCheckoutOffer,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";
import { getCheckoutPurchaseTerms } from "@/lib/checkout/purchase-terms";
import type { ConsentValidationErrors } from "@/lib/consent/types";
import { documentToConsentType } from "@/lib/consent/validation";
import type { Locale } from "@/lib/i18n/config";

const BILLING_CONSENT_ID = "billing-subscription";
const ATTRIBUTION_STORAGE_KEY = "bh-mkt-attr";

function readStoredAttribution(): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

type CheckoutOfferFormProps = {
  offerId: CheckoutOfferId;
  locale: Locale;
};

export function CheckoutOfferForm({ offerId, locale }: CheckoutOfferFormProps) {
  const dictionary = getDictionary(locale);
  const checkout = dictionary.checkout;
  const offer = getCheckoutOffer(offerId);

  const [consents, setConsents] = useState<ConsentState>(() => ({
    ...consentStateFromDocuments(checkoutConsents),
    [BILLING_CONSENT_ID]: false,
  }));
  const [errors, setErrors] = useState<ConsentValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateConsent = useCallback((documentId: string, accepted: boolean) => {
    setConsents((current) => ({ ...current, [documentId]: accepted }));
    setErrors((current) => {
      const consentType =
        documentId === BILLING_CONSENT_ID
          ? "billing_subscription"
          : documentToConsentType(documentId);
      if (!current[consentType]) {
        return current;
      }
      const next = { ...current };
      delete next[consentType];
      return next;
    });
    setFormError(null);
  }, []);

  const onSubmit = () => {
    setFormError(null);
    const documentValues = consentValuesFromState(checkoutConsents, consents);
    const nextErrors: ConsentValidationErrors = {};

    for (const document of checkoutConsents) {
      if (!consents[document.id]) {
        nextErrors[documentToConsentType(document.id)] =
          checkout.consentRequired;
      }
    }

    if (!consents[BILLING_CONSENT_ID]) {
      nextErrors.billing_subscription = checkout.consentRequired;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    startTransition(async () => {
      const result = await startCheckoutAction({
        offerId,
        consents: documentValues,
        billingAccepted: Boolean(consents[BILLING_CONSENT_ID]),
        locale,
        attribution: readStoredAttribution(),
      });

      if (result.status === "ok") {
        window.location.assign(result.url);
        return;
      }

      if (result.status === "unauthenticated") {
        setFormError(checkout.signInRequired);
        return;
      }

      if (result.status === "age_ineligible") {
        setFormError(checkout.ageIneligible);
        window.location.assign(locale === "es" ? "/es/not-eligible" : "/not-eligible");
        return;
      }

      if (result.status === "consent_required") {
        setFormError(checkout.consentRequired);
        return;
      }

      if (result.status === "not_configured") {
        setFormError(checkout.notConfigured);
        return;
      }

      if (result.status === "price_mismatch" || result.status === "invalid_offer") {
        setFormError(checkout.priceMismatch);
        return;
      }

      setFormError(checkout.genericError);
    });
  };

  const offerName =
    offerId === "blueprint"
      ? checkout.offerBlueprintName
      : offerId === "bundle"
        ? checkout.offerBundleName
        : checkout.offerCommunityName;

  const offerDescription =
    offerId === "blueprint"
      ? checkout.offerBlueprintDescription
      : offerId === "bundle"
        ? checkout.offerBundleDescription
        : checkout.offerCommunityDescription;

  return (
    <div className="mx-auto max-w-2xl text-left">
      <div className="mb-10">
        <p className="bh-eyebrow">{dictionary.common.siteName}</p>
        <h2 className="bh-heading mt-4 text-3xl md:text-4xl">{offerName}</h2>
        <p className="mt-4 font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
          {offerDescription}
        </p>
        <p className="mt-4 font-sans text-sm font-light text-bh-muted">
          {checkout.eligibilityDisclosure}
        </p>
        <p className="mt-3 font-sans text-sm font-light text-bh-muted">
          {checkout.refundPolicy}
        </p>
        <p className="mt-6 font-display text-2xl text-bh-ink md:text-3xl">
          {formatOfferPrice(offer)}
        </p>
        <p className="mt-2 font-sans text-sm uppercase tracking-[0.18em] text-bh-muted">
          {offer.mode === "subscription" ? checkout.monthly : checkout.oneTime}
        </p>
        <div className="mt-8 rounded-2xl border border-bh-purple/15 bg-white/70 p-5">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
            Purchase terms
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-sans text-sm font-light leading-relaxed text-bh-ink">
            {getCheckoutPurchaseTerms(offerId).map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </div>
      </div>

      <FormPanel>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          lang={locale === "es" ? "es" : "en"}
        >
          <div className="bh-consent-flow">
            <ConsentFieldset legend={checkout.consentLegend}>
              {checkoutConsents.map((document) => (
                <ConsentCheckbox
                  key={document.id}
                  id={`checkout-consent-${document.id}`}
                  document={document}
                  locale={locale}
                  checked={Boolean(consents[document.id])}
                  disabled={isPending}
                  onChange={(accepted) => updateConsent(document.id, accepted)}
                  error={errors[documentToConsentType(document.id)]}
                />
              ))}
              <BillingConsentCheckbox
                id="checkout-consent-billing"
                checked={Boolean(consents[BILLING_CONSENT_ID])}
                onChange={(accepted) =>
                  updateConsent(BILLING_CONSENT_ID, accepted)
                }
                error={errors.billing_subscription}
              />
            </ConsentFieldset>
          </div>

          {formError ? (
            <FormError className="mt-6">{formError}</FormError>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="bh-cta mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending
              ? checkout.submitting
              : translate(locale, checkout.continueToPayment)}
          </button>
        </form>
      </FormPanel>
    </div>
  );
}
