import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageHero, SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";
import type { Locale } from "@/lib/i18n/config";

type ResetPasswordPageViewProps = {
  locale?: Locale;
  token: string;
  tokenStatus: "valid" | "invalid" | "expired" | "used" | "missing";
};

export function ResetPasswordPageView({
  locale = "en",
  token,
  tokenStatus,
}: ResetPasswordPageViewProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <SkipLink href="#reset-password-main">
        {dictionary.common.skipToMain}
      </SkipLink>
      <main
        id="reset-password-main"
        className="min-h-screen bg-bh-cream text-bh-ink"
      >
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate(locale, dictionary.resetPassword.title)}
          </SectionHeading>
          <p className="mx-auto mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            {translate(locale, dictionary.resetPassword.description)}
          </p>
        </PageHero>

        <SectionShell
          id="reset-password-form"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <ResetPasswordForm
            locale={locale}
            token={token}
            tokenStatus={tokenStatus}
          />
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}

export function createResetPasswordMetadata(locale: Locale): Metadata {
  const meta = getDictionary(locale).metadata.resetPassword;
  return createLocalizedPageMetadata({
    title: translate(locale, meta.title),
    description: translate(locale, meta.description),
    path: "/reset-password",
    locale,
  });
}
