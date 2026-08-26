import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  locale?: Locale;
  children: React.ReactNode;
  className?: string;
  headerVariant?: "dark" | "light";
};

export function PageHero({
  locale = "en",
  children,
  className,
  headerVariant = "light",
}: PageHeroProps) {
  return (
    <div className={cn("bh-page-hero bh-site-page-hero bh-section-muted", className)}>
      <SiteHeader variant={headerVariant} locale={locale} />
      <div className="bh-reveal bh-page-hero-content">{children}</div>
    </div>
  );
}
