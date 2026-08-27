import { LocaleLink } from "@/components/i18n/locale-link";
import {
  LegalDocumentBody,
  LegalDocumentMeta,
} from "@/components/legal/legal-document";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { PageHero, SkipLink } from "@/components/design-system";
import { SectionHeading } from "@/components/home/section-shell";
import type { LegalDocument } from "@/content/legal/documents";
import { legalFooterLinks } from "@/content/legal/documents";
import { getLegalTitle } from "@/content/legal/titles-es";
import { getDictionary } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedPath, type LocalizedPath } from "@/lib/i18n/routing";

type LegalPageShellProps = {
  document: LegalDocument;
  locale?: Locale;
};

export function LegalPageShell({ document, locale = "en" }: LegalPageShellProps) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <SkipLink href="#legal-main">{dictionary.common.skipToMain}</SkipLink>

      <main id="legal-main" className="min-h-dvh bg-bh-cream text-bh-ink">
        <PageHero locale={locale} className="pb-10 md:pb-14">
          <div className="bh-page-hero-content-left mx-auto max-w-3xl pt-12 text-center md:text-left">
            <p className="bh-eyebrow">{dictionary.common.legal}</p>
            <SectionHeading
              as="h1"
              className="mt-4 text-4xl md:text-5xl lg:text-6xl"
            >
              {getLegalTitle(document.slug, locale, document.title)}
            </SectionHeading>
            <LegalDocumentMeta document={document} />
          </div>
        </PageHero>

        <article className="bh-legal-page px-5 py-12 sm:px-6 md:px-10 md:py-16">
          <div className="mx-auto max-w-3xl">
            <LegalDocumentBody document={document} locale={locale} />

            <nav
              aria-label={dictionary.common.legal}
              className="bh-legal-nav mt-16 border-t border-bh-purple/10 pt-10"
            >
              <h2 className="bh-legal-nav-heading">
                {locale === "en" ? "Legal documents" : "Documentos legales"}
              </h2>
              <ul className="mt-4 space-y-2">
                {legalFooterLinks.map(({ href, label }) => {
                  const slug = href.replace(/^\/legal\//, "");
                  return (
                  <li key={href}>
                    <LocaleLink
                      href={href}
                      locale={locale}
                      className="bh-legal-link"
                      aria-current={href.endsWith(document.slug) ? "page" : undefined}
                    >
                      {getLegalTitle(slug, locale, label)}
                    </LocaleLink>
                  </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </article>

        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}

export function getLegalLocalizedPath(slug: string, locale: Locale): string {
  return getLocalizedPath(`/legal/${slug}` as LocalizedPath, locale);
}
