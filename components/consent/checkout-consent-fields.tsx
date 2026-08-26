"use client";

import { useCallback, useState } from "react";
import {
  BillingConsentCheckbox,
  ConsentCheckbox,
  ConsentFieldset,
  consentStateFromDocuments,
  consentValuesFromState,
  type ConsentState,
} from "@/components/legal/consent-controls";
import {
  checkoutConsents,
  consentRecordingPendingMessage,
  consentValidationMessage,
} from "@/content/legal/documents";
import { recordConsents } from "@/lib/consent/record-consent";
import type { ConsentValidationErrors } from "@/lib/consent/types";
import {
  buildConsentRecords,
  documentToConsentType,
  validateRequiredConsents,
} from "@/lib/consent/validation";
import type { Locale } from "@/lib/i18n/config";

const BILLING_CONSENT_ID = "billing-subscription";

export function useCheckoutConsent() {
  const [consents, setConsents] = useState<ConsentState>(() => ({
    ...consentStateFromDocuments(checkoutConsents),
    [BILLING_CONSENT_ID]: false,
  }));
  const [errors, setErrors] = useState<ConsentValidationErrors>({});
  const [recordStatus, setRecordStatus] = useState<"idle" | "pending">("idle");

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
    setRecordStatus("idle");
  }, []);

  const validateAndRecord = useCallback(async (): Promise<boolean> => {
    const documentValues = consentValuesFromState(checkoutConsents, consents);
    const validationErrors = validateRequiredConsents(
      checkoutConsents,
      documentValues,
    );

    if (!consents[BILLING_CONSENT_ID]) {
      validationErrors.billing_subscription = consentValidationMessage;
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return false;
    }

    const records = buildConsentRecords(documentValues);
    const result = await recordConsents(records);

    if (result.status === "pending") {
      setRecordStatus("pending");
    }

    return true;
  }, [consents]);

  return {
    consents,
    errors,
    recordStatus,
    updateConsent,
    validateAndRecord,
  };
}

type CheckoutConsentFieldsProps = {
  disabled?: boolean;
  locale?: Locale;
};

/**
 * Reusable checkout consent block.
 * Wired into `/checkout/[offer]` via `CheckoutOfferForm` (Row 68).
 */
export function CheckoutConsentFields({
  disabled = false,
  locale = "en",
}: CheckoutConsentFieldsProps) {
  const { consents, errors, recordStatus, updateConsent } = useCheckoutConsent();

  return (
    <div className="bh-consent-flow">
      <ConsentFieldset legend="Checkout acknowledgments">
        {checkoutConsents.map((document) => (
          <ConsentCheckbox
            key={document.id}
            id={`checkout-consent-${document.id}`}
            document={document}
            locale={locale}
            checked={Boolean(consents[document.id])}
            disabled={disabled}
            onChange={(accepted) => updateConsent(document.id, accepted)}
            error={errors[documentToConsentType(document.id)]}
          />
        ))}

        <BillingConsentCheckbox
          id="checkout-consent-billing"
          checked={Boolean(consents[BILLING_CONSENT_ID])}
          onChange={(accepted) => updateConsent(BILLING_CONSENT_ID, accepted)}
          error={errors.billing_subscription}
        />
      </ConsentFieldset>

      {recordStatus === "pending" ? (
        <p className="bh-consent-recording-pending" role="status">
          {consentRecordingPendingMessage}
        </p>
      ) : null}
    </div>
  );
}

export { validateRequiredConsents as validateCheckoutConsents };
