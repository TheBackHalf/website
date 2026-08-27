import { CtaButton, PageHero, SkipLink, TextLink } from "@/components/design-system";
import { CopyPending } from "@/components/journey/copy-pending";
import { LocalizedBrandCopy } from "@/components/pages/localized-brand-copy";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import {
  SectionHeading,
  SectionShell,
} from "@/components/home/section-shell";
import { contactCta, contactPage } from "@/content/contact-support";
import { getDictionary, resolveNavLabel } from "@/content/i18n/get-dictionary";
import { SUPPORT_MAILBOX, SUPPORT_MAILTO } from "@/lib/support/catalog";
import type { Locale } from "@/lib/i18n/config";

type ContactPageViewProps = {
  locale: Locale;
};

export function ContactPageView({ locale }: ContactPageViewProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <SkipLink href="#contact-main">{dictionary.common.skipToMain}</SkipLink>

      <main id="contact-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">
            {locale === "en" ? contactPage.eyebrow : "Contacto"}
          </p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            <LocalizedBrandCopy locale={locale} es="Contacto">
              {contactPage.title}
            </LocalizedBrandCopy>
          </SectionHeading>
          {contactPage.introPending ? (
            <CopyPending className="mt-10 md:mt-12" locale={locale} />
          ) : null}
        </PageHero>

        <SectionShell
          id="contact-methods"
          variant="light"
          density="compact"
          ariaLabel={
            locale === "en" ? "Contact methods" : "Métodos de contacto"
          }
          containerClassName="max-w-3xl"
        >
          <SectionHeading as="h2" className="text-3xl md:text-4xl">
            <LocalizedBrandCopy locale={locale} es="Contacto">
              Contact
            </LocalizedBrandCopy>
          </SectionHeading>
          <p className="mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted">
            {locale === "en"
              ? "For Architect support, write to The Back Half Support or use the Support form. Please do not include passwords or payment-card information. Architect support intake is for eligible participants 18 or older."
              : "Para soporte de Architect, escribe a The Back Half Support o usa el formulario de Soporte. No incluyas contraseñas ni datos de tarjetas de pago. El formulario de soporte para Architects es para participantes elegibles de 18 años o más."}
          </p>
          <p className="mt-4 font-sans text-base font-light text-bh-ink">
            <a className="inline-flex min-h-11 items-center underline decoration-bh-purple/30" href={SUPPORT_MAILTO}>
              {SUPPORT_MAILBOX}
            </a>
          </p>
        </SectionShell>

        <SectionShell
          id="contact-support-cta"
          variant="muted"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <SectionHeading as="h2" className="text-3xl md:text-5xl">
            <LocalizedBrandCopy locale={locale} es="Contacto">
              {contactCta.label}
            </LocalizedBrandCopy>
          </SectionHeading>
          <CtaButton href={contactCta.supportHref} className="relative" locale={locale}>
            <LocalizedBrandCopy locale={locale} es="Soporte">
              {contactCta.supportLabel}
            </LocalizedBrandCopy>
          </CtaButton>
          <p className="mt-6">
            <TextLink href="/support" locale={locale} variant="utility">
              {resolveNavLabel(locale, "support")}
            </TextLink>
          </p>
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
