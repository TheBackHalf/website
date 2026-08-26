"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LocaleLink } from "@/components/i18n/locale-link";
import { StatusNotice } from "@/components/design-system";
import { resendVerificationEmailAction } from "@/lib/auth/actions/resend-verification";
import {
  getDictionary,
  translate,
} from "@/content/i18n/get-dictionary";
import {
  checkoutCatalogPath,
  safeCheckoutNextPath,
} from "@/lib/checkout/safe-next";
import type { Locale } from "@/lib/i18n/config";

type RegistrationConfirmationViewProps = {
  locale?: Locale;
};

function RegistrationConfirmationContent({
  locale = "en",
}: RegistrationConfirmationViewProps) {
  const dictionary = getDictionary(locale);
  const registration = dictionary.registration;
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const choosePathHref =
    safeCheckoutNextPath(searchParams.get("next"), locale) ??
    checkoutCatalogPath();
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  async function handleResend() {
    if (!email) {
      return;
    }

    setResendState("sending");
    const result = await resendVerificationEmailAction(email);

    if (result.status === "sent") {
      setResendState("sent");
      return;
    }

    setResendState("error");
  }

  return (
    <div className="mx-auto max-w-2xl text-left">
      <StatusNotice variant="pending">
        <h2 className="font-display text-2xl font-medium text-bh-ink">
          {translate(locale, registration.confirmationTitle)}
        </h2>
        <p className="mt-4 font-sans text-sm font-light leading-relaxed text-bh-muted">
          {translate(locale, registration.confirmationDescription)}
        </p>
        {email ? (
          <p className="mt-4 font-sans text-sm text-bh-ink">
            <span className="font-medium">{dictionary.forms.email}:</span> {email}
          </p>
        ) : null}
      </StatusNotice>

      {email ? (
        <div className="mt-8">
          <button
            type="button"
            className="bh-cta bh-cta-secondary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={resendState === "sending" || resendState === "sent"}
            onClick={() => void handleResend()}
            aria-busy={resendState === "sending"}
          >
            {resendState === "sending"
              ? dictionary.common.submitting
              : registration.confirmationResend}
          </button>

          {resendState === "sent" ? (
            <p className="mt-4 font-sans text-sm text-bh-muted" role="status">
              {registration.confirmationResent}
            </p>
          ) : null}
        </div>
      ) : null}

      <LocaleLink
        href={choosePathHref}
        locale={locale}
        className="bh-cta mt-10 inline-flex"
        data-bh-cta="become_architect"
      >
        {translate(locale, registration.choosePathCta)}
      </LocaleLink>
    </div>
  );
}

export function RegistrationConfirmationView(props: RegistrationConfirmationViewProps) {
  return (
    <Suspense fallback={null}>
      <RegistrationConfirmationContent {...props} />
    </Suspense>
  );
}
