import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import type { Dictionary } from "@/content/i18n/types";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";

type ArchitectMetadataKey = keyof Dictionary["appShell"]["metadata"];

export function createArchitectPageMetadata(
  locale: Locale,
  page: ArchitectMetadataKey,
): Metadata {
  const meta = getDictionary(locale).appShell.metadata[page];

  return {
    title: translate(locale, meta.title),
    description: translate(locale, meta.description) || undefined,
    robots: { index: false, follow: false },
  };
}
