/**
 * Chapter I Founder media placements.
 * Only approved Founder media required by authoritative Chapter I content.
 * Do not invent Core Teaching videos or other unapproved placements.
 */

import { founderLaunchMediaA11y } from "@/content/journey/founder-accessibility";
import type { Locale } from "@/lib/i18n/config";
import {
  listMissingFounderMediaLocales,
  resolveFounderMediaLocales,
  type FounderMediaLocales,
} from "@/content/journey/founder-media-locale";

export type Chapter1MediaPlacementId = "video-2";

export type Chapter1MediaPlacement = {
  id: Chapter1MediaPlacementId;
  /** Approved Blueprint / product label. */
  label: string;
  labelEs: string;
  /** Where this placement appears in Chapter I. */
  sectionId: "welcome" | "teaching";
  locales: FounderMediaLocales;
  mimeType?: string;
};

/**
 * Video 2 — Chapter One: The Awakening
 * Approved Founder Welcome video for Chapter I.
 * Production asset: public/videos/chapter-1/chapter-1-the-awakening.mp4
 *
 * Phrase endpoint from Whisper (base) word timestamps on source audio:
 * "beginning." detected word end = 60.00s.
 * Next spoken word "Let's" begins at 60.68s.
 * Applied endpoint = 60.00 + 0.20s natural post-word release = 60.20s
 *
 * Spanish source: public/videos/chapter 1/Chapter_1_The_Awakening-Spanish.mp4
 */
export const CHAPTER_1_VIDEO_2_LETS_BEGIN_END_SECONDS = 60.2;

export const chapter1MediaPlacements: readonly Chapter1MediaPlacement[] = [
  {
    id: "video-2",
    label: "Chapter One: The Awakening",
    labelEs: "Capítulo Uno: El Despertar",
    sectionId: "welcome",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/chapter-1/chapter-1-the-awakening.mp4",
        ...founderLaunchMediaA11y("en", "chapter-1-welcome"),
        playbackEndSeconds: CHAPTER_1_VIDEO_2_LETS_BEGIN_END_SECONDS,
      },
      es: {
        src: "/videos/chapter%201/Chapter_1_The_Awakening-Spanish.mp4",
        ...founderLaunchMediaA11y("es", "chapter-1-welcome"),
        playbackEndSeconds: null,
      },
    },
  },
] as const;

export type ResolvedChapter1MediaPlacement = {
  id: Chapter1MediaPlacementId;
  label: string;
  sectionId: Chapter1MediaPlacement["sectionId"];
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  mimeType?: string;
  assetStatus: "available" | "missing";
  missingReason: null;
  playbackEndSeconds: number | null;
};

export function resolveChapter1MediaPlacement(
  placement: Chapter1MediaPlacement,
  locale: Locale,
): ResolvedChapter1MediaPlacement {
  const resolved = resolveFounderMediaLocales(placement.locales, locale);
  return {
    id: placement.id,
    label: locale === "es" ? placement.labelEs : placement.label,
    sectionId: placement.sectionId,
    mimeType: placement.mimeType,
    ...resolved,
  };
}

export function getChapter1MediaForSection(
  sectionId: Chapter1MediaPlacement["sectionId"],
  locale: Locale = "en",
): ResolvedChapter1MediaPlacement[] {
  return chapter1MediaPlacements
    .filter((placement) => placement.sectionId === sectionId)
    .map((placement) => resolveChapter1MediaPlacement(placement, locale));
}

export function listMissingChapter1Media(): Array<{
  id: string;
  locale: Locale;
  field: "src" | "captions" | "transcript" | "poster";
}> {
  return chapter1MediaPlacements.flatMap((placement) =>
    listMissingFounderMediaLocales(placement.id, placement.locales),
  );
}
