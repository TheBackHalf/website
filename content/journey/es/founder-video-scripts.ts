/**
 * Row 49 — Spanish Founder video scripts.
 * These are the approved Spanish spoken scripts already in the Journey
 * manuscript. Do not rewrite. Do not invent curriculum.
 */

import { chapter1FounderWelcomeRawEs } from "@/content/journey/es/chapter-1";
import { chapter2FounderWelcomeRawEs } from "@/content/journey/es/chapter-2";
import { chapter3FounderWelcomeRawEs } from "@/content/journey/es/chapter-3";
import { chapter4FounderWelcomeRawEs } from "@/content/journey/es/chapter-4";
import { chapter5FounderWelcomeRawEs } from "@/content/journey/es/chapter-5";
import { chapter6FounderWelcomeRawEs } from "@/content/journey/es/chapter-6";
import {
  chapter7FounderCongratulationsRawEs,
  chapter7FounderWelcomeRawEs,
} from "@/content/journey/es/chapter-7";
import {
  onboardingWelcomeParagraphsEs,
  onboardingWelcomeSignatureEs,
} from "@/content/journey/es/onboarding-welcome";
import {
  chapter1MediaPlacements,
  resolveChapter1MediaPlacement,
  type ResolvedChapter1MediaPlacement,
} from "@/content/journey/chapter-1-media";
import {
  chapter2MediaPlacements,
  resolveChapter2MediaPlacement,
  type ResolvedChapter2MediaPlacement,
} from "@/content/journey/chapter-2-media";
import {
  chapter3MediaPlacements,
  resolveChapter3MediaPlacement,
  type ResolvedChapter3MediaPlacement,
} from "@/content/journey/chapter-3-media";
import {
  chapter4MediaPlacements,
  resolveChapter4MediaPlacement,
  type ResolvedChapter4MediaPlacement,
} from "@/content/journey/chapter-4-media";
import {
  chapter5MediaPlacements,
  resolveChapter5MediaPlacement,
  type ResolvedChapter5MediaPlacement,
} from "@/content/journey/chapter-5-media";
import {
  chapter6MediaPlacements,
  resolveChapter6MediaPlacement,
  type ResolvedChapter6MediaPlacement,
} from "@/content/journey/chapter-6-media";
import {
  chapter7MediaPlacements,
  resolveChapter7MediaPlacement,
  type ResolvedChapter7MediaPlacement,
} from "@/content/journey/chapter-7-media";
import {
  getOnboardingWelcomeMediaPlacement,
  type ResolvedOnboardingWelcomeMediaPlacement,
} from "@/content/journey/onboarding-welcome-media";

type Placement =
  | ResolvedOnboardingWelcomeMediaPlacement
  | ResolvedChapter1MediaPlacement
  | ResolvedChapter2MediaPlacement
  | ResolvedChapter3MediaPlacement
  | ResolvedChapter4MediaPlacement
  | ResolvedChapter5MediaPlacement
  | ResolvedChapter6MediaPlacement
  | ResolvedChapter7MediaPlacement;

export type SpanishFounderVideoScriptId =
  | "founding-architect-welcome"
  | "chapter-1-welcome"
  | "chapter-2-welcome"
  | "chapter-3-welcome"
  | "chapter-4-welcome"
  | "chapter-5-welcome"
  | "chapter-6-welcome"
  | "chapter-7-welcome"
  | "journey-completion";

export type SpanishFounderVideoReviewItem = {
  id: SpanishFounderVideoScriptId;
  heading: string;
  journeyLocation: string;
  script: string;
  placement: Placement;
};

const foundingArchitectWelcomeScript = [
  ...onboardingWelcomeParagraphsEs,
  ...onboardingWelcomeSignatureEs,
].join("\n\n");

function requirePlacement<T>(value: T | undefined, label: string): T {
  if (!value) {
    throw new Error(`Row 49: missing Spanish Founder placement for ${label}`);
  }
  return value;
}

export function listSpanishFounderVideoReviewItems(): SpanishFounderVideoReviewItem[] {
  const chapter1 = requirePlacement(
    chapter1MediaPlacements.find((entry) => entry.id === "video-2"),
    "Chapter I",
  );
  const chapter2 = requirePlacement(
    chapter2MediaPlacements.find((entry) => entry.id === "video-4"),
    "Chapter II",
  );
  const chapter3 = requirePlacement(
    chapter3MediaPlacements.find((entry) => entry.id === "chapter-3-welcome"),
    "Chapter III",
  );
  const chapter4 = requirePlacement(
    chapter4MediaPlacements.find((entry) => entry.id === "chapter-4-welcome"),
    "Chapter IV",
  );
  const chapter5 = requirePlacement(
    chapter5MediaPlacements.find((entry) => entry.id === "chapter-5-welcome"),
    "Chapter V",
  );
  const chapter6 = requirePlacement(
    chapter6MediaPlacements.find((entry) => entry.id === "chapter-6-welcome"),
    "Chapter VI",
  );
  const chapter7 = requirePlacement(
    chapter7MediaPlacements.find((entry) => entry.id === "chapter-7-welcome"),
    "Chapter VII",
  );
  const completion = requirePlacement(
    chapter7MediaPlacements.find((entry) => entry.id === "chapter-7-complete"),
    "Journey Completion",
  );

  return [
    {
      id: "founding-architect-welcome",
      heading: "FOUNDING ARCHITECT WELCOME",
      journeyLocation: "Spanish Architect onboarding — Welcome",
      script: foundingArchitectWelcomeScript,
      placement: getOnboardingWelcomeMediaPlacement("es"),
    },
    {
      id: "chapter-1-welcome",
      heading: "CHAPTER I WELCOME",
      journeyLocation: "Spanish Architect Journey — Chapter I Welcome",
      script: chapter1FounderWelcomeRawEs,
      placement: resolveChapter1MediaPlacement(chapter1, "es"),
    },
    {
      id: "chapter-2-welcome",
      heading: "CHAPTER II WELCOME",
      journeyLocation: "Spanish Architect Journey — Chapter II Welcome",
      script: chapter2FounderWelcomeRawEs,
      placement: resolveChapter2MediaPlacement(chapter2, "es"),
    },
    {
      id: "chapter-3-welcome",
      heading: "CHAPTER III WELCOME",
      journeyLocation: "Spanish Architect Journey — Chapter III Welcome",
      script: chapter3FounderWelcomeRawEs,
      placement: resolveChapter3MediaPlacement(chapter3, "es"),
    },
    {
      id: "chapter-4-welcome",
      heading: "CHAPTER IV WELCOME",
      journeyLocation: "Spanish Architect Journey — Chapter IV Welcome",
      script: chapter4FounderWelcomeRawEs,
      placement: resolveChapter4MediaPlacement(chapter4, "es"),
    },
    {
      id: "chapter-5-welcome",
      heading: "CHAPTER V WELCOME",
      journeyLocation: "Spanish Architect Journey — Chapter V Welcome",
      script: chapter5FounderWelcomeRawEs,
      placement: resolveChapter5MediaPlacement(chapter5, "es"),
    },
    {
      id: "chapter-6-welcome",
      heading: "CHAPTER VI WELCOME",
      journeyLocation: "Spanish Architect Journey — Chapter VI Welcome",
      script: chapter6FounderWelcomeRawEs,
      placement: resolveChapter6MediaPlacement(chapter6, "es"),
    },
    {
      id: "chapter-7-welcome",
      heading: "CHAPTER VII WELCOME",
      journeyLocation: "Spanish Architect Journey — Chapter VII Welcome",
      script: chapter7FounderWelcomeRawEs,
      placement: resolveChapter7MediaPlacement(chapter7, "es"),
    },
    {
      id: "journey-completion",
      heading: "JOURNEY COMPLETION",
      journeyLocation: "Spanish Architect Journey — Journey Completion",
      script: chapter7FounderCongratulationsRawEs,
      placement: resolveChapter7MediaPlacement(completion, "es"),
    },
  ];
}
