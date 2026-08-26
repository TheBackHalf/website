import { LocaleLink } from "@/components/i18n/locale-link";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import {
  formatOfferPrice,
  listConfiguredCheckoutOffers,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";
import type { Locale } from "@/lib/i18n/config";

type CheckoutCatalogProps = {
  locale: Locale;
};

function offerCopy(
  offerId: CheckoutOfferId,
  checkout: ReturnType<typeof getDictionary>["checkout"],
) {
  switch (offerId) {
    case "blueprint":
      return {
        name: checkout.offerBlueprintName,
        description: checkout.offerBlueprintDescription,
      };
    case "bundle":
      return {
        name: checkout.offerBundleName,
        description: checkout.offerBundleDescription,
      };
    case "community":
      return {
        name: checkout.offerCommunityName,
        description: checkout.offerCommunityDescription,
      };
  }
}

export function CheckoutCatalog({ locale }: CheckoutCatalogProps) {
  const dictionary = getDictionary(locale);
  const checkout = dictionary.checkout;
  const offers = listConfiguredCheckoutOffers();

  return (
    <div className="mx-auto grid max-w-5xl gap-12 md:gap-16">
      {offers.map((offer) => {
        const copy = offerCopy(offer.id, checkout);
        return (
          <article
            key={offer.id}
            className="border-t border-bh-purple/15 pt-10 text-left"
          >
            <p className="bh-eyebrow">
              {offer.mode === "subscription"
                ? checkout.monthly
                : checkout.oneTime}
            </p>
            <h2 className="bh-heading mt-4 text-3xl md:text-4xl lg:text-5xl">
              {copy.name}
            </h2>
            <p className="mt-4 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
              {copy.description}
            </p>
            <p className="mt-4 font-sans text-sm font-light text-bh-muted">
              {checkout.eligibilityDisclosure}
            </p>
            <p className="mt-6 font-display text-2xl text-bh-ink md:text-3xl">
              {formatOfferPrice(offer)}
            </p>
            <LocaleLink
              href={`/checkout/${offer.id}`}
              locale={locale}
              className="bh-cta mt-8 inline-flex"
            >
              {translate(locale, checkout.offerCta)}
            </LocaleLink>
          </article>
        );
      })}
    </div>
  );
}
