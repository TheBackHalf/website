import { Suspense } from "react";
import type { Metadata } from "next";
import { RegistrationConfirmationView } from "@/components/auth/registration-confirmation-view";
import { RegistrationForm } from "@/components/auth/registration-form";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { EligibilityDisclosure } from "@/components/eligibility/eligibility-disclosure";
import { AgeGatedSection } from "@/components/eligibility/age-gated-section";
import { MarketingSessionBeacon } from "@/components/marketing-kpi/marketing-session-beacon";
import {
  getDictionary,
  translate,
} from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";
import type { Locale } from "@/lib/i18n/config";

type RegistrationPageViewProps = {
  locale?: Locale;
  googleAuthEnabled?: boolean;
};

export function RegistrationPageView({
  locale = "en",
  googleAuthEnabled = false,
}: RegistrationPageViewProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <MarketingSessionBeacon path={locale === "es" ? "/es/register" : "/register"} />
      <SkipLink href="#register-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="register-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate(locale, dictionary.registration.title)}
          </SectionHeading>
          <p className="mx-auto mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            {translate(locale, dictionary.registration.description)}
          </p>
          <EligibilityDisclosure locale={locale} className="mx-auto mt-4 max-w-2xl font-sans text-sm font-light leading-relaxed text-bh-muted" />
        </PageHero>

        <SectionShell
          id="register-form"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <Suspense fallback={null}>
            <AgeGatedSection
              locale={locale}
              next={locale === "es" ? "/es/register" : "/register"}
            >
              <RegistrationForm
                locale={locale}
                googleAuthEnabled={googleAuthEnabled}
              />
            </AgeGatedSection>
          </Suspense>
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}

export function RegistrationConfirmationPageView({
  locale = "en",
}: RegistrationPageViewProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <SkipLink href="#register-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="register-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate(locale, dictionary.registration.confirmationTitle)}
          </SectionHeading>
          <p className="mx-auto mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            {translate(locale, dictionary.registration.confirmationDescription)}
          </p>
        </PageHero>

        <SectionShell
          id="register-confirmation"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <RegistrationConfirmationView locale={locale} />
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}

export function createRegistrationMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.register;
  return createLocalizedPageMetadata({
    title: translate(locale, meta.title),
    description: translate(locale, meta.description),
    path: "/register",
    locale,
  });
}

export function createRegistrationConfirmationMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.registerConfirmation;
  return createLocalizedPageMetadata({
    title: translate(locale, meta.title),
    description: translate(locale, meta.description),
    path: "/register/confirmation",
    locale,
  });
}

export function createVerifyEmailMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.verifyEmail;
  return createLocalizedPageMetadata({
    title: translate(locale, meta.title),
    description: translate(locale, meta.description),
    path: "/verify-email",
    locale,
  });
}
