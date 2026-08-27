import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LocaleLink } from "@/components/i18n/locale-link";
import { PublicPrimaryNav } from "@/components/site/public-primary-nav";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type HeroNavProps = {
  locale?: Locale;
  className?: string;
};

export function HeroNav({ locale = "en", className }: HeroNavProps) {
  return (
    <header className={cn("bh-hero-nav", className)}>
      <div className="bh-hero-nav-inner">
        <LocaleLink href="/" locale={locale} className="bh-hero-nav-brand">
          The Back Half
        </LocaleLink>

        <div className="bh-hero-nav-actions">
          <LanguageSwitcher variant="dark" className="bh-public-language-desktop" />
          <PublicPrimaryNav locale={locale} variant="dark" />
        </div>
      </div>
    </header>
  );
}
