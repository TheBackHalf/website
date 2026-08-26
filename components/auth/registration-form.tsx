"use client";

import Link from "next/link";
import {
  ConsentCheckbox,
  ConsentFieldset,
} from "@/components/legal/consent-controls";
import {
  FormError,
  FormField,
  FormHelper,
  FormInput,
  FormLabel,
  FormPanel,
  StatusNotice,
} from "@/components/design-system";
import { accountCreationConsents } from "@/content/legal/documents";
import {
  resolveRegistrationLabel,
  translate,
} from "@/content/i18n/get-dictionary";
import { getLoginPath } from "@/lib/auth/routing";
import { useArchitectRegistration } from "@/lib/auth/registration";
import { useSearchParams } from "next/navigation";
import {
  localizedCheckoutPath,
  safeCheckoutNextPath,
} from "@/lib/checkout/safe-next";
import { documentToConsentType } from "@/lib/consent/validation";
import type { Locale } from "@/lib/i18n/config";

type RegistrationFormProps = {
  locale?: Locale;
  googleAuthEnabled: boolean;
};

export function RegistrationForm({
  locale = "en",
  googleAuthEnabled,
}: RegistrationFormProps) {
  const {
    form,
    consents,
    errors,
    consentErrors,
    submitState,
    googleState,
    googleNotice,
    googleConfigured,
    updateField,
    updateConsent,
    submitEmailRegistration,
    startGoogleRegistration,
    dictionary,
    registration,
    passwordRequirements,
  } = useArchitectRegistration(locale, { googleAuthEnabled });

  const searchParams = useSearchParams();
  const checkoutNext = safeCheckoutNextPath(searchParams.get("next"), locale);
  const loginHref = checkoutNext
    ? `${getLoginPath(locale)}?next=${encodeURIComponent(
        localizedCheckoutPath(checkoutNext, locale),
      )}`
    : getLoginPath(locale);

  const formId = "architect-registration-form";
  const firstNameId = `${formId}-first-name`;
  const lastNameId = `${formId}-last-name`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const passwordConfirmId = `${formId}-password-confirm`;

  return (
    <div className="mx-auto max-w-2xl text-left">
      {googleNotice ? (
        <StatusNotice variant="pending" className="mb-8">
          <p className="font-sans text-sm font-light leading-relaxed text-bh-ink">
            {googleNotice}
          </p>
        </StatusNotice>
      ) : null}

      <FormPanel>
        <form
          id={formId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submitEmailRegistration();
          }}
          lang={locale === "es" ? "es" : "en"}
        >
          <input type="hidden" name="locale" value={locale} />

          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 [&>.bh-form-field]:mt-0">
            <FormField>
              <FormLabel htmlFor={firstNameId}>{registration.firstName}</FormLabel>
              <FormInput
                id={firstNameId}
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={
                  errors.firstName ? `${firstNameId}-error` : undefined
                }
                hasError={Boolean(errors.firstName)}
              />
              {errors.firstName ? (
                <FormError id={`${firstNameId}-error`}>{errors.firstName}</FormError>
              ) : null}
            </FormField>

            <FormField>
              <FormLabel htmlFor={lastNameId}>{registration.lastName}</FormLabel>
              <FormInput
                id={lastNameId}
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={
                  errors.lastName ? `${lastNameId}-error` : undefined
                }
                hasError={Boolean(errors.lastName)}
              />
              {errors.lastName ? (
                <FormError id={`${lastNameId}-error`}>{errors.lastName}</FormError>
              ) : null}
            </FormField>
          </div>

          <FormField className="mt-6">
            <FormLabel htmlFor={emailId}>{dictionary.forms.email}</FormLabel>
            <FormInput
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${emailId}-error` : undefined}
              hasError={Boolean(errors.email)}
            />
            {errors.email ? (
              <FormError id={`${emailId}-error`}>{errors.email}</FormError>
            ) : null}
          </FormField>

          <FormField className="mt-6">
            <FormLabel htmlFor={passwordId}>{registration.password}</FormLabel>
            <FormInput
              id={passwordId}
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={`${passwordId}-help${errors.password ? ` ${passwordId}-error` : ""}`}
              hasError={Boolean(errors.password)}
            />
            <FormHelper id={`${passwordId}-help`}>{passwordRequirements}</FormHelper>
            {errors.password ? (
              <FormError id={`${passwordId}-error`}>{errors.password}</FormError>
            ) : null}
          </FormField>

          <FormField className="mt-6">
            <FormLabel htmlFor={passwordConfirmId}>
              {registration.passwordConfirm}
            </FormLabel>
            <FormInput
              id={passwordConfirmId}
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              value={form.passwordConfirm}
              onChange={(event) =>
                updateField("passwordConfirm", event.target.value)
              }
              aria-invalid={Boolean(errors.passwordConfirm)}
              aria-describedby={
                errors.passwordConfirm ? `${passwordConfirmId}-error` : undefined
              }
              hasError={Boolean(errors.passwordConfirm)}
            />
            {errors.passwordConfirm ? (
              <FormError id={`${passwordConfirmId}-error`}>
                {errors.passwordConfirm}
              </FormError>
            ) : null}
          </FormField>

          <div className="mt-8">
            <ConsentFieldset legend={registration.consentLegend}>
              {accountCreationConsents.map((document) => (
                <ConsentCheckbox
                  key={document.id}
                  id={`registration-consent-${document.id}`}
                  document={document}
                  locale={locale}
                  checked={Boolean(consents[document.id])}
                  disabled={submitState === "submitting" || googleState === "loading"}
                  onChange={(accepted) => updateConsent(document.id, accepted)}
                  error={consentErrors[documentToConsentType(document.id)]}
                />
              ))}
            </ConsentFieldset>
            {errors.consent ? (
              <FormError className="mt-3">
                {errors.consent}
              </FormError>
            ) : null}
          </div>

          {errors.form ? (
            <StatusNotice variant="pending" className="mt-8">
              <p className="font-sans text-sm font-light leading-relaxed text-bh-ink">
                {errors.form}
              </p>
            </StatusNotice>
          ) : null}

          <div className="mt-8 flex flex-col gap-4">
            <button
              type="submit"
              disabled={submitState === "submitting" || googleState === "loading"}
              className="bh-cta w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              aria-busy={submitState === "submitting"}
            >
              {submitState === "submitting"
                ? registration.submitting
                : resolveRegistrationLabel(locale, "createAccount")}
            </button>

            {googleConfigured ? (
              <button
                type="button"
                disabled={submitState === "submitting" || googleState === "loading"}
                onClick={() => void startGoogleRegistration()}
                className="bh-cta bh-cta-secondary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                aria-busy={googleState === "loading"}
              >
                {googleState === "loading"
                  ? dictionary.common.submitting
                  : resolveRegistrationLabel(locale, "continueWithGoogle")}
              </button>
            ) : null}

            <p className="font-sans text-sm font-light text-bh-muted">
              <Link
                href={loginHref}
                className="underline underline-offset-4 transition hover:text-bh-ink"
              >
                {translate(locale, registration.alreadyHaveAccount)}
              </Link>
            </p>
          </div>
        </form>
      </FormPanel>
    </div>
  );
}
