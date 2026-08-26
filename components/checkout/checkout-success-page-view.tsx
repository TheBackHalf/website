import { CheckoutSuccessView } from "@/components/checkout/checkout-success-view";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import type { VerifiedCheckoutSuccess } from "@/lib/checkout/verify-success";
import type { Locale } from "@/lib/i18n/config";

type CheckoutSuccessPageViewProps = {
  locale: Locale;
  result: VerifiedCheckoutSuccess;
};

export function checkoutSuccessHeading(
  locale: Locale,
  result: VerifiedCheckoutSuccess,
): string {
  const checkout = getDictionary(locale).checkout;
  if (result.status === "ok") {
    return translate(locale, checkout.successTitle);
  }
  return checkout.unverifiedTitle;
}

export function CheckoutSuccessPageView({
  locale,
  result,
}: CheckoutSuccessPageViewProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <SkipLink href="#checkout-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="checkout-main" className="min-h-screen bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {checkoutSuccessHeading(locale, result)}
          </SectionHeading>
        </PageHero>

        <SectionShell
          id="checkout-success"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <CheckoutSuccessView locale={locale} result={result} />
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
