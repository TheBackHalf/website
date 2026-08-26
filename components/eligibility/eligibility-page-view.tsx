import type { Metadata } from "next";
import { Suspense } from "react";
import { AgeGate } from "@/components/eligibility/age-gate";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";
import type { Locale } from "@/lib/i18n/config";

type EligibilityPageViewProps = {
  locale: Locale;
  next?: string;
};

export function createEligibilityMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.eligibility;
  return {
    ...createLocalizedPageMetadata({
      title: translate(locale, meta.title),
      description: translate(locale, meta.description),
      path: "/eligibility",
      locale,
    }),
    robots: { index: false, follow: false },
  };
}

function EligibilityPageInner({ locale, next }: EligibilityPageViewProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <SkipLink href="#eligibility-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="eligibility-main" className="min-h-screen bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl">
            {dictionary.eligibility.gateTitle}
          </SectionHeading>
        </PageHero>
        <SectionShell id="eligibility-gate" variant="light" density="compact" containerClassName="max-w-3xl">
          <AgeGate locale={locale} next={next} />
        </SectionShell>
        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}

export function EligibilityPageView({ locale, next }: EligibilityPageViewProps) {
  return (
    <Suspense fallback={null}>
      <EligibilityPageInner locale={locale} next={next} />
    </Suspense>
  );
}

export function createNotEligibleMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.notEligible;
  return {
    ...createLocalizedPageMetadata({
      title: translate(locale, meta.title),
      description: translate(locale, meta.description),
      path: "/not-eligible",
      locale,
    }),
    robots: { index: false, follow: false },
  };
}
