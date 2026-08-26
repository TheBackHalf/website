/**
 * Chapter VII Founder media placements.
 * Only approved Founder media required by authoritative Chapter VII content.
 */

import { founderLaunchMediaA11y } from "@/content/journey/founder-accessibility";
import type { Locale } from "@/lib/i18n/config";
import {
  listMissingFounderMediaLocales,
  resolveFounderMediaLocales,
  type FounderMediaLocales,
} from "@/content/journey/founder-media-locale";

export type Chapter7MediaPlacementId =
  | "chapter-7-welcome"
  | "chapter-7-closing"
  | "chapter-7-complete";

export type Chapter7MediaPlacement = {
  id: Chapter7MediaPlacementId;
  label: string;
  labelEs: string;
  sectionId: "welcome" | "teaching" | "closing" | "complete";
  locales: FounderMediaLocales;
  mimeType?: string;
};

/**
 * Chapter VII — The Beginning (Founder Welcome)
 * Production EN asset: public/videos/chapter-7/chapter-7-beginning.mp4
 * Source: public/videos/chapter 7/Chapter 7_ Living Your Back Half_1080p.mp4
 *
 * Journey completion EN asset: public/videos/chapter-7/chapter-7-journey-completion.mp4
 * Source: public/videos/journey completion/Journey Completion_1080p.mp4
 *
 * Spanish welcome: public/videos/chapter 7/Chapter_7_Living_Your_Back_Half-Spanish.mp4
 * Spanish completion: public/videos/journey completion/Journey_Completion-Spanish.mp4
 * Closing Founder video (EN + ES): not present.
 */
export const chapter7MediaPlacements: readonly Chapter7MediaPlacement[] = [
  {
    id: "chapter-7-welcome",
    label: "Chapter Seven — The Beginning",
    labelEs: "Capítulo Siete — El Comienzo",
    sectionId: "welcome",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/chapter-7/chapter-7-beginning.mp4",
        ...founderLaunchMediaA11y("en", "chapter-7-welcome"),
        playbackEndSeconds: null,
      },
      es: {
        src: "/videos/chapter%207/Chapter_7_Living_Your_Back_Half-Spanish.mp4",
        ...founderLaunchMediaA11y("es", "chapter-7-welcome"),
        playbackEndSeconds: null,
      },
    },
  },
  {
    id: "chapter-7-closing",
    label: "Chapter Seven — Founder Closing Reflection",
    labelEs: "Capítulo Siete — Reflexión de cierre del Founder",
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
  {
    id: "chapter-7-complete",
    label: "Journey Completion",
    labelEs: "Finalización del Journey",
    sectionId: "complete",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/chapter-7/chapter-7-journey-completion.mp4",
        ...founderLaunchMediaA11y("en", "journey-completion"),
        playbackEndSeconds: null,
      },
      es: {
        src: "/videos/journey%20completion/Journey_Completion-Spanish.mp4",
        ...founderLaunchMediaA11y("es", "journey-completion"),
        playbackEndSeconds: null,
      },
    },
  },
] as const;

export type ResolvedChapter7MediaPlacement = {
  id: Chapter7MediaPlacementId;
  label: string;
  sectionId: Chapter7MediaPlacement["sectionId"];
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  mimeType?: string;
  assetStatus: "available" | "missing";
  missingReason: null;
  playbackEndSeconds: number | null;
};

export function resolveChapter7MediaPlacement(
  placement: Chapter7MediaPlacement,
  locale: Locale,
): ResolvedChapter7MediaPlacement {
  const resolved = resolveFounderMediaLocales(placement.locales, locale);
  return {
    id: placement.id,
    label: locale === "es" ? placement.labelEs : placement.label,
    sectionId: placement.sectionId,
    mimeType: placement.mimeType,
    ...resolved,
  };
}

export function getChapter7MediaForSection(
  sectionId: Chapter7MediaPlacement["sectionId"],
  locale: Locale = "en",
): ResolvedChapter7MediaPlacement[] {
  return chapter7MediaPlacements
    .filter((placement) => placement.sectionId === sectionId)
    .map((placement) => resolveChapter7MediaPlacement(placement, locale))
    .filter((placement) =>
      placement.sectionId === "closing" ? Boolean(placement.src) : true,
    );
}

export function listChapter7MediaPlacements(
  locale: Locale = "en",
): ResolvedChapter7MediaPlacement[] {
  return chapter7MediaPlacements.map((placement) =>
    resolveChapter7MediaPlacement(placement, locale),
  );
}

export function listMissingChapter7Media(): Array<{
  id: string;
  locale: Locale;
  field: "src" | "captions" | "transcript" | "poster";
}> {
  return chapter7MediaPlacements.flatMap((placement) =>
    listMissingFounderMediaLocales(placement.id, placement.locales),
  );
}
