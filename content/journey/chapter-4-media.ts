/**
 * Chapter IV Founder media placements.
 * Only approved Founder media required by authoritative Chapter IV content.
 */

import { founderCaptionPublicPath } from "@/content/journey/founder-captions";
import type { Locale } from "@/lib/i18n/config";
import {
  listMissingFounderMediaLocales,
  resolveFounderMediaLocales,
  type FounderMediaLocales,
} from "@/content/journey/founder-media-locale";

export type Chapter4MediaPlacementId =
  | "chapter-4-welcome"
  | "chapter-4-closing";

export type Chapter4MediaPlacement = {
  id: Chapter4MediaPlacementId;
  label: string;
  labelEs: string;
  sectionId: "welcome" | "teaching" | "closing";
  locales: FounderMediaLocales;
  mimeType?: string;
};

/**
 * Chapter IV — The Standards / Creating Your Standards (Founder Welcome)
 * Production EN asset: public/videos/chapter-4/chapter-4-creating-your-standards.mp4
 * Source: public/videos/chapter 4/Chapter 4_ Creating Your Standards_1080p.mp4
 *
 * Spanish welcome: public/videos/chapter 4/Chapter_4_Creating_Your_Standards-Spanish.mp4
 * Closing Founder video (EN + ES): not present in project.
 */
export const chapter4MediaPlacements: readonly Chapter4MediaPlacement[] = [
  {
    id: "chapter-4-welcome",
    label: "Chapter Four — The Standards",
    labelEs: "Capítulo Cuatro — Los Estándares",
    sectionId: "welcome",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/chapter-4/chapter-4-creating-your-standards.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("en", "chapter-4-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
      es: {
        src: "/videos/chapter%204/Chapter_4_Creating_Your_Standards-Spanish.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("es", "chapter-4-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
    },
  },
  {
    id: "chapter-4-closing",
    label: "Chapter Four — Founder Closing Reflection",
    labelEs: "Capítulo Cuatro — Reflexión de cierre del Founder",
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

export type ResolvedChapter4MediaPlacement = {
  id: Chapter4MediaPlacementId;
  label: string;
  sectionId: Chapter4MediaPlacement["sectionId"];
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  mimeType?: string;
  assetStatus: "available" | "missing";
  missingReason: null;
  playbackEndSeconds: number | null;
};

export function resolveChapter4MediaPlacement(
  placement: Chapter4MediaPlacement,
  locale: Locale,
): ResolvedChapter4MediaPlacement {
  const resolved = resolveFounderMediaLocales(placement.locales, locale);
  return {
    id: placement.id,
    label: locale === "es" ? placement.labelEs : placement.label,
    sectionId: placement.sectionId,
    mimeType: placement.mimeType,
    ...resolved,
  };
}

export function getChapter4MediaForSection(
  sectionId: Chapter4MediaPlacement["sectionId"],
  locale: Locale = "en",
): ResolvedChapter4MediaPlacement[] {
  return chapter4MediaPlacements
    .filter((placement) => placement.sectionId === sectionId)
    .map((placement) => resolveChapter4MediaPlacement(placement, locale))
    .filter((placement) =>
      placement.sectionId === "closing" ? Boolean(placement.src) : true,
    );
}

/** Full inventory including missing locales (for audits / wiring readiness). */
export function listChapter4MediaPlacements(
  locale: Locale = "en",
): ResolvedChapter4MediaPlacement[] {
  return chapter4MediaPlacements.map((placement) =>
    resolveChapter4MediaPlacement(placement, locale),
  );
}

export function listMissingChapter4Media(): Array<{
  id: string;
  locale: Locale;
  field: "src" | "captions" | "transcript";
}> {
  return chapter4MediaPlacements.flatMap((placement) =>
    listMissingFounderMediaLocales(placement.id, placement.locales),
  );
}
