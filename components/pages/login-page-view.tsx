import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";
import type { Locale } from "@/lib/i18n/config";

type LoginPageViewProps = {
  locale?: Locale;
  googleAuthEnabled?: boolean;
};

export function LoginPageView({
  locale = "en",
  googleAuthEnabled = false,
}: LoginPageViewProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <SkipLink href="#login-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="login-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate(locale, dictionary.login.title)}
          </SectionHeading>
          <p className="mx-auto mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            {translate(locale, dictionary.login.description)}
          </p>
        </PageHero>

        <SectionShell
          id="login-form"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <Suspense fallback={null}>
            <LoginForm locale={locale} googleAuthEnabled={googleAuthEnabled} />
          </Suspense>
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}

export function createLoginMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.login;
  return createLocalizedPageMetadata({
    title: translate(locale, meta.title),
    description: translate(locale, meta.description),
    path: "/login",
    locale,
  });
}
