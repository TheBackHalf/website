import { LocaleLink } from "@/components/i18n/locale-link";
import type { LegalDocument } from "@/content/legal/documents";
import {
  getConsentLabelParts,
  getLegalDocumentHref,
  BILLING_PURCHASE_ACKNOWLEDGMENT,
} from "@/content/legal/documents";
import { getLegalTitle } from "@/content/legal/titles-es";
import { documentToConsentType } from "@/lib/consent/validation";
import type { ConsentType } from "@/lib/consent/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type ConsentCheckboxProps = {
  id: string;
  document: LegalDocument;
  checked: boolean;
  onChange: (accepted: boolean) => void;
  error?: string;
  disabled?: boolean;
  locale?: Locale;
};

export function ConsentCheckbox({
  id,
  document,
  checked,
  onChange,
  error,
  disabled = false,
  locale = "en",
}: ConsentCheckboxProps) {
  const errorId = `${id}-error`;
  const label = getConsentLabelParts(document.id);

  return (
    <div className="bh-consent-item">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="bh-consent-checkbox mt-1 shrink-0"
        />
        <label htmlFor={id} className="bh-consent-label" lang="en">
          {label ? (
            <>
              {label.prefix}
              <LocaleLink
                href={getLegalDocumentHref(document.slug)}
                locale={locale}
                className="bh-legal-link"
              >
                {label.title}
              </LocaleLink>
              {label.suffix}
            </>
          ) : (
            <LocaleLink
              href={getLegalDocumentHref(document.slug)}
              locale={locale}
              className="bh-legal-link"
            >
              {getLegalTitle(document.slug, locale, document.title)}
            </LocaleLink>
          )}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="bh-form-error ml-7" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type ConsentFieldsetProps = {
  legend: string;
  children: React.ReactNode;
  className?: string;
  /** Keep legend for accessibility but hide it visually (e.g. page already has a Consent heading). */
  hideLegend?: boolean;
};

export function ConsentFieldset({
  legend,
  children,
  className,
  hideLegend = false,
}: ConsentFieldsetProps) {
  return (
    <fieldset className={cn("bh-consent-fieldset", className)}>
      <legend className={cn("bh-consent-legend", hideLegend && "sr-only")}>
        {legend}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

export type ConsentState = Record<string, boolean>;

export function consentStateFromDocuments(
  documents: readonly LegalDocument[],
): ConsentState {
  return Object.fromEntries(documents.map((document) => [document.id, false]));
}

export function consentValuesFromState(
  documents: readonly LegalDocument[],
  state: ConsentState,
) {
  return documents.map((document) => ({
    consentType: documentToConsentType(document.id) as ConsentType,
    documentId: document.id,
    accepted: Boolean(state[document.id]),
  }));
}

export function BillingConsentCheckbox({
  id,
  checked,
  onChange,
  error,
}: {
  id: string;
  checked: boolean;
  onChange: (accepted: boolean) => void;
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="bh-consent-item">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="bh-consent-checkbox mt-1 shrink-0"
        />
        <label htmlFor={id} className="bh-consent-label" lang="en">
          {BILLING_PURCHASE_ACKNOWLEDGMENT}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="bh-form-error ml-7" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
