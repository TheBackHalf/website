import type { Locale } from "@/lib/i18n/config";

type LocalizedBrandCopyProps = {
  locale: Locale;
  children: React.ReactNode;
  es?: React.ReactNode;
  onDark?: boolean;
  className?: string;
};

/** Renders English brand copy on EN routes; optional Spanish via `es` on ES routes. */
export function LocalizedBrandCopy({
  locale,
  children,
  es,
}: LocalizedBrandCopyProps) {
  if (locale === "es") {
    return <>{es ?? children}</>;
  }

  return <>{children}</>;
}
