import type { Locale } from "@/lib/i18n/config";
import { SkipLink } from "@/components/design-system";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { JourneyHero } from "@/components/journey/journey-hero";
import { JourneyStageSection } from "@/components/journey/journey-stage-section";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { WebPageJsonLd } from "@/components/seo/json-ld";
import { getJourneyStages } from "@/content/journey/localized";
import { getLocalizedPath } from "@/lib/i18n/routing";

type JourneyPageViewProps = {
  locale: Locale;
};

export function JourneyPageView({ locale }: JourneyPageViewProps) {
  const meta = getDictionary(locale).metadata.journey;

  return (
    <>
      <WebPageJsonLd
        title={translate(locale, meta.title)}
        description={translate(locale, meta.description)}
        path={getLocalizedPath("/journey", locale)}
      />
      <SkipLink href="#journey-main">
        {getDictionary(locale).common.skipToMain}
      </SkipLink>
      <main id="journey-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <JourneyHero locale={locale} />
        {getJourneyStages(locale).map((stage) => (
          <JourneyStageSection key={stage.id} stage={stage} locale={locale} />
        ))}
        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
