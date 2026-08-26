import { PageHero, SkipLink, TextLink } from "@/components/design-system";
import { LocalizedBrandCopy } from "@/components/pages/localized-brand-copy";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";
import { SupportRequestForm } from "@/components/support/support-request-form";
import { AgeGatedSection } from "@/components/eligibility/age-gated-section";
import { EligibilityDisclosure } from "@/components/eligibility/eligibility-disclosure";
import { supportPage } from "@/content/contact-support";
import { getDictionary, resolveNavLabel } from "@/content/i18n/get-dictionary";
import { SUPPORT_MAILBOX, SUPPORT_MAILTO } from "@/lib/support/catalog";
import type { Locale } from "@/lib/i18n/config";

type SupportPageViewProps = {
  locale: Locale;
};

export function SupportPageView({ locale }: SupportPageViewProps) {
  const dictionary = getDictionary(locale);
  const english = locale === "en";

  return (
    <>
      <SkipLink href="#support-main">{dictionary.common.skipToMain}</SkipLink>

      <main id="support-main" className="min-h-screen bg-bh-cream text-bh-ink">
        <PageHero locale={locale}>
          <p className="bh-eyebrow">{english ? supportPage.eyebrow : "Soporte"}</p>
          <SectionHeading as="h1" className="mt-6 text-4xl md:text-6xl lg:text-7xl">
            <LocalizedBrandCopy locale={locale} es="Soporte">
              {supportPage.title}
            </LocalizedBrandCopy>
          </SectionHeading>
        </PageHero>

        <SectionShell
          id="architect-support"
          variant="light"
          density="compact"
          align="left"
          containerClassName="max-w-3xl"
        >
          <SectionHeading as="h2" className="text-3xl md:text-4xl">
            <LocalizedBrandCopy locale={locale} es="Soporte para Architects">
              Architect support
            </LocalizedBrandCopy>
          </SectionHeading>
          <p className="mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted">
            {english
              ? "The Back Half Support is here for questions about registration, payment, onboarding, the Journey, Lumina, downloads, and related Architect experience."
              : "The Back Half Support está para preguntas de registro, pago, onboarding, el Journey, Lumina, descargas y la experiencia de Architect."}
          </p>
        </SectionShell>

        <SectionShell
          id="support-methods"
          variant="muted"
          density="compact"
          align="left"
          containerClassName="max-w-3xl"
        >
          <SectionHeading as="h2" className="text-3xl md:text-4xl">
            <LocalizedBrandCopy locale={locale} es="Cómo escribirnos">
              How to reach us
            </LocalizedBrandCopy>
          </SectionHeading>
          <p className="mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted">
            {english
              ? "Write to The Back Half Support or use the form on this page. Please do not include passwords, payment-card information, or other sensitive account information."
              : "Escribe a The Back Half Support o usa el formulario de esta página. No incluyas contraseñas, información de tarjetas de pago ni otros datos sensibles."}
          </p>
          <p className="mt-4 font-sans text-base font-light text-bh-ink">
            <a className="underline decoration-bh-purple/30" href={SUPPORT_MAILTO}>
              {SUPPORT_MAILBOX}
            </a>
          </p>
        </SectionShell>

        <SectionShell
          id="response-expectations"
          variant="light"
          density="compact"
          align="left"
          containerClassName="max-w-3xl"
        >
          <SectionHeading as="h2" className="text-3xl md:text-4xl">
            <LocalizedBrandCopy locale={locale} es="Tiempo de respuesta">
              Response expectation
            </LocalizedBrandCopy>
          </SectionHeading>
          <p className="mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted">
            {english
              ? "We typically respond within 3 days, with a goal of 72 hours or less. This is a response expectation, not a promise of immediate resolution."
              : "Suele haber respuesta en 3 días, con el objetivo de 72 horas o menos. Es una expectativa de respuesta, no una promesa de resolución inmediata."}
          </p>
        </SectionShell>

        <SectionShell
          id="escalation"
          variant="muted"
          density="compact"
          align="left"
          containerClassName="max-w-3xl"
        >
          <SectionHeading as="h2" className="text-3xl md:text-4xl">
            <LocalizedBrandCopy locale={locale} es="Asuntos urgentes">
              Urgent concerns
            </LocalizedBrandCopy>
          </SectionHeading>
          <p className="mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted">
            {english
              ? "Urgent security and privacy concerns are prioritized. Use the form or the support mailbox and describe the situation without including passwords or payment-card information."
              : "Los asuntos urgentes de seguridad y privacidad se priorizan. Usa el formulario o el correo de soporte y describe la situación sin incluir contraseñas ni datos de tarjetas de pago."}
          </p>
        </SectionShell>

        <SectionShell
          id="crisis-boundaries"
          variant="dark"
          density="compact"
          align="left"
          eyebrow={english ? supportPage.eyebrow : "Soporte"}
          eyebrowOnDark
          containerClassName="max-w-3xl"
        >
          <SectionHeading as="h2" className="mt-4 text-3xl text-white md:text-4xl">
            <LocalizedBrandCopy locale={locale} onDark es="Si estás en peligro">
              If you are in danger
            </LocalizedBrandCopy>
          </SectionHeading>
          <p className="mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-white/80">
            {english
              ? "If you are in danger, please contact local emergency services or a crisis line in your area. The Back Half Support is not a crisis service."
              : "Si estás en peligro, contacta los servicios de emergencia locales o una línea de crisis de tu zona. The Back Half Support no es un servicio de crisis."}
          </p>
        </SectionShell>

        <SectionShell
          id="support-request"
          variant="light"
          density="compact"
          align="left"
          containerClassName="max-w-4xl"
          ariaLabel={
            english ? "Support request form" : "Formulario de solicitud de soporte"
          }
        >
          <SectionHeading as="h2" className="text-3xl md:text-4xl">
            <LocalizedBrandCopy locale={locale} es="Enviar una solicitud">
              Send a request
            </LocalizedBrandCopy>
          </SectionHeading>
          <p className="mt-8 max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted">
            {english
              ? `Write to The Back Half Support at ${SUPPORT_MAILBOX} or use this form. We typically respond within 3 days, with a goal of 72 hours or less. Urgent security and privacy concerns are prioritized.`
              : `Escribe a The Back Half Support en ${SUPPORT_MAILBOX} o usa este formulario. Suele haber respuesta en 3 días, con el objetivo de 72 horas o menos. Los asuntos urgentes de seguridad y privacidad se priorizan.`}
          </p>
          <EligibilityDisclosure locale={locale} />
          <p className="mt-3 font-sans text-sm font-light text-bh-ink">
            <a className="underline decoration-bh-purple/30" href={SUPPORT_MAILTO}>
              {SUPPORT_MAILBOX}
            </a>
          </p>
          <div className="mt-10 md:mt-12">
            <AgeGatedSection
              locale={locale}
              next={locale === "es" ? "/es/support" : "/support"}
            >
              <SupportRequestForm locale={locale} />
            </AgeGatedSection>
          </div>
        </SectionShell>

        <SectionShell
          id="support-contact-link"
          variant="muted"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <TextLink href="/contact" locale={locale} variant="utility">
            {resolveNavLabel(locale, "contact")}
          </TextLink>
        </SectionShell>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
