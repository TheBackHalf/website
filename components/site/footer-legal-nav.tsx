import Link from "next/link";
import { getLocalizedPath, type LocalizedPath } from "@/lib/i18n/routing";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { legalFooterLinks } from "@/content/legal/documents";
import { getLegalTitle } from "@/content/legal/titles-es";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type FooterLegalNavProps = {
  locale?: Locale;
  className?: string;
};

export function FooterLegalNav({ locale = "en", className }: FooterLegalNavProps) {
  const dictionary = getDictionary(locale);

  return (
    <nav
      aria-label={dictionary.common.legal}
      className={cn("bh-nav-legal", className)}
    >
      {legalFooterLinks.map(({ href, label }) => {
        const slug = href.replace(/^\/legal\//, "");
        return (
          <Link
            key={href}
            href={getLocalizedPath(href as LocalizedPath, locale)}
            className="bh-nav-legal-link"
          >
            {getLegalTitle(slug, locale, label)}
          </Link>
        );
      })}
    </nav>
  );
}
