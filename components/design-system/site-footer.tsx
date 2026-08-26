import { LocaleLink } from "@/components/i18n/locale-link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { FooterLegalNav } from "@/components/site/footer-legal-nav";
import { navLinks } from "@/components/home/nav-links";
import { LocalizedBrandCopy } from "@/components/pages/localized-brand-copy";
import { getDictionary, resolveNavLabel } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  locale?: Locale;
  className?: string;
};

export function SiteFooter({ locale = "en", className }: SiteFooterProps) {
  const dictionary = getDictionary(locale);

  return (
    <footer id="footer" className={cn("bh-footer bh-footer-shell", className)}>
      <div className="bh-footer-inner">
        <div className="bh-footer-brand-block">
          <LocaleLink
            href="/"
            locale={locale}
            className="bh-footer-brand"
          >
            {dictionary.common.siteName}
          </LocaleLink>
          <LocalizedBrandCopy
            locale={locale}
            es={
              <p className="bh-footer-tagline">
                Vive con intención. Vive en tu plenitud.
              </p>
            }
          >
            <p className="bh-footer-tagline">
              Live by intention. Live in your fullness.
            </p>
          </LocalizedBrandCopy>
        </div>

        <div className="bh-footer-nav-block">
          <LanguageSwitcher variant="light" />
          <nav aria-label="Footer" className="bh-nav-footer">
            {navLinks.map(({ key, href }) => (
              <LocaleLink
                key={key}
                href={href}
                locale={locale}
                className="bh-nav-footer-link"
              >
                {resolveNavLabel(locale, key)}
              </LocaleLink>
            ))}
            <LocaleLink href="/support" locale={locale} className="bh-nav-footer-link">
              {resolveNavLabel(locale, "support")}
            </LocaleLink>
          </nav>
          <FooterLegalNav locale={locale} />
        </div>
      </div>
    </footer>
  );
}
