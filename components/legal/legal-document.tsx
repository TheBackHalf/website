import { LocaleLink } from "@/components/i18n/locale-link";
import type { LegalDocument } from "@/content/legal/documents";
import { getLegalDocumentHref } from "@/content/legal/documents";
import { getPublishedLegalSections } from "@/content/legal/published-bodies";
import { AgeEligibilityLegalNotice } from "@/components/eligibility/age-eligibility-legal-notice";
import { PendingMarker } from "@/components/design-system/pending-marker";
import { getLegalTitle } from "@/content/legal/titles-es";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type LegalCopyPendingProps = {
  className?: string;
  locale?: Locale;
};

export function LegalCopyPending({ className, locale = "en" }: LegalCopyPendingProps) {
  return <PendingMarker locale={locale} variant="legal" className={className} />;
}

type LegalDocumentBodyProps = {
  document: LegalDocument;
  locale?: Locale;
};

export function LegalDocumentBody({ document, locale = "en" }: LegalDocumentBodyProps) {
  const eligibilityNotice = (
    <AgeEligibilityLegalNotice slug={document.slug} locale={locale} />
  );

  if (locale === "es") {
    return (
      <>
        {eligibilityNotice}
        <LegalCopyPending locale="es" />
        <p className="bh-legal-paragraph mt-6" lang="en">
          The published English Version 1.0 is the operative legal instrument.
          An approved Spanish translation has not been provided. This page is
          not an approved Spanish legal instrument.
        </p>
        <p className="mt-4">
          <LocaleLink
            href={getLegalDocumentHref(document.slug)}
            locale="en"
            className="bh-legal-link"
          >
            Read the published English Version 1.0
          </LocaleLink>
        </p>
      </>
    );
  }

  const sections =
    document.sections ?? getPublishedLegalSections(document.slug) ?? [];

  if (document.contentPending || sections.length === 0) {
    return (
      <>
        {eligibilityNotice}
        <LegalCopyPending locale={locale} />
      </>
    );
  }
  return (
    <div className="bh-legal-body">
      {eligibilityNotice}
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`${section.id}-heading`}>
          {section.heading ? (
            <h2
              id={`${section.id}-heading`}
              className="bh-legal-section-heading"
            >
              {section.heading}
            </h2>
          ) : null}
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="bh-legal-paragraph">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

type LegalDocumentMetaProps = {
  document: LegalDocument;
};

export function LegalDocumentMeta({ document }: LegalDocumentMetaProps) {
  if (!document.effectiveDate && !document.version) {
    return null;
  }

  return (
    <dl className="bh-legal-meta mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-center md:justify-start md:text-left">
      {document.effectiveDate ? (
        <div>
          <dt className="sr-only">Effective date</dt>
          <dd className="bh-legal-meta-item">Effective: {document.effectiveDate}</dd>
        </div>
      ) : null}
      {document.version ? (
        <div>
          <dt className="sr-only">Version</dt>
          <dd className="bh-legal-meta-item">Version: {document.version}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function LegalDocumentLink({
  document,
  className,
  locale = "en",
}: {
  document: LegalDocument;
  className?: string;
  locale?: Locale;
}) {
  return (
    <LocaleLink
      href={getLegalDocumentHref(document.slug)}
      locale={locale}
      className={cn("bh-legal-link", className)}
    >
      {getLegalTitle(document.slug, locale, document.title)}
    </LocaleLink>
  );
}
