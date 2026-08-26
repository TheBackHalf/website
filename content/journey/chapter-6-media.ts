/**
 * Chapter VI Founder media placements.
 * Only approved Founder media required by authoritative Chapter VI content.
 */

import { founderCaptionPublicPath } from "@/content/journey/founder-captions";
import type { Locale } from "@/lib/i18n/config";
import {
  listMissingFounderMediaLocales,
  resolveFounderMediaLocales,
  type FounderMediaLocales,
} from "@/content/journey/founder-media-locale";

export type Chapter6MediaPlacementId =
  | "chapter-6-welcome"
  | "chapter-6-closing";

export type Chapter6MediaPlacement = {
  id: Chapter6MediaPlacementId;
  label: string;
  labelEs: string;
  sectionId: "welcome" | "teaching" | "closing";
  locales: FounderMediaLocales;
  mimeType?: string;
};

/**
 * Chapter VI — Expansion (Founder Welcome)
 * Production EN asset: public/videos/chapter-6/chapter-6-expansion.mp4
 * Source: public/videos/chapter 6/Chapter 6_ Expansion_1080p.mp4
 *
 * Spanish welcome: public/videos/chapter 6/Chapter_6_Expansion-Spanish.mp4
 * Closing Founder video (EN + ES): not present in project.
 */
export const chapter6MediaPlacements: readonly Chapter6MediaPlacement[] = [
  {
    id: "chapter-6-welcome",
    label: "Chapter Six — Expansion",
    labelEs: "Capítulo Seis — Expansión",
    sectionId: "welcome",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/chapter-6/chapter-6-expansion.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("en", "chapter-6-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
      es: {
        src: "/videos/chapter%206/Chapter_6_Expansion-Spanish.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("es", "chapter-6-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
    },
  },
  {
    id: "chapter-6-closing",
    label: "Chapter Six — Founder Closing Reflection",
    labelEs: "Capítulo Seis — Reflexión de cierre del Founder",
    sectionId: "closing",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: null,
        poster: null,
        captionsSrc: null,
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
      es: {
        src: null,
        poster: null,
        captionsSrc: null,
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
    },
  },
] as const;

export type ResolvedChapter6MediaPlacement = {
  id: Chapter6MediaPlacementId;
  label: string;
  sectionId: Chapter6MediaPlacement["sectionId"];
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  mimeType?: string;
  assetStatus: "available" | "missing";
  missingReason: null;
  playbackEndSeconds: number | null;
};

export function resolveChapter6MediaPlacement(
  placement: Chapter6MediaPlacement,
  locale: Locale,
): ResolvedChapter6MediaPlacement {
  const resolved = resolveFounderMediaLocales(placement.locales, locale);
  return {
    id: placement.id,
    label: locale === "es" ? placement.labelEs : placement.label,
    sectionId: placement.sectionId,
    mimeType: placement.mimeType,
    ...resolved,
  };
}

export function getChapter6MediaForSection(
  sectionId: Chapter6MediaPlacement["sectionId"],
  locale: Locale = "en",
): ResolvedChapter6MediaPlacement[] {
  return chapter6MediaPlacements
    .filter((placement) => placement.sectionId === sectionId)
    .map((placement) => resolveChapter6MediaPlacement(placement, locale))
    .filter((placement) =>
      placement.sectionId === "closing" ? Boolean(placement.src) : true,
    );
}

/** Full inventory including missing locales (for audits / wiring readiness). */
export function listChapter6MediaPlacements(
  locale: Locale = "en",
): ResolvedChapter6MediaPlacement[] {
  return chapter6MediaPlacements.map((placement) =>
    resolveChapter6MediaPlacement(placement, locale),
  );
}

export function listMissingChapter6Media(): Array<{
  id: string;
  locale: Locale;
  field: "src" | "captions" | "transcript";
}> {
  return chapter6MediaPlacements.flatMap((placement) =>
    listMissingFounderMediaLocales(placement.id, placement.locales),
  );
}
