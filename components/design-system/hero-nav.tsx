import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LocaleLink } from "@/components/i18n/locale-link";
import { navLinks } from "@/components/home/nav-links";
import { resolveNavLabel } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type HeroNavItem = {
  key: (typeof navLinks)[number]["key"];
  href: string;
};

const defaultNavItems: HeroNavItem[] = navLinks.map(({ key, href }) => ({
  key,
  href,
}));

type HeroNavProps = {
  locale?: Locale;
  items?: HeroNavItem[];
  className?: string;
};

export function HeroNav({ locale = "en", items = defaultNavItems, className }: HeroNavProps) {
  return (
    <header className={cn("bh-hero-nav", className)}>
      <div className="bh-hero-nav-inner">
        <LocaleLink href="/" locale={locale} className="bh-hero-nav-brand">
          The Back Half
        </LocaleLink>

        <div className="bh-hero-nav-actions">
          <LanguageSwitcher variant="dark" />
          <nav aria-label="Primary" className="bh-hero-nav-links">
            {items.map(({ key, href }) => (
              <LocaleLink key={key} href={href} locale={locale} className="bh-hero-nav-link">
                {resolveNavLabel(locale, key)}
              </LocaleLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
