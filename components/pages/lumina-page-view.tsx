import { SkipLink } from "@/components/design-system";
import { LuminaPageContent } from "@/components/lumina/lumina-page-content";
import { WebPageJsonLd } from "@/components/seo/json-ld";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedPath } from "@/lib/i18n/routing";

type LuminaPageViewProps = {
  locale: Locale;
};

export function LuminaPageView({ locale }: LuminaPageViewProps) {
  const meta = getDictionary(locale).metadata.lumina;
  const path = getLocalizedPath("/lumina", locale);

  return (
    <>
      <WebPageJsonLd
        title={translate(locale, meta.title)}
        description={translate(locale, meta.description)}
        path={path}
      />
      <SkipLink href="#lumina-opening">
        {getDictionary(locale).common.skipToMain}
      </SkipLink>

      <main className="min-h-dvh bg-bh-cream text-bh-ink">
        <LuminaPageContent locale={locale} />
      </main>
    </>
  );
}
