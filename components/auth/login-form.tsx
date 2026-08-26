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
import { useArchitectLogin } from "@/lib/auth/login";
import {
  getForgotPasswordPath,
  getRegistrationPath,
} from "@/lib/auth/routing";
import type { Locale } from "@/lib/i18n/config";

type LoginFormProps = {
  locale?: Locale;
  googleAuthEnabled: boolean;
};

export function LoginForm({
  locale = "en",
  googleAuthEnabled,
}: LoginFormProps) {
  const {
    form,
    errors,
    submitState,
    googleState,
    googleNotice,
    resetNotice,
    googleConfigured,
    updateField,
    submitEmailLogin,
    startGoogleLogin,
    dictionary,
    login,
    signInLabel,
    continueWithGoogleLabel,
    forgotPasswordLabel,
    createAccountLabel,
  } = useArchitectLogin(locale, { googleAuthEnabled });

  const formId = "architect-login-form";
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;

  return (
    <div className="mx-auto max-w-2xl text-left">
      {resetNotice ? (
        <StatusNotice variant="pending" className="mb-8">
          <p className="font-sans text-sm font-light leading-relaxed text-bh-ink">
            {resetNotice}
          </p>
        </StatusNotice>
      ) : null}

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
            void submitEmailLogin();
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
            <FormLabel htmlFor={passwordId}>
              {dictionary.registration.password}
            </FormLabel>
            <FormInput
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? `${passwordId}-error` : undefined
              }
              hasError={Boolean(errors.password)}
            />
            {errors.password ? (
              <FormError id={`${passwordId}-error`}>{errors.password}</FormError>
            ) : null}
          </FormField>

          <p className="mt-4 font-sans text-sm font-light text-bh-muted">
            <Link
              href={getForgotPasswordPath(locale)}
              className="underline underline-offset-4 transition hover:text-bh-ink"
            >
              {forgotPasswordLabel}
            </Link>
          </p>

          {errors.form ? (
            <StatusNotice variant="error" className="mt-8">
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
              {submitState === "submitting" ? login.submitting : signInLabel}
            </button>

            {googleConfigured ? (
              <button
                type="button"
                disabled={submitState === "submitting" || googleState === "loading"}
                onClick={() => startGoogleLogin()}
                className="bh-cta bh-cta-secondary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                aria-busy={googleState === "loading"}
              >
                {googleState === "loading"
                  ? dictionary.common.submitting
                  : continueWithGoogleLabel}
              </button>
            ) : null}

            <p className="font-sans text-sm font-light text-bh-muted">
              <Link
                href={getRegistrationPath(locale)}
                className="underline underline-offset-4 transition hover:text-bh-ink"
              >
                {createAccountLabel}
              </Link>
            </p>
          </div>
        </form>
      </FormPanel>
    </div>
  );
}
