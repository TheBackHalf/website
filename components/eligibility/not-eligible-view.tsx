import { CtaButton, PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type NotEligibleViewProps = {
  locale: Locale;
};

export function NotEligibleView({ locale }: NotEligibleViewProps) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.eligibility;

  return (
    <>
      <SkipLink href="#not-eligible-main">{dictionary.common.skipToMain}</SkipLink>
      <main
        id="not-eligible-main"
        className="min-h-screen bg-bh-cream text-bh-ink"
        data-bh-not-eligible="true"
      >
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl">
            {copy.notEligibleTitle}
          </SectionHeading>
          <p className="mx-auto mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            {copy.notEligibleBody}
          </p>
        </PageHero>
        <SectionShell id="not-eligible-return" variant="light" density="compact" containerClassName="max-w-3xl">
          <CtaButton href="/" locale={locale}>
            {copy.notEligibleReturn}
          </CtaButton>
        </SectionShell>
        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
