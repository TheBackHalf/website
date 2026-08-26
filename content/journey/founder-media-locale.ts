/**
 * Shared locale-aware Founder media schema.
 * Chapters resolve English/Spanish sources from the active Journey locale.
 * Do not silently substitute English when Spanish is missing.
 */

import type { Locale } from "@/lib/i18n/config";

export type FounderMediaLocaleBundle = {
  src: string | null;
  poster?: string | null;
  captionsSrc?: string | null;
  transcriptSrc?: string | null;
  /** Locale-specific playback endpoint when approved (seconds). */
  playbackEndSeconds?: number | null;
};

export type FounderMediaLocales = {
  en: FounderMediaLocaleBundle;
  es: FounderMediaLocaleBundle;
};

export type ResolvedFounderMedia = {
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  playbackEndSeconds: number | null;
  assetStatus: "available" | "missing";
  /** Always null in participant UI — never expose internal missing-asset reasons. */
  missingReason: null;
};

export function resolveFounderMediaLocales(
  locales: FounderMediaLocales,
  locale: Locale,
): ResolvedFounderMedia {
  const bundle = locale === "es" ? locales.es : locales.en;
  const src =
    typeof bundle.src === "string" && bundle.src.trim()
      ? bundle.src.trim()
      : null;
  return {
    src,
    poster:
      typeof bundle.poster === "string" && bundle.poster.trim()
        ? bundle.poster.trim()
        : null,
    captionsSrc:
      typeof bundle.captionsSrc === "string" && bundle.captionsSrc.trim()
        ? bundle.captionsSrc.trim()
        : null,
    transcriptSrc:
      typeof bundle.transcriptSrc === "string" && bundle.transcriptSrc.trim()
        ? bundle.transcriptSrc.trim()
        : null,
    playbackEndSeconds:
      typeof bundle.playbackEndSeconds === "number" &&
      Number.isFinite(bundle.playbackEndSeconds)
        ? bundle.playbackEndSeconds
        : null,
    assetStatus: src ? "available" : "missing",
    missingReason: null,
  };
}

export type FounderMediaMissingField = "src" | "captions" | "transcript" | "poster";

export function listMissingFounderMediaLocales(
  id: string,
  locales: FounderMediaLocales,
): Array<{ id: string; locale: Locale; field: FounderMediaMissingField }> {
  const missing: Array<{
    id: string;
    locale: Locale;
    field: FounderMediaMissingField;
  }> = [];
  for (const locale of ["en", "es"] as const) {
    const bundle = locales[locale];
    const src =
      typeof bundle.src === "string" && bundle.src.trim()
        ? bundle.src.trim()
        : null;
    if (!src) {
      // No launch video for this locale — captions/transcripts/posters are
      // not required until an approved source exists.
      missing.push({ id, locale, field: "src" });
      continue;
    }
    if (!bundle.captionsSrc?.trim()) {
      missing.push({ id, locale, field: "captions" });
    }
    if (!bundle.transcriptSrc?.trim()) {
      missing.push({ id, locale, field: "transcript" });
    }
    if (!bundle.poster?.trim()) {
      missing.push({ id, locale, field: "poster" });
    }
  }
  return missing;
}
