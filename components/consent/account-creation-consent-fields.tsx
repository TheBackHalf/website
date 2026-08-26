"use client";

import { useCallback, useState } from "react";
import {
  ConsentCheckbox,
  ConsentFieldset,
  consentStateFromDocuments,
  consentValuesFromState,
  type ConsentState,
} from "@/components/legal/consent-controls";
import {
  accountCreationConsents,
  consentRecordingPendingMessage,
} from "@/content/legal/documents";
import { recordConsents } from "@/lib/consent/record-consent";
import type { ConsentValidationErrors } from "@/lib/consent/types";
import {
  buildConsentRecords,
  documentToConsentType,
  validateRequiredConsents,
} from "@/lib/consent/validation";
import type { Locale } from "@/lib/i18n/config";

export function useAccountCreationConsent() {
  const [consents, setConsents] = useState<ConsentState>(() =>
    consentStateFromDocuments(accountCreationConsents),
  );
  const [errors, setErrors] = useState<ConsentValidationErrors>({});
  const [recordStatus, setRecordStatus] = useState<"idle" | "pending">("idle");

  const updateConsent = useCallback((documentId: string, accepted: boolean) => {
    setConsents((current) => ({ ...current, [documentId]: accepted }));
    setErrors((current) => {
      const consentType = documentToConsentType(documentId);
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
    const values = consentValuesFromState(accountCreationConsents, consents);
    const validationErrors = validateRequiredConsents(
      accountCreationConsents,
      values,
    );

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return false;
    }

    const records = buildConsentRecords(values);
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

type AccountCreationConsentFieldsProps = {
  disabled?: boolean;
  locale?: Locale;
};

/**
 * Reusable account-creation consent block.
 * Wired into registration; keep for isolated consent UI tests.
 */
export function AccountCreationConsentFields({
  disabled = false,
  locale = "en",
}: AccountCreationConsentFieldsProps) {
  const { consents, errors, recordStatus, updateConsent } =
    useAccountCreationConsent();

  return (
    <div className="bh-consent-flow">
      <ConsentFieldset legend="Account creation acknowledgments">
        {accountCreationConsents.map((document) => (
          <ConsentCheckbox
            key={document.id}
            id={`account-consent-${document.id}`}
            document={document}
            locale={locale}
            checked={Boolean(consents[document.id])}
            disabled={disabled}
            onChange={(accepted) => updateConsent(document.id, accepted)}
            error={errors[documentToConsentType(document.id)]}
          />
        ))}
      </ConsentFieldset>

      {recordStatus === "pending" ? (
        <p className="bh-consent-recording-pending" role="status">
          {consentRecordingPendingMessage}
        </p>
      ) : null}
    </div>
  );
}

export { validateRequiredConsents as validateAccountCreationConsents };
