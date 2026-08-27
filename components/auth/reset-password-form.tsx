"use client";

import Link from "next/link";
import {
  FormError,
  FormField,
  FormHelper,
  FormInput,
  FormLabel,
  FormPanel,
  StatusNotice,
} from "@/components/design-system";
import { translate } from "@/content/i18n/get-dictionary";
import { getForgotPasswordPath, getLoginPath } from "@/lib/auth/routing";
import { useResetPassword } from "@/lib/auth/reset-password";
import type { Locale } from "@/lib/i18n/config";

type ResetPasswordFormProps = {
  locale?: Locale;
  token: string;
  tokenStatus: "valid" | "invalid" | "expired" | "used" | "missing";
};

export function ResetPasswordForm({
  locale = "en",
  token,
  tokenStatus,
}: ResetPasswordFormProps) {
  const {
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    errors,
    submitState,
    submit,
    tokenMessage,
    tokenValid,
    copy,
    passwordRequirements,
    submitLabel,
    dictionary,
  } = useResetPassword(locale, token, tokenStatus);

  const formId = "architect-reset-password-form";
  const passwordId = `${formId}-password`;
  const passwordConfirmId = `${formId}-password-confirm`;

  if (!tokenValid) {
    return (
      <div className="mx-auto max-w-2xl text-left">
        <StatusNotice variant="error">
          <p className="font-sans text-sm font-light leading-relaxed text-bh-ink">
            {tokenMessage}
          </p>
        </StatusNotice>
        <p className="mt-8 font-sans text-sm font-light text-bh-muted">
          <Link
            href={getForgotPasswordPath(locale)}
            className="inline-flex min-h-11 items-center underline underline-offset-4 transition hover:text-bh-ink"
          >
            {translate(locale, dictionary.forgotPassword.submit)}
          </Link>
          {" · "}
          <Link
            href={getLoginPath(locale)}
            className="inline-flex min-h-11 items-center underline underline-offset-4 transition hover:text-bh-ink"
          >
            {translate(locale, dictionary.forgotPassword.backToLogin)}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl text-left">
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
            <FormLabel htmlFor={passwordId}>{copy.newPassword}</FormLabel>
            <FormInput
              id={passwordId}
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={`${passwordId}-help${
                errors.password ? ` ${passwordId}-error` : ""
              }`}
              hasError={Boolean(errors.password)}
            />
            <FormHelper id={`${passwordId}-help`}>
              {passwordRequirements}
            </FormHelper>
            {errors.password ? (
              <FormError id={`${passwordId}-error`}>{errors.password}</FormError>
            ) : null}
          </FormField>

          <FormField className="mt-6">
            <FormLabel htmlFor={passwordConfirmId}>
              {copy.confirmPassword}
            </FormLabel>
            <FormInput
              id={passwordConfirmId}
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
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
              disabled={submitState === "submitting"}
              className="bh-cta w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              aria-busy={submitState === "submitting"}
            >
              {submitState === "submitting" ? copy.submitting : submitLabel}
            </button>

            <p className="font-sans text-sm font-light text-bh-muted">
              <Link
                href={getLoginPath(locale)}
                className="inline-flex min-h-11 items-center underline underline-offset-4 transition hover:text-bh-ink"
              >
                {translate(locale, dictionary.forgotPassword.backToLogin)}
              </Link>
            </p>
          </div>
        </form>
      </FormPanel>
    </div>
  );
}
