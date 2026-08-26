import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedBrandCopy } from "@/components/pages/localized-brand-copy";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { PrivacyRequestForm } from "@/components/privacy/privacy-request-form";
import { AgeGatedSection } from "@/components/eligibility/age-gated-section";
import { EligibilityDisclosure } from "@/components/eligibility/eligibility-disclosure";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { privacyRequestPageCopy } from "@/lib/privacy/copy";
import { PRIVACY_MAILBOX_ADDRESS } from "@/lib/privacy/catalog";
import type { Locale } from "@/lib/i18n/config";

type PrivacyRequestPageViewProps = {
  locale: Locale;
  defaults?: {
    name?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    timeZone?: string;
  };
  sessionVerified?: boolean;
};

export function PrivacyRequestPageView({
  locale,
  defaults,
  sessionVerified = false,
}: PrivacyRequestPageViewProps) {
  const dictionary = getDictionary(locale);
  const copy = privacyRequestPageCopy(locale);
  const next = locale === "es" ? "/es/privacy/request" : "/privacy/request";

  return (
    <>
      <SkipLink href="#privacy-request-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="privacy-request-main" className="min-h-screen bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{copy.eyebrow}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            <LocalizedBrandCopy locale={locale} es={copy.title}>
              {copy.title}
            </LocalizedBrandCopy>
          </SectionHeading>
        </PageHero>
        <SectionShell id="privacy-request" variant="light" density="compact" align="left" containerClassName="max-w-3xl">
          <p className="max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted">
            {copy.intro}
          </p>
          <p className="mt-4 font-sans text-base font-light text-bh-ink">
            <a className="underline decoration-bh-purple/30" href={`mailto:${PRIVACY_MAILBOX_ADDRESS}`}>
              {PRIVACY_MAILBOX_ADDRESS}
            </a>
          </p>
          <EligibilityDisclosure locale={locale} />
          <div className="mt-10">
            <AgeGatedSection locale={locale} next={next}>
              <PrivacyRequestForm
                locale={locale}
                defaults={defaults}
                sessionVerified={sessionVerified}
              />
            </AgeGatedSection>
          </div>
        </SectionShell>
        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
