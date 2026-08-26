import { LocaleLink } from "@/components/i18n/locale-link";
import { StatusNotice } from "@/components/design-system";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { isCheckoutOfferId } from "@/lib/checkout/offers";
import type { Locale } from "@/lib/i18n/config";

type CheckoutCancelViewProps = {
  locale: Locale;
  offerId?: string;
};

export function CheckoutCancelView({
  locale,
  offerId,
}: CheckoutCancelViewProps) {
  const checkout = getDictionary(locale).checkout;
  const retryHref = isCheckoutOfferId(offerId)
    ? `/checkout/${offerId}`
    : "/checkout";

  return (
    <div className="mx-auto max-w-2xl text-left">
      <StatusNotice variant="pending">
        <p className="font-sans text-base font-light leading-relaxed text-bh-ink">
          {checkout.cancelDescription}
        </p>
      </StatusNotice>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <LocaleLink
          href={retryHref}
          locale={locale}
          className="bh-cta inline-flex"
        >
          {translate(locale, checkout.cancelRetry)}
        </LocaleLink>
        <LocaleLink
          href="/"
          locale={locale}
          className="bh-cta bh-cta-secondary inline-flex"
        >
          {translate(locale, checkout.cancelHome)}
        </LocaleLink>
      </div>
    </div>
  );
}
