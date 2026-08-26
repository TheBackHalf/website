"use client";

import Link from "next/link";
import {
  FormError,
  FormField,
  FormInput,
  FormLabel,
  FormPanel,
  StatusNotice,
} from "@/components/design-system";
import { useForgotPassword } from "@/lib/auth/forgot-password";
import { getLoginPath } from "@/lib/auth/routing";
import type { Locale } from "@/lib/i18n/config";

type ForgotPasswordFormProps = {
  locale?: Locale;
};

export function ForgotPasswordForm({ locale = "en" }: ForgotPasswordFormProps) {
  const {
    email,
    setEmail,
    error,
    submitState,
    submit,
    copy,
    acceptedMessage,
    submitLabel,
    backToLoginLabel,
    dictionary,
  } = useForgotPassword(locale);

  const formId = "architect-forgot-password-form";
  const emailId = `${formId}-email`;

  return (
    <div className="mx-auto max-w-2xl text-left">
      {submitState === "accepted" ? (
        <StatusNotice variant="success" className="mb-8">
          <p className="font-sans text-sm font-light leading-relaxed text-bh-ink">
            {acceptedMessage}
          </p>
        </StatusNotice>
      ) : null}

      <FormPanel>
        <form
          id={formId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          lang={locale === "es" ? "es" : "en"}
        >
          <FormField>
            <FormLabel htmlFor={emailId}>{dictionary.forms.email}</FormLabel>
            <FormInput
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${emailId}-error` : undefined}
              hasError={Boolean(error)}
            />
            {error ? <FormError id={`${emailId}-error`}>{error}</FormError> : null}
          </FormField>

          <div className="mt-8 flex flex-col gap-4">
            <button
              type="submit"
              disabled={submitState === "submitting"}
              className="bh-cta w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              aria-busy={submitState === "submitting"}
            >
              {submitState === "submitting" ? copy.submitting : submitLabel}
            </button>

            <p className="font-sans text-sm font-light text-bh-muted">
              <Link
                href={getLoginPath(locale)}
                className="underline underline-offset-4 transition hover:text-bh-ink"
              >
                {backToLoginLabel}
              </Link>
            </p>
          </div>
        </form>
      </FormPanel>
    </div>
  );
}
