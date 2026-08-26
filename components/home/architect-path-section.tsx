import { LocaleLink } from "@/components/i18n/locale-link";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import {
  formatOfferPrice,
  listConfiguredCheckoutOffers,
  type CheckoutOfferId,
} from "@/lib/checkout/offers";
import type { Locale } from "@/lib/i18n/config";

type ArchitectPathSectionProps = {
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

export function ArchitectPathSection({ locale }: ArchitectPathSectionProps) {
  const checkout = getDictionary(locale).checkout;
  const offers = listConfiguredCheckoutOffers();

  return (
    <div className="mt-12 grid gap-10 text-left md:mt-16 md:grid-cols-3 md:gap-8">
      {offers.map((offer, index) => {
        const copy = offerCopy(offer.id, checkout);
        return (
          <article
            key={offer.id}
            className="border-t border-bh-purple/15 pt-6"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <p className="bh-eyebrow">
              {offer.mode === "subscription" ? checkout.monthly : checkout.oneTime}
            </p>
            <h3 className="bh-heading mt-3 text-2xl md:text-3xl">{copy.name}</h3>
            <p className="mt-4 font-sans text-sm font-light leading-relaxed text-bh-muted md:text-base">
              {copy.description}
            </p>
            <p className="mt-5 font-display text-2xl text-bh-ink">
              {formatOfferPrice(offer)}
            </p>
            <LocaleLink
              href={`/checkout/${offer.id}`}
              locale={locale}
              className="mt-6 inline-flex font-sans text-sm tracking-[0.18em] uppercase text-bh-purple underline-offset-4 transition hover:underline"
            >
              {translate(locale, checkout.offerCta)}
            </LocaleLink>
          </article>
        );
      })}
    </div>
  );
}
