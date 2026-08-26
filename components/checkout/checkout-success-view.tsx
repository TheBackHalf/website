import { LocaleLink } from "@/components/i18n/locale-link";
import { StatusNotice } from "@/components/design-system";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import type { VerifiedCheckoutSuccess } from "@/lib/checkout/verify-success";
import type { Locale } from "@/lib/i18n/config";

type CheckoutSuccessViewProps = {
  locale: Locale;
  result: VerifiedCheckoutSuccess;
};

export function CheckoutSuccessView({
  locale,
  result,
}: CheckoutSuccessViewProps) {
  const checkout = getDictionary(locale).checkout;

  if (result.status === "ok") {
    const nextHref = result.journeyAccess
      ? "/architect/onboarding"
      : "/architect/dashboard";
    const nextLabel = result.journeyAccess
      ? checkout.successNextStepOnboarding
      : checkout.successNextStep;

    return (
      <div className="mx-auto max-w-2xl text-left">
        <StatusNotice variant="success">
          <p className="font-sans text-base font-light leading-relaxed text-bh-ink">
            {checkout.successDescription}
          </p>
        </StatusNotice>

        <dl className="mt-10 space-y-4">
          <div>
            <dt className="bh-eyebrow">{checkout.successOfferLabel}</dt>
            <dd className="mt-2 font-display text-2xl text-bh-ink md:text-3xl">
              {result.offerName}
            </dd>
          </div>
        </dl>

        <p className="mt-8 font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
          {checkout.successAccessPending}
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <LocaleLink
            href={nextHref}
            locale={locale}
            className="bh-cta inline-flex"
          >
            {nextLabel}
          </LocaleLink>
          <LocaleLink
            href="/checkout"
            locale={locale}
            className="bh-cta bh-cta-secondary inline-flex"
          >
            {translate(locale, checkout.returnOffers)}
          </LocaleLink>
        </div>
      </div>
    );
  }

  const message =
    result.status === "incomplete"
      ? checkout.successIncomplete
      : result.status === "unauthenticated"
        ? checkout.signInRequired
        : checkout.successInvalid;

  return (
    <div className="mx-auto max-w-2xl text-left">
      <StatusNotice variant="pending">
        <p className="font-sans text-base font-light leading-relaxed text-bh-ink">
          {message}
        </p>
      </StatusNotice>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <LocaleLink
          href="/checkout"
          locale={locale}
          className="bh-cta inline-flex"
        >
          {translate(locale, checkout.cancelRetry)}
        </LocaleLink>
        <LocaleLink
          href="/architect/dashboard"
          locale={locale}
          className="bh-cta bh-cta-secondary inline-flex"
        >
          {translate(locale, checkout.returnDashboard)}
        </LocaleLink>
      </div>
    </div>
  );
}
