/**
 * Row 50 Founder video production review catalog.
 * Uses the same locale-resolved placements as Architect onboarding / Journey.
 */

import {
  chapter1MediaPlacements,
  resolveChapter1MediaPlacement,
} from "@/content/journey/chapter-1-media";
import {
  chapter2MediaPlacements,
  resolveChapter2MediaPlacement,
} from "@/content/journey/chapter-2-media";
import {
  chapter3MediaPlacements,
  resolveChapter3MediaPlacement,
} from "@/content/journey/chapter-3-media";
import {
  chapter4MediaPlacements,
  resolveChapter4MediaPlacement,
} from "@/content/journey/chapter-4-media";
import {
  chapter5MediaPlacements,
  resolveChapter5MediaPlacement,
} from "@/content/journey/chapter-5-media";
import {
  chapter6MediaPlacements,
  resolveChapter6MediaPlacement,
} from "@/content/journey/chapter-6-media";
import {
  chapter7MediaPlacements,
  resolveChapter7MediaPlacement,
} from "@/content/journey/chapter-7-media";
import type { FounderCaptionJobId } from "@/content/journey/founder-captions";
import { getOnboardingWelcomeMediaPlacement } from "@/content/journey/onboarding-welcome-media";
import type { Locale } from "@/lib/i18n/config";
import {
  getChapter1Path,
  getChapter2Path,
  getChapter3Path,
  getChapter4Path,
  getChapter5Path,
  getChapter6Path,
  getChapter7Path,
} from "@/lib/journey/chapters/paths";
import { getOnboardingPath } from "@/lib/journey/onboarding/paths";

export type FounderVideoReviewItem = {
  id: FounderCaptionJobId;
  locale: Locale;
  languageLabel: string;
  title: string;
  placementPath: string;
  src: string | null;
  captionsSrc: string | null;
  captionsStatus: "available" | "missing";
  assetStatus: "available" | "missing";
};

function requireItem<T>(value: T | undefined, label: string): T {
  if (!value) {
    throw new Error(`Row 50: missing Founder media placement for ${label}`);
  }
  return value;
}

function itemFromResolved(
  id: FounderCaptionJobId,
  locale: Locale,
  title: string,
  placementPath: string,
  resolved: {
    src: string | null;
    captionsSrc: string | null;
    assetStatus: "available" | "missing";
  },
): FounderVideoReviewItem {
  return {
    id,
    locale,
    languageLabel: locale === "es" ? "Spanish" : "English",
    title,
    placementPath,
    src: resolved.src,
    captionsSrc: resolved.captionsSrc,
    captionsStatus: resolved.captionsSrc ? "available" : "missing",
    assetStatus: resolved.assetStatus,
  };
}

export function listFounderVideoProductionReviewItems(): {
  english: FounderVideoReviewItem[];
  spanish: FounderVideoReviewItem[];
} {
  const chapter1 = requireItem(
    chapter1MediaPlacements.find((entry) => entry.id === "video-2"),
    "Chapter I",
  );
  const chapter2 = requireItem(
    chapter2MediaPlacements.find((entry) => entry.id === "video-4"),
    "Chapter II",
  );
  const chapter3 = requireItem(
    chapter3MediaPlacements.find((entry) => entry.id === "chapter-3-welcome"),
    "Chapter III",
  );
  const chapter4 = requireItem(
    chapter4MediaPlacements.find((entry) => entry.id === "chapter-4-welcome"),
    "Chapter IV",
  );
  const chapter5 = requireItem(
    chapter5MediaPlacements.find((entry) => entry.id === "chapter-5-welcome"),
    "Chapter V",
  );
  const chapter6 = requireItem(
    chapter6MediaPlacements.find((entry) => entry.id === "chapter-6-welcome"),
    "Chapter VI",
  );
  const chapter7 = requireItem(
    chapter7MediaPlacements.find((entry) => entry.id === "chapter-7-welcome"),
    "Chapter VII",
  );
  const completion = requireItem(
    chapter7MediaPlacements.find((entry) => entry.id === "chapter-7-complete"),
    "Journey Completion",
  );

  function localeItems(locale: Locale): FounderVideoReviewItem[] {
    return [
      itemFromResolved(
        "founding-architect-welcome",
        locale,
        "Founding Architect Welcome",
        getOnboardingPath(locale, "welcome"),
        getOnboardingWelcomeMediaPlacement(locale),
      ),
      itemFromResolved(
        "chapter-1-welcome",
        locale,
        "Chapter I Welcome",
        getChapter1Path(locale, "welcome"),
        resolveChapter1MediaPlacement(chapter1, locale),
      ),
      itemFromResolved(
        "chapter-2-welcome",
        locale,
        "Chapter II Welcome",
        getChapter2Path(locale, "welcome"),
        resolveChapter2MediaPlacement(chapter2, locale),
      ),
      itemFromResolved(
        "chapter-3-welcome",
        locale,
        "Chapter III Welcome",
        getChapter3Path(locale, "welcome"),
        resolveChapter3MediaPlacement(chapter3, locale),
      ),
      itemFromResolved(
        "chapter-4-welcome",
        locale,
        "Chapter IV Welcome",
        getChapter4Path(locale, "welcome"),
        resolveChapter4MediaPlacement(chapter4, locale),
      ),
      itemFromResolved(
        "chapter-5-welcome",
        locale,
        "Chapter V Welcome",
        getChapter5Path(locale, "welcome"),
        resolveChapter5MediaPlacement(chapter5, locale),
      ),
      itemFromResolved(
        "chapter-6-welcome",
        locale,
        "Chapter VI Welcome",
        getChapter6Path(locale, "welcome"),
        resolveChapter6MediaPlacement(chapter6, locale),
      ),
      itemFromResolved(
        "chapter-7-welcome",
        locale,
        "Chapter VII Welcome",
        getChapter7Path(locale, "welcome"),
        resolveChapter7MediaPlacement(chapter7, locale),
      ),
      itemFromResolved(
        "journey-completion",
        locale,
        "Journey Completion",
        getChapter7Path(locale, "complete"),
        resolveChapter7MediaPlacement(completion, locale),
      ),
    ];
  }

  return {
    english: localeItems("en"),
    spanish: localeItems("es"),
  };
}
