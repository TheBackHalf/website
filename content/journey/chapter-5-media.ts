/**
 * Chapter V Founder media placements.
 * Only approved Founder media required by authoritative Chapter V content.
 */

import { founderCaptionPublicPath } from "@/content/journey/founder-captions";
import type { Locale } from "@/lib/i18n/config";
import {
  listMissingFounderMediaLocales,
  resolveFounderMediaLocales,
  type FounderMediaLocales,
} from "@/content/journey/founder-media-locale";

export type Chapter5MediaPlacementId =
  | "chapter-5-welcome"
  | "chapter-5-closing";

export type Chapter5MediaPlacement = {
  id: Chapter5MediaPlacementId;
  label: string;
  labelEs: string;
  sectionId: "welcome" | "teaching" | "closing";
  locales: FounderMediaLocales;
  mimeType?: string;
};

/**
 * Chapter V — Becoming the Architect (Founder Welcome)
 * Production EN asset: public/videos/chapter-5/chapter-5-becoming-the-architect.mp4
 * Source: public/videos/chapter 5/Chapter 5_ Becoming the Architect_1080p.mp4
 *
 * Spanish welcome: public/videos/chapter 5/Chapter_5_Becoming_the_Architect-Spanish.mp4
 * Closing Founder video (EN + ES): not present in project.
 */
export const chapter5MediaPlacements: readonly Chapter5MediaPlacement[] = [
  {
    id: "chapter-5-welcome",
    label: "Chapter Five — Becoming the Architect",
    labelEs: "Capítulo Cinco — Convertirse en Architect",
    sectionId: "welcome",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/chapter-5/chapter-5-becoming-the-architect.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("en", "chapter-5-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
      es: {
        src: "/videos/chapter%205/Chapter_5_Becoming_the_Architect-Spanish.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("es", "chapter-5-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
    },
  },
  {
    id: "chapter-5-closing",
    label: "Chapter Five — Founder Closing Reflection",
    labelEs: "Capítulo Cinco — Reflexión de cierre del Founder",
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

export type ResolvedChapter5MediaPlacement = {
  id: Chapter5MediaPlacementId;
  label: string;
  sectionId: Chapter5MediaPlacement["sectionId"];
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  mimeType?: string;
  assetStatus: "available" | "missing";
  missingReason: null;
  playbackEndSeconds: number | null;
};

export function resolveChapter5MediaPlacement(
  placement: Chapter5MediaPlacement,
  locale: Locale,
): ResolvedChapter5MediaPlacement {
  const resolved = resolveFounderMediaLocales(placement.locales, locale);
  return {
    id: placement.id,
    label: locale === "es" ? placement.labelEs : placement.label,
    sectionId: placement.sectionId,
    mimeType: placement.mimeType,
    ...resolved,
  };
}

export function getChapter5MediaForSection(
  sectionId: Chapter5MediaPlacement["sectionId"],
  locale: Locale = "en",
): ResolvedChapter5MediaPlacement[] {
  return chapter5MediaPlacements
    .filter((placement) => placement.sectionId === sectionId)
    .map((placement) => resolveChapter5MediaPlacement(placement, locale))
    .filter((placement) =>
      placement.sectionId === "closing" ? Boolean(placement.src) : true,
    );
}

/** Full inventory including missing locales (for audits / wiring readiness). */
export function listChapter5MediaPlacements(
  locale: Locale = "en",
): ResolvedChapter5MediaPlacement[] {
  return chapter5MediaPlacements.map((placement) =>
    resolveChapter5MediaPlacement(placement, locale),
  );
}

export function listMissingChapter5Media(): Array<{
  id: string;
  locale: Locale;
  field: "src" | "captions" | "transcript";
}> {
  return chapter5MediaPlacements.flatMap((placement) =>
    listMissingFounderMediaLocales(placement.id, placement.locales),
  );
}
