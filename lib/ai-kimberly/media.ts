import { getOnboardingWelcomeMediaPlacement } from "@/content/journey/onboarding-welcome-media";
import { listFounderVideoProductionReviewItems } from "@/content/journey/founder-video-inventory";
import { resolveFounderMediaLocales } from "@/content/journey/founder-media-locale";
import type { Locale } from "@/lib/i18n/config";

export type FounderConversationMedia = {
  src: string | null;
  captionsSrc: string | null;
  assetStatus: "available" | "missing";
  locale: Locale;
};

/**
 * Spoken/avatar media for the Architect Founder Conversation.
 * Uses the locale-resolved Founding Architect Welcome — never English fallback in Español.
 */
export function resolveFounderConversationMedia(
  locale: Locale,
): FounderConversationMedia {
  const placement = getOnboardingWelcomeMediaPlacement(locale);
  return {
    src: placement.src,
    captionsSrc: placement.captionsSrc,
    assetStatus: placement.assetStatus,
    locale,
  };
}

export type LaunchFounderSpeechSurface = {
  id: string;
  locale: Locale;
  src: string | null;
  captionsSrc: string | null;
  assetStatus: "available" | "missing";
};

/** Launch-critical spoken Founder / avatar surfaces (Journey + onboarding). */
export function listLaunchFounderSpeechSurfaces(): LaunchFounderSpeechSurface[] {
  const { english, spanish } = listFounderVideoProductionReviewItems();
  return [...english, ...spanish].map((item) => ({
    id: item.id,
    locale: item.locale,
    src: item.src,
    captionsSrc: item.captionsSrc,
    assetStatus: item.assetStatus,
  }));
}

/**
 * True when Español would play an English-only file (forbidden).
 * Missing Spanish assets must stay missing — never substitute English src.
 */
export function spanishSpeechUsesEnglishPlayback(
  enSrc: string | null,
  esSrc: string | null,
): boolean {
  if (!esSrc) {
    return false;
  }
  if (!enSrc) {
    return false;
  }
  const normalize = (value: string) => decodeURIComponent(value).toLowerCase();
  const es = normalize(esSrc);
  const en = normalize(enSrc);
  if (es === en) {
    return true;
  }
  const looksSpanish =
    es.includes("spanish") ||
    es.includes("-es.") ||
    es.includes("/es-") ||
    es.includes("español") ||
    es.includes("espanol");
  return !looksSpanish && es === en;
}

export function assertNoEnglishFallback(locales: {
  en: { src: string | null };
  es: { src: string | null };
}): { en: string | null; es: string | null; substituted: boolean } {
  const resolvedEs = resolveFounderMediaLocales(
    {
      en: { src: locales.en.src },
      es: { src: locales.es.src },
    },
    "es",
  );
  return {
    en: locales.en.src,
    es: resolvedEs.src,
    substituted: Boolean(
      locales.es.src == null &&
        locales.en.src &&
        resolvedEs.src === locales.en.src,
    ),
  };
}
