/**
 * Row 135 — Completion and Threshold Ceremony (engineering spec).
 *
 * Hosted on Chapter VII complete after journey_completed. Not a second
 * product surface. Nia verifies Triple E; Founder acceptance stays with
 * Kimberly Walker (human).
 *
 * Participant-facing title is Journey Completion (existing Founder media
 * label). "Threshold ceremony" is the engineering name only.
 */

import {
  ROW33_COMMUNITY_COMING_COPY,
  ROW33_COMMUNITY_LAUNCH_DATE,
} from "@/lib/marketing-claims/standard";
import { getBlueprintDownloadAssets } from "@/lib/blueprint/downloads";
import {
  chapter7FounderCongratulationsRaw,
} from "@/content/journey/chapter-7-beginning";
import { chapter7FounderCongratulationsRawEs } from "@/content/journey/es/chapter-7";
import { getChapter7Path } from "@/lib/journey/chapters/paths";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedPath } from "@/lib/i18n/routing";

export const THRESHOLD_CEREMONY_ID = "threshold-ceremony" as const;
export const THRESHOLD_CEREMONY_HOST_SECTION = "complete" as const;
export const THRESHOLD_CEREMONY_LUMINA_TOPIC = "threshold" as const;

export const THRESHOLD_CEREMONY_ELEMENT_IDS = [
  "lumina_reflection",
  "certificate",
  "founder_congratulations",
  "portfolio",
  "community_invitation",
] as const;

export type ThresholdCeremonyElementId =
  (typeof THRESHOLD_CEREMONY_ELEMENT_IDS)[number];

export const THRESHOLD_PORTFOLIO_ASSET_IDS = [
  "guidebook",
  "aliveness-index",
  "decision-statement",
  "back-half-standards",
  "architect-identity",
  "expansion-plan",
  "declaration",
  "certificate",
] as const;

export type ThresholdPortfolioAssetId =
  (typeof THRESHOLD_PORTFOLIO_ASSET_IDS)[number];

const PORTFOLIO_RELATIONS: Record<ThresholdPortfolioAssetId, string> = {
  guidebook: "Personalized Blueprint guidebook assembled from saved Journey work.",
  "aliveness-index": "Aliveness Index from Chapter I / Awakening.",
  "decision-statement": "Decision Statement from Chapter III.",
  "back-half-standards": "Back Half Standards from Chapter IV.",
  "architect-identity": "Architect Identity Statement from Chapter V.",
  "expansion-plan": "Expansion Plan from Chapter VI.",
  declaration: "Back Half Declaration from Chapter VII.",
  certificate: "Architect Completion Certificate after Journey completion.",
};

export function isThresholdCeremonyUnlocked(
  chapter7Status: string | null | undefined,
): boolean {
  return chapter7Status === "completed";
}

export function isCertificateAvailableAfterJourney(
  chapter7Status: string | null | undefined,
): boolean {
  return isThresholdCeremonyUnlocked(chapter7Status);
}

export function getThresholdCeremonyPath(locale: Locale): string {
  return getChapter7Path(locale, THRESHOLD_CEREMONY_HOST_SECTION);
}

export function getThresholdLuminaReflectionPath(locale: Locale): string {
  const lumina =
    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";
  return `${lumina}?topic=${THRESHOLD_CEREMONY_LUMINA_TOPIC}`;
}

export function getCommunityInvitationCheckoutPath(locale: Locale): string {
  return getLocalizedPath("/checkout/community", locale);
}

export function getApprovedFounderCongratulations(locale: Locale): string {
  return locale === "es"
    ? chapter7FounderCongratulationsRawEs
    : chapter7FounderCongratulationsRaw;
}

export type ThresholdPortfolioAsset = {
  id: ThresholdPortfolioAssetId;
  label: string;
  href: string;
  relation: string;
};

export function getThresholdPortfolioAssets(): ThresholdPortfolioAsset[] {
  const all = getBlueprintDownloadAssets();
  const byId = new Map(all.map((asset) => [asset.id, asset]));
  const selected: ThresholdPortfolioAsset[] = [];

  for (const id of THRESHOLD_PORTFOLIO_ASSET_IDS) {
    const asset = byId.get(id);
    if (!asset) continue;
    selected.push({
      id,
      label: asset.label,
      href: asset.href,
      relation: PORTFOLIO_RELATIONS[id],
    });
  }

  return selected;
}

export type CommunityInvitationCopy = {
  coming: string;
  launchDate: string;
  liveOnAugust31: false;
  foundingInclusion:
    "first six months of Architect Community access commencing October 25, 2026 through April 25, 2027";
  standaloneOffer:
    "$50/month after Blueprint completion. Architect Community — Coming October 25, 2026.";
  communityAccess: boolean;
};

export function getCommunityInvitationCopy(
  communityAccess: boolean,
  locale: Locale = "en",
): CommunityInvitationCopy {
  const coming =
    locale === "es"
      ? "Architect Community — Próximamente el 25 de octubre de 2026"
      : ROW33_COMMUNITY_COMING_COPY;

  return {
    coming,
    launchDate: ROW33_COMMUNITY_LAUNCH_DATE,
    liveOnAugust31: false,
    foundingInclusion:
      "first six months of Architect Community access commencing October 25, 2026 through April 25, 2027",
    standaloneOffer:
      "$50/month after Blueprint completion. Architect Community — Coming October 25, 2026.",
    communityAccess,
  };
}

export type ThresholdCeremonySpec = {
  id: typeof THRESHOLD_CEREMONY_ID;
  hostSection: typeof THRESHOLD_CEREMONY_HOST_SECTION;
  luminaTopic: typeof THRESHOLD_CEREMONY_LUMINA_TOPIC;
  elements: readonly ThresholdCeremonyElementId[];
  unlocked: boolean;
  portfolioAssetIds: readonly ThresholdPortfolioAssetId[];
};

export function getThresholdCeremonySpec(
  chapter7Status: string | null | undefined,
): ThresholdCeremonySpec {
  return {
    id: THRESHOLD_CEREMONY_ID,
    hostSection: THRESHOLD_CEREMONY_HOST_SECTION,
    luminaTopic: THRESHOLD_CEREMONY_LUMINA_TOPIC,
    elements: THRESHOLD_CEREMONY_ELEMENT_IDS,
    unlocked: isThresholdCeremonyUnlocked(chapter7Status),
    portfolioAssetIds: THRESHOLD_PORTFOLIO_ASSET_IDS,
  };
}

export function ceremonyImpliesLiveCommunity(text: string): boolean {
  const normalized = text.toLowerCase();
  if (normalized.includes("coming october 25")) return false;
  if (normalized.includes("próximamente el 25 de octubre")) return false;
  if (normalized.includes("launches october 25")) return false;
  return (
    /community is (now )?live/i.test(text) ||
    /join the (architect )?community (now|today)/i.test(text) ||
    /first year inside the architect community/i.test(text)
  );
}
