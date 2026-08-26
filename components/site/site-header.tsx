import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LocaleLink } from "@/components/i18n/locale-link";
import { navLinks } from "@/components/home/nav-links";
import { resolveNavLabel } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  className?: string;
  variant?: "dark" | "light";
  locale?: Locale;
};

export function SiteHeader({
  className,
  variant = "dark",
  locale = "en",
}: SiteHeaderProps) {
  const isDark = variant === "dark";

  return (
    <header className={cn("bh-site-header", className)}>
      <div className="bh-site-header-inner">
        <LocaleLink
          href="/"
          locale={locale}
          className={cn(
            "bh-site-header-brand",
            !isDark && "text-bh-ink hover:text-bh-purple",
          )}
        >
          The Back Half
        </LocaleLink>

        <div className="bh-hero-nav-actions">
          <LanguageSwitcher variant={variant} />
          <nav aria-label="Primary" className="bh-hero-nav-links">
            {navLinks.map(({ href, key }) => (
              <LocaleLink
                key={key}
                href={href}
                locale={locale}
                className={cn(
                  isDark ? "bh-hero-nav-link" : "bh-site-header-link",
                )}
              >
                {resolveNavLabel(locale, key)}
              </LocaleLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
