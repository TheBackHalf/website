import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedPath, type LocalizedPath } from "@/lib/i18n/routing";

type LocaleLinkProps = React.ComponentPropsWithoutRef<typeof Link> & {
  locale: Locale;
  href: string;
};

export function LocaleLink({ locale, href, ...props }: LocaleLinkProps) {
  const localizedHref = localizeHref(href, locale);
  return <Link href={localizedHref} {...props} />;
}

function localizeHref(href: string, locale: Locale): string {
  if (href.startsWith("http") || href === "#") {
    return href;
  }

  if (href.startsWith("/#")) {
    return `${getLocalizedPath("/", locale)}${href.slice(1)}`;
  }

  return getLocalizedPath(href as LocalizedPath, locale);
}
