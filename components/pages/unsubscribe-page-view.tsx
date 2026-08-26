import { PageHero, SkipLink, StatusNotice } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";
import type { Locale } from "@/lib/i18n/config";
import type { Metadata } from "next";

type UnsubscribeStatus = "unsubscribed" | "already" | "invalid" | "missing";

type UnsubscribePageViewProps = {
  locale?: Locale;
  status: UnsubscribeStatus;
};

export function UnsubscribePageView({
  locale = "en",
  status,
}: UnsubscribePageViewProps) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.unsubscribe;
  const title =
    status === "unsubscribed" || status === "already"
      ? translate(locale, copy.confirmedTitle)
      : translate(locale, copy.title);
  const variant =
    status === "unsubscribed" || status === "already" ? "success" : "error";
  const message =
    status === "unsubscribed"
      ? copy.confirmed
      : status === "already"
        ? copy.already
        : status === "missing"
          ? copy.missing
          : copy.invalid;

  return (
    <>
      <SkipLink href="#unsubscribe-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="unsubscribe-main" className="min-h-screen bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {title}
          </SectionHeading>
        </PageHero>

        <SectionShell
          id="unsubscribe-status"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <div className="mx-auto max-w-2xl text-left">
            <StatusNotice variant={variant}>
              <p className="font-sans text-sm font-light leading-relaxed text-bh-muted">
                {message}
              </p>
              <p className="mt-4 font-sans text-sm font-light leading-relaxed text-bh-muted">
                {copy.transactionalNote}
              </p>
            </StatusNotice>
          </div>
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}

export function createUnsubscribeMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.unsubscribe;
  return createLocalizedPageMetadata({
    title: translate(locale, meta.title),
    description: translate(locale, meta.description),
    path: "/unsubscribe",
    locale,
  });
}
