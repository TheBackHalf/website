/**
 * Row 83 — Architect onboarding Founder Welcome media.
 * Approved source only — do not invent or substitute Founder media.
 */

import { founderLaunchMediaA11y } from "@/content/journey/founder-accessibility";
import type { Locale } from "@/lib/i18n/config";
import {
  listMissingFounderMediaLocales,
  resolveFounderMediaLocales,
  type FounderMediaLocales,
} from "@/content/journey/founder-media-locale";

export type OnboardingWelcomeMediaPlacementId = "welcome-video";

export type OnboardingWelcomeMediaPlacement = {
  id: OnboardingWelcomeMediaPlacementId;
  label: string;
  locales: FounderMediaLocales;
  mimeType?: string;
};

/**
 * Founder Welcome — Architect onboarding (Row 83)
 * EN: public/videos/onboarding/founding-architect-welcome.mp4 (~112.77s)
 * ES: public/videos/Founding Architect Welcome/Founding_Architect_Welcome-Spanish.mp4
 */
export const ONBOARDING_WELCOME_SOURCE_DURATION_SECONDS = 112.77;

export const onboardingWelcomeMediaPlacement: OnboardingWelcomeMediaPlacement =
  {
    id: "welcome-video",
    label: "WELCOME TO THE BACK HALF",
    mimeType: "video/mp4",
    locales: {
      en: {
        src: "/videos/onboarding/founding-architect-welcome.mp4",
        ...founderLaunchMediaA11y("en", "founding-architect-welcome"),
        playbackEndSeconds: null,
      },
      es: {
        src: "/videos/Founding%20Architect%20Welcome/Founding_Architect_Welcome-Spanish.mp4",
        ...founderLaunchMediaA11y("es", "founding-architect-welcome"),
        playbackEndSeconds: null,
      },
    },
  };

export type ResolvedOnboardingWelcomeMediaPlacement = {
  id: OnboardingWelcomeMediaPlacementId;
  label: string;
  src: string | null;
  poster: string | null;
  captionsSrc: string | null;
  transcriptSrc: string | null;
  mimeType?: string;
  assetStatus: "available" | "missing";
  missingReason: null;
  playbackEndSeconds: number | null;
};

export function getOnboardingWelcomeMediaPlacement(
  locale: Locale = "en",
): ResolvedOnboardingWelcomeMediaPlacement {
  const resolved = resolveFounderMediaLocales(
    onboardingWelcomeMediaPlacement.locales,
    locale,
  );
  return {
    id: onboardingWelcomeMediaPlacement.id,
    label: onboardingWelcomeMediaPlacement.label,
    mimeType: onboardingWelcomeMediaPlacement.mimeType,
    ...resolved,
  };
}

export function listMissingOnboardingWelcomeMedia(): Array<{
  id: string;
  locale: Locale;
  field: "src" | "captions" | "transcript" | "poster";
}> {
  return listMissingFounderMediaLocales(
    onboardingWelcomeMediaPlacement.id,
    onboardingWelcomeMediaPlacement.locales,
  );
}
