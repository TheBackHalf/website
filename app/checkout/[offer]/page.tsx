import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckoutOfferForm } from "@/components/checkout/checkout-offer-form";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { getLoginPath } from "@/lib/auth/routing";
import { getServerSession } from "@/lib/auth/session/server";
import { getAuthStore } from "@/lib/auth/store";
import { accountIsAgeEligible } from "@/lib/eligibility/policy";
import { getEligibilityPath, getNotEligiblePath } from "@/lib/eligibility/paths";
import {
  isCheckoutOfferId,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ offer: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { offer } = await params;
  if (!isCheckoutOfferId(offer)) {
    return {};
  }

  const meta = getDictionary("en").metadata.checkout;
  return createLocalizedPageMetadata({
    title: translate("en", meta.title),
    description: translate("en", meta.description),
    path: `/checkout/${offer}`,
    locale: "en",
  });
}

export default async function CheckoutOfferPage({ params }: PageProps) {
  const { offer: offerParam } = await params;
  if (!isCheckoutOfferId(offerParam)) {
    notFound();
  }

  const offerId: CheckoutOfferId = offerParam;
  const session = await getServerSession();
  if (!session) {
    redirect(`${getLoginPath("en")}?next=${encodeURIComponent(`/checkout/${offerId}`)}`);
  }

  const user = await getAuthStore().findUserById(session.sub);
  if (user && user.ageEligible === false) {
    redirect(getNotEligiblePath("en"));
  }
  if (!accountIsAgeEligible(user)) {
    redirect(getEligibilityPath("en", `/checkout/${offerId}`));
  }

  const dictionary = getDictionary("en");

  return (
    <>
      <SkipLink href="#checkout-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="checkout-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <PageHero locale="en">
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate("en", dictionary.checkout.catalogTitle)}
          </SectionHeading>
        </PageHero>

        <SectionShell
          id="checkout-offer"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <CheckoutOfferForm offerId={offerId} locale="en" />
        </SectionShell>

        <LocalizedSiteFooter locale="en" />
      </main>
    </>
  );
}
