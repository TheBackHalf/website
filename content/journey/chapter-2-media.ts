/**
 * Chapter II Founder media placements.
 * Only approved Founder media required by authoritative Chapter II content.
 */

import { founderCaptionPublicPath } from "@/content/journey/founder-captions";
import type { Locale } from "@/lib/i18n/config";
import {
  listMissingFounderMediaLocales,
  resolveFounderMediaLocales,
  type FounderMediaLocales,
} from "@/content/journey/founder-media-locale";

export type Chapter2MediaPlacementId = "video-4";

export type Chapter2MediaPlacement = {
  id: Chapter2MediaPlacementId;
  label: string;
  labelEs: string;
  sectionId: "welcome" | "teaching";
  locales: FounderMediaLocales;
  mimeType?: string;
};

/**
 * Video 4 — Chapter II — The Mirror
 * Source: public/videos/chapter-2/chapter-2-the-mirror.mp4
 *
 * Whisper (small) word timestamps on source audio:
 * Final spoken word "honesty." end = 58.66s
 * Source duration = 59.031s
 * Kimberly ending correction: playback end = 64.16s (last-frame hold)
 *
 * Spanish source: public/videos/chapter 2/Chapter_2-_Seeing_Yourself_Clearly-Spanish.mp4
 */
export const CHAPTER_2_VIDEO_4_HONESTY_END_SECONDS = 58.66;
export const CHAPTER_2_VIDEO_4_SOURCE_DURATION_SECONDS = 59.031;
/** Prior implemented endpoint before this +2.00s extension. */
export const CHAPTER_2_VIDEO_4_PREVIOUS_PLAYBACK_END_SECONDS = 62.16;
export const CHAPTER_2_VIDEO_4_PLAYBACK_END_SECONDS =
  CHAPTER_2_VIDEO_4_PREVIOUS_PLAYBACK_END_SECONDS + 2.0;

export const chapter2MediaPlacements: readonly Chapter2MediaPlacement[] = [
  {
    id: "video-4",
    label: "CHAPTER II — THE MIRROR",
    labelEs: "CAPÍTULO II — EL ESPEJO",
    sectionId: "welcome",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/chapter-2/chapter-2-the-mirror.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("en", "chapter-2-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: CHAPTER_2_VIDEO_4_PLAYBACK_END_SECONDS,
      },
      es: {
        src: "/videos/chapter%202/Chapter_2-_Seeing_Yourself_Clearly-Spanish.mp4",
        poster: null,
        captionsSrc: founderCaptionPublicPath("es", "chapter-2-welcome"),
        transcriptSrc: null,
        playbackEndSeconds: null,
      },
    },
  },
] as const;

export type ResolvedChapter2MediaPlacement = {
  id: Chapter2MediaPlacementId;
  label: string;
  sectionId: Chapter2MediaPlacement["sectionId"];
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  mimeType?: string;
  assetStatus: "available" | "missing";
  missingReason: null;
  playbackEndSeconds: number | null;
};

export function resolveChapter2MediaPlacement(
  placement: Chapter2MediaPlacement,
  locale: Locale,
): ResolvedChapter2MediaPlacement {
  const resolved = resolveFounderMediaLocales(placement.locales, locale);
  return {
    id: placement.id,
    label: locale === "es" ? placement.labelEs : placement.label,
    sectionId: placement.sectionId,
    mimeType: placement.mimeType,
    ...resolved,
  };
}

export function getChapter2MediaForSection(
  sectionId: Chapter2MediaPlacement["sectionId"],
  locale: Locale = "en",
): ResolvedChapter2MediaPlacement[] {
  return chapter2MediaPlacements
    .filter((placement) => placement.sectionId === sectionId)
    .map((placement) => resolveChapter2MediaPlacement(placement, locale));
}

export function listMissingChapter2Media(): Array<{
  id: string;
  locale: Locale;
  field: "src" | "captions" | "transcript";
}> {
  return chapter2MediaPlacements.flatMap((placement) =>
    listMissingFounderMediaLocales(placement.id, placement.locales),
  );
}
