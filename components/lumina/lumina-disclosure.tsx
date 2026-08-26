import { LocaleLink } from "@/components/i18n/locale-link";
import { LocalizedBrandCopy } from "@/components/pages/localized-brand-copy";
import { luminaDisclosure } from "@/content/lumina";
import { legalDocuments } from "@/content/legal/documents";
import type { Locale } from "@/lib/i18n/config";

type LuminaDisclosureProps = {
  locale?: Locale;
};

export function LuminaDisclosure({ locale = "en" }: LuminaDisclosureProps) {
  return (
    <aside
      id={luminaDisclosure.id}
      aria-labelledby="lumina-disclosure-heading"
      className="bh-lumina-disclosure mx-auto max-w-3xl"
    >
      <h2 id="lumina-disclosure-heading" className="sr-only">
        <LocalizedBrandCopy locale={locale} es="Divulgación de IA">
          {legalDocuments.aiDisclosure.title}
        </LocalizedBrandCopy>
      </h2>

      <p className="mt-6 text-center">
        <LocaleLink href={luminaDisclosure.legalHref} locale={locale} className="bh-legal-link">
          <LocalizedBrandCopy locale={locale} es="Divulgación de IA">
            {legalDocuments.aiDisclosure.title}
          </LocalizedBrandCopy>
        </LocaleLink>
      </p>
    </aside>
  );
}
