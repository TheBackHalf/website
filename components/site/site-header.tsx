import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LocaleLink } from "@/components/i18n/locale-link";
import { PublicPrimaryNav } from "@/components/site/public-primary-nav";
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
          <LanguageSwitcher
            variant={variant}
            className="bh-public-language-desktop"
          />
          <PublicPrimaryNav locale={locale} variant={variant} />
        </div>
      </div>
    </header>
  );
}
