import type { Metadata } from "next";
import { translate } from "@/content/i18n/get-dictionary";
import type { Dictionary } from "@/content/i18n/types";
import {
  getAlternateLocalizedPaths,
  getLocalizedPath,
  type LocalizedPath,
} from "@/lib/i18n/routing";
import { localeLabels, type Locale } from "@/lib/i18n/config";
import {
  getSiteUrl,
  SITE_ICON,
  SOCIAL_PREVIEW_IMAGE,
  siteIdentity,
} from "@/lib/seo/site-config";

type LocalizedPageSeoInput = {
  title: Dictionary["metadata"]["home"]["title"];
  description: Dictionary["metadata"]["home"]["description"];
  path: LocalizedPath;
  locale: Locale;
};

export function createLocalizedPageMetadata({
  title,
  description,
  path,
  locale,
}: LocalizedPageSeoInput): Metadata {
  const resolvedTitle = translate(locale, title);
  const resolvedDescription = translate(locale, description);
  const canonicalPath = getLocalizedPath(path, locale);
  const alternates = getAlternateLocalizedPaths(path);

  return {
    title: resolvedTitle,
    description: resolvedDescription || undefined,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: alternates.en,
        es: alternates.es,
        "x-default": alternates.en,
      },
    },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription || undefined,
      url: canonicalPath,
      siteName: siteIdentity.name,
      locale: localeLabels[locale].ogLocale,
      alternateLocale:
        locale === "en" ? localeLabels.es.ogLocale : localeLabels.en.ogLocale,
      type: "website",
      images: [
        {
          url: SOCIAL_PREVIEW_IMAGE.path,
          width: SOCIAL_PREVIEW_IMAGE.width,
          height: SOCIAL_PREVIEW_IMAGE.height,
          alt: SOCIAL_PREVIEW_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription || undefined,
      images: [SOCIAL_PREVIEW_IMAGE.path],
    },
  };
}

export function createRootMetadata(locale: Locale = "en"): Metadata {
  const path: LocalizedPath = "/";

  return {
    metadataBase: new URL(getSiteUrl()),
    ...createLocalizedPageMetadata({
      title:
        locale === "en"
          ? "The Back Half — Magical is Possible"
          : {
              pending: true,
              fallback: "The Back Half — Magical is Possible",
            },
      description:
        locale === "en"
          ? "The Back Half helps people transition from living by expectation to living with intention."
          : {
              pending: true,
              fallback:
                "The Back Half helps people transition from living by expectation to living with intention.",
            },
      path,
      locale,
    }),
    icons: {
      icon: [{ url: SITE_ICON.path, type: "image/svg+xml" }],
    },
  };
}

/** @deprecated Use createLocalizedPageMetadata — kept for gradual migration. */
export function createPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return createLocalizedPageMetadata({
    title: input.title,
    description: input.description,
    path: input.path as LocalizedPath,
    locale: "en",
  });
}

export function createRootMetadataLegacy(): Metadata {
  return createRootMetadata("en");
}
