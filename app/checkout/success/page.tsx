import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutSuccessView } from "@/components/checkout/checkout-success-view";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { getLoginPath } from "@/lib/auth/routing";
import { verifyCheckoutSuccess } from "@/lib/checkout/verify-success";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  searchParams: Promise<{ session_id?: string; offer?: string }>;
};

export const metadata: Metadata = createLocalizedPageMetadata({
  title: translate("en", getDictionary("en").metadata.checkoutSuccess.title),
  description: translate(
    "en",
    getDictionary("en").metadata.checkoutSuccess.description,
  ),
  path: "/checkout/success",
  locale: "en",
});

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const result = await verifyCheckoutSuccess(params.session_id);

  if (result.status === "unauthenticated") {
    redirect(
      `${getLoginPath("en")}?next=${encodeURIComponent("/checkout/success")}`,
    );
  }

  const dictionary = getDictionary("en");

  return (
    <>
      <SkipLink href="#checkout-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="checkout-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <PageHero locale="en">
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate("en", dictionary.checkout.successTitle)}
          </SectionHeading>
        </PageHero>

        <SectionShell
          id="checkout-success"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <CheckoutSuccessView locale="en" result={result} />
        </SectionShell>

        <LocalizedSiteFooter locale="en" />
      </main>
    </>
  );
}
