import { PageHero, SkipLink, StatusNotice } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type VerifyEmailPageViewProps = {
  locale?: Locale;
  status: "invalid" | "expired";
};

export function VerifyEmailPageView({
  locale = "en",
  status,
}: VerifyEmailPageViewProps) {
  const dictionary = getDictionary(locale);
  const registration = dictionary.registration;
  const message =
    status === "expired"
      ? translate(locale, registration.verifyExpired)
      : translate(locale, registration.verifyInvalid);

  return (
    <>
      <SkipLink href="#verify-main">{dictionary.common.skipToMain}</SkipLink>
      <main id="verify-main" className="min-h-screen bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{dictionary.common.siteName}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            {translate(locale, registration.verifyTitle)}
          </SectionHeading>
        </PageHero>

        <SectionShell
          id="verify-email-status"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <div className="mx-auto max-w-2xl text-left">
            <StatusNotice variant="pending">
              <p className="font-sans text-sm font-light leading-relaxed text-bh-muted">
                {message}
              </p>
            </StatusNotice>
          </div>
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
