/**
 * Chapter III Founder media placements.
 * Only approved Founder media required by authoritative Chapter III content.
 */

import { founderCaptionPublicPath } from "@/content/journey/founder-captions";
import type { Locale } from "@/lib/i18n/config";
import {
  listMissingFounderMediaLocales,
  resolveFounderMediaLocales,
  type FounderMediaLocales,
} from "@/content/journey/founder-media-locale";

export type Chapter3MediaPlacementId =
  | "chapter-3-welcome"
  | "chapter-3-closing";

export type Chapter3MediaPlacement = {
  id: Chapter3MediaPlacementId;
  label: string;
  labelEs: string;
  sectionId: "welcome" | "teaching" | "closing";
  locales: FounderMediaLocales;
  mimeType?: string;
};

/**
 * Chapter III — The Decision / Choosing Intention (Founder Welcome)
 * Production EN asset: public/videos/chapter-3/chapter-3-choosing-intention.mp4
 * Source dialogue ends ~43.76s; file includes a 3s final-frame hold (≈46.76s total).
 *
 * Spanish welcome: public/videos/chapter 3/Chapter_3_Choosing_Intention-Spanish.mp4
 * Closing Founder video (EN + ES): not present in project.
 */
export const chapter3MediaPlacements: readonly Chapter3MediaPlacement[] = [
  {
    id: "chapter-3-welcome",
    label: "Chapter Three — The Decision",
    labelEs: "Capítulo Tres — La Decisión",
    sectionId: "welcome",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/chapter-3/chapter-3-choosing-intention.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("en", "chapter-3-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
      es: {
        src: "/videos/chapter%203/Chapter_3_Choosing_Intention-Spanish.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("es", "chapter-3-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
    },
  },
  {
    id: "chapter-3-closing",
    label: "Chapter Three — Founder Closing Reflection",
    labelEs: "Capítulo Tres — Reflexión de cierre del Founder",
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

export type ResolvedChapter3MediaPlacement = {
  id: Chapter3MediaPlacementId;
  label: string;
  sectionId: Chapter3MediaPlacement["sectionId"];
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  mimeType?: string;
  assetStatus: "available" | "missing";
  missingReason: null;
  playbackEndSeconds: number | null;
};

export function resolveChapter3MediaPlacement(
  placement: Chapter3MediaPlacement,
  locale: Locale,
): ResolvedChapter3MediaPlacement {
  const resolved = resolveFounderMediaLocales(placement.locales, locale);
  return {
    id: placement.id,
    label: locale === "es" ? placement.labelEs : placement.label,
    sectionId: placement.sectionId,
    mimeType: placement.mimeType,
    ...resolved,
  };
}

export function getChapter3MediaForSection(
  sectionId: Chapter3MediaPlacement["sectionId"],
  locale: Locale = "en",
): ResolvedChapter3MediaPlacement[] {
  return chapter3MediaPlacements
    .filter((placement) => placement.sectionId === sectionId)
    .map((placement) => resolveChapter3MediaPlacement(placement, locale))
    // Closing stays text-only until an approved closing asset exists for
    // the active locale. Welcome always returns so Spanish can show the
    // unavailable placement without falling back to English video.
    .filter((placement) =>
      placement.sectionId === "closing"
        ? Boolean(placement.src)
        : true,
    );
}

/** Full inventory including missing locales (for audits / wiring readiness). */
export function listChapter3MediaPlacements(
  locale: Locale = "en",
): ResolvedChapter3MediaPlacement[] {
  return chapter3MediaPlacements.map((placement) =>
    resolveChapter3MediaPlacement(placement, locale),
  );
}

export function listMissingChapter3Media(): Array<{
  id: string;
  locale: Locale;
  field: "src" | "captions" | "transcript";
}> {
  return chapter3MediaPlacements.flatMap((placement) =>
    listMissingFounderMediaLocales(placement.id, placement.locales),
  );
}
