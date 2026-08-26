import type { Metadata } from "next";
import { CheckoutCatalog } from "@/components/checkout/checkout-catalog";
import { EligibilityDisclosure } from "@/components/eligibility/eligibility-disclosure";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";
import type { Locale } from "@/lib/i18n/config";

type CheckoutPageViewProps = {
  locale?: Locale;
};

export function createCheckoutMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.checkout;
  return createLocalizedPageMetadata({
    title: translate(locale, meta.title),
    description: translate(locale, meta.description),
    path: "/checkout",
    locale,
  });
}

export function CheckoutPageView({ locale = "en" }: CheckoutPageViewProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <SkipLink href="#checkout-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="checkout-main" className="min-h-screen bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate(locale, dictionary.checkout.catalogTitle)}
          </SectionHeading>
          <p className="mx-auto mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            {translate(locale, dictionary.checkout.catalogDescription)}
          </p>
          <EligibilityDisclosure locale={locale} className="mx-auto mt-4 max-w-2xl font-sans text-sm font-light leading-relaxed text-bh-muted" />
        </PageHero>

        <SectionShell
          id="checkout-offers"
          variant="light"
          density="compact"
          containerClassName="max-w-5xl"
        >
          <CheckoutCatalog locale={locale} />
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
