import type { Metadata } from "next";
import { CheckoutCancelView } from "@/components/checkout/checkout-cancel-view";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  searchParams: Promise<{ offer?: string }>;
};

export const metadata: Metadata = createLocalizedPageMetadata({
  title: translate("es", getDictionary("es").metadata.checkoutCancel.title),
  description: translate(
    "es",
    getDictionary("es").metadata.checkoutCancel.description,
  ),
  path: "/checkout/cancel",
  locale: "es",
});

export default async function EsCheckoutCancelPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const dictionary = getDictionary("es");

  return (
    <>
      <SkipLink href="#checkout-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="checkout-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <PageHero locale="es">
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate("es", dictionary.checkout.cancelTitle)}
          </SectionHeading>
        </PageHero>

        <SectionShell
          id="checkout-cancel"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <CheckoutCancelView locale="es" offerId={params.offer} />
        </SectionShell>

        <LocalizedSiteFooter locale="es" />
      </main>
    </>
  );
}
