/**
 * Row 82 — Architect Dashboard model (server-loaded).
 * Row 83 — Continue action routes incomplete onboarding to /architect/onboarding.
 * Row 84 — Assessment incomplete during onboarding resumes Aliveness assessment.
 */

import { journeyStages } from "@/content/journey-stages";
import { getJourneyStages } from "@/content/journey/localized";
import { getAuthStore } from "@/lib/auth/store";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { userHasActiveEntitlement } from "@/lib/billing/entitlements";
import { getBlueprintDownloadAssets } from "@/lib/blueprint/downloads";
import { getLocalizedPath } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";
import { getAlivenessAssessmentPath } from "@/lib/journey/assessments/paths";
import { resolveResumeSection } from "@/lib/journey/chapters/chapter-1";
import { resolveChapter2ResumeSection } from "@/lib/journey/chapters/chapter-2";
import { resolveChapter3ResumeSection } from "@/lib/journey/chapters/chapter-3";
import { resolveChapter4ResumeSection } from "@/lib/journey/chapters/chapter-4";
import { resolveChapter5ResumeSection } from "@/lib/journey/chapters/chapter-5";
import { resolveChapter6ResumeSection } from "@/lib/journey/chapters/chapter-6";
import { resolveChapter7ResumeSection } from "@/lib/journey/chapters/chapter-7";
import { getChapter2Store } from "@/lib/journey/chapters/chapter-2-store";
import { getChapter3Store } from "@/lib/journey/chapters/chapter-3-store";
import { getChapter4Store } from "@/lib/journey/chapters/chapter-4-store";
import { getChapter5Store } from "@/lib/journey/chapters/chapter-5-store";
import { getChapter6Store } from "@/lib/journey/chapters/chapter-6-store";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";
import {
  getChapter1Path,
  getChapter2Path,
  getChapter3Path,
  getChapter4Path,
  getChapter5Path,
  getChapter6Path,
  getChapter7Path,
} from "@/lib/journey/chapters/paths";
import { getChapter1Store } from "@/lib/journey/chapters/store";
import {
  getOnboardingStateForUser,
} from "@/lib/journey/onboarding/eligibility";
import { getOnboardingPath } from "@/lib/journey/onboarding/paths";
import { resolveResumeStep } from "@/lib/journey/onboarding/service";
import { resolveAuthoritativeCurrentJourneyStage } from "@/lib/lumina/context/current-stage";
import type { LuminaJourneyState } from "@/lib/lumina/context/types";

const RESOURCES_PREVIEW_LIMIT = 4;

export type ArchitectDashboardContinueKind =
  | "checkout"
  | "onboarding"
  | "journey";

export type ArchitectDashboardContinueLabelKey =
  | "continueCheckout"
  | "continueOnboarding"
  | "continueJourney";

export type ArchitectDashboardProgressKind =
  | "no_access"
  | "not_started"
  | "no_progress"
  | "in_progress"
  | "stage_completed"
  | "journey_completed";

export type ArchitectDashboardStateLabelKey =
  | "stateNotStarted"
  | "stateInProgress"
  | "stateStageCompleted"
  | "stateJourneyCompleted"
  | "stateNoAccess";

export type ArchitectDashboardResourcePreview = {
  id: string;
  label: string;
  href: string;
};

export type ArchitectDashboardAssessmentLink = {
  href: string;
  complete: boolean;
} | null;

export type ArchitectDashboardModel = {
  welcome: {
    displayName: string;
  };
  journeyAccess: boolean;
  currentJourney: {
    state: LuminaJourneyState;
    stageId: string | null;
    chapterId: string | null;
    stageLabel: string | null;
    stageOrder: number | null;
    totalStages: number;
    status: string | null;
    updatedAt: string | null;
  };
  progress: {
    kind: ArchitectDashboardProgressKind;
    recorded: boolean;
    /** Honest structural position when a mapped stage exists — never a fabricated %. */
    stageOrder: number | null;
    totalStages: number;
  };
  continue: {
    href: string;
    kind: ArchitectDashboardContinueKind;
    labelKey: ArchitectDashboardContinueLabelKey;
  };
  /** Row 84 — open assessment or results when entitled. */
  assessment: ArchitectDashboardAssessmentLink;
  resourcesPreview: ArchitectDashboardResourcePreview[];
  links: {
    settings: string;
    support: string;
    resources: string;
    billing: string;
    lumina: string;
    journey: string;
  };
  stateLabelKey: ArchitectDashboardStateLabelKey;
};

export function buildArchitectContinueAction(
  journeyAccess: boolean,
  locale: Locale,
  options?: {
    onboardingComplete?: boolean;
    onboardingStep?: ReturnType<typeof resolveResumeStep>;
  },
): ArchitectDashboardModel["continue"] {
  if (!journeyAccess) {
    return {
      href: `${getLocalizedPath("/checkout", locale)}?need=journey_access`,
      kind: "checkout",
      labelKey: "continueCheckout",
    };
  }

  if (!options?.onboardingComplete) {
    const step = options?.onboardingStep;
    // Row 84 — resume dedicated assessment when that is the current step.
    if (step === "assessment") {
      return {
        href: getAlivenessAssessmentPath(locale, "questions"),
        kind: "onboarding",
        labelKey: "continueOnboarding",
      };
    }
    return {
      href: getOnboardingPath(
        locale,
        step && step !== "completed" ? step : undefined,
      ),
      kind: "onboarding",
      labelKey: "continueOnboarding",
    };
  }

  return {
    href: getLocalizedArchitectPath("journey", locale),
    kind: "journey",
    labelKey: "continueJourney",
  };
}

export async function buildArchitectContinueActionWithChapter(
  journeyAccess: boolean,
  locale: Locale,
  options?: {
    onboardingComplete?: boolean;
    onboardingStep?: ReturnType<typeof resolveResumeStep>;
    userId?: string;
  },
): Promise<ArchitectDashboardModel["continue"]> {
  const base = buildArchitectContinueAction(journeyAccess, locale, options);
  if (base.kind !== "journey" || !options?.userId) {
    return base;
  }
  const [chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7] = await Promise.all([
    getChapter1Store().findChapter1ForUser(options.userId),
    getChapter2Store().findChapter2ForUser(options.userId),
    getChapter3Store().findChapter3ForUser(options.userId),
    getChapter4Store().findChapter4ForUser(options.userId),
    getChapter5Store().findChapter5ForUser(options.userId),
    getChapter6Store().findChapter6ForUser(options.userId),
    getChapter7Store().findChapter7ForUser(options.userId),
  ]);

  // Resume the furthest chapter the Architect has started. Progress pointers
  // and chapter records can advance independently of prior completion flags
  // (e.g. Chapter VII opened after Chapter VI), so prefer live chapter state.
  if (chapter7) {
    return {
      ...base,
      href: getChapter7Path(locale, resolveChapter7ResumeSection(chapter7)),
    };
  }
  if (chapter6?.status === "completed") {
    return {
      ...base,
      href: getChapter7Path(locale, "welcome"),
    };
  }
  if (chapter6) {
    return {
      ...base,
      href: getChapter6Path(locale, resolveChapter6ResumeSection(chapter6)),
    };
  }
  if (chapter5?.status === "completed") {
    return {
      ...base,
      href: getChapter6Path(locale, "welcome"),
    };
  }
  if (chapter5) {
    return {
      ...base,
      href: getChapter5Path(locale, resolveChapter5ResumeSection(chapter5)),
    };
  }
  if (chapter4?.status === "completed") {
    return {
      ...base,
      href: getChapter5Path(locale, "welcome"),
    };
  }
  if (chapter4) {
    return {
      ...base,
      href: getChapter4Path(locale, resolveChapter4ResumeSection(chapter4)),
    };
  }
  if (chapter3?.status === "completed") {
    return {
      ...base,
      href: getChapter4Path(locale, "welcome"),
    };
  }
  if (chapter3) {
    return {
      ...base,
      href: getChapter3Path(locale, resolveChapter3ResumeSection(chapter3)),
    };
  }
  if (chapter2?.status === "completed") {
    return {
      ...base,
      href: getChapter3Path(locale, "welcome"),
    };
  }
  if (chapter2) {
    return {
      ...base,
      href: getChapter2Path(locale, resolveChapter2ResumeSection(chapter2)),
    };
  }
  if (chapter1?.status === "completed") {
    return {
      ...base,
      href: getChapter2Path(locale, "welcome"),
    };
  }
  if (!chapter1) {
    return {
      ...base,
      href: getChapter1Path(locale, "welcome"),
    };
  }
  return {
    ...base,
    href: getChapter1Path(locale, resolveResumeSection(chapter1)),
  };
}

function resolveStageLabel(
  stageId: string | null,
  locale: Locale,
): {
  stageLabel: string | null;
  stageOrder: number | null;
} {
  if (!stageId) {
    return { stageLabel: null, stageOrder: null };
  }
  const stage = getJourneyStages(locale).find((entry) => entry.id === stageId);
  if (!stage) {
    return { stageLabel: null, stageOrder: null };
  }
  return { stageLabel: stage.name, stageOrder: stage.order };
}

function resolveProgressKind(
  journeyAccess: boolean,
  state: LuminaJourneyState,
  recorded: boolean,
): ArchitectDashboardProgressKind {
  if (!journeyAccess) {
    return "no_access";
  }
  if (!recorded || state === "not_started") {
    return recorded ? "not_started" : "no_progress";
  }
  if (state === "journey_completed") {
    return "journey_completed";
  }
  if (state === "stage_completed") {
    return "stage_completed";
  }
  return "in_progress";
}

function resolveStateLabelKey(
  journeyAccess: boolean,
  state: LuminaJourneyState,
): ArchitectDashboardStateLabelKey {
  if (!journeyAccess) {
    return "stateNoAccess";
  }
  switch (state) {
    case "in_progress":
      return "stateInProgress";
    case "stage_completed":
      return "stateStageCompleted";
    case "journey_completed":
      return "stateJourneyCompleted";
    case "not_started":
    default:
      return "stateNotStarted";
  }
}

/**
 * Build the Architect Dashboard view model for a single user.
 * Never fabricates chapter completion or progress percentages.
 */
export async function getArchitectDashboardForUser(
  userId: string,
  locale: Locale,
): Promise<ArchitectDashboardModel | null> {
  const trimmed = typeof userId === "string" ? userId.trim() : "";
  if (!trimmed) {
    return null;
  }

  const user = await getAuthStore().findUserById(trimmed);
  if (!user) {
    return null;
  }

  const [journeyAccess, currentJourney, onboarding] = await Promise.all([
    userHasActiveEntitlement(trimmed, "journey_access"),
    resolveAuthoritativeCurrentJourneyStage(trimmed),
    getOnboardingStateForUser(trimmed),
  ]);

  const { stageLabel, stageOrder } = resolveStageLabel(
    currentJourney.stageId,
    locale,
  );
  const totalStages = journeyStages.length;
  // Null progress pointer → source "none" → no progress recorded.
  const recorded = currentJourney.source !== "none";
  const progressKind = resolveProgressKind(
    journeyAccess,
    currentJourney.state,
    recorded,
  );

  const assets = getBlueprintDownloadAssets().slice(0, RESOURCES_PREVIEW_LIMIT);
  const onboardingComplete = onboarding?.status === "completed";
  const onboardingStep = onboarding
    ? resolveResumeStep(onboarding)
    : "welcome";
  const assessmentComplete = Boolean(
    onboarding?.assessment.resultsSnapshot ||
      onboarding?.assessment.completedAt,
  );
  const assessment: ArchitectDashboardAssessmentLink = journeyAccess
    ? {
        href: getAlivenessAssessmentPath(
          locale,
          assessmentComplete ? "results" : "questions",
        ),
        complete: assessmentComplete,
      }
    : null;

  const continueAction = await buildArchitectContinueActionWithChapter(
    journeyAccess,
    locale,
    {
      onboardingComplete,
      onboardingStep,
      userId: trimmed,
    },
  );

  return {
    welcome: {
      displayName: user.firstName.trim() || user.email,
    },
    journeyAccess,
    currentJourney: {
      state: currentJourney.state,
      stageId: currentJourney.stageId,
      chapterId: currentJourney.chapterId,
      stageLabel,
      stageOrder,
      totalStages,
      status: currentJourney.status,
      updatedAt: currentJourney.updatedAt,
    },
    progress: {
      kind: progressKind,
      recorded,
      stageOrder,
      totalStages,
    },
    continue: continueAction,
    assessment,
    resourcesPreview: assets.map((asset) => ({
      id: asset.id,
      label: asset.label,
      href: asset.href,
    })),
    links: {
      settings: getLocalizedArchitectPath("settings", locale),
      support: getLocalizedPath("/support", locale),
      resources: getLocalizedArchitectPath("resources", locale),
      billing: getLocalizedArchitectPath("billing", locale),
      lumina: getLocalizedArchitectPath("lumina", locale),
      journey: getLocalizedArchitectPath("journey", locale),
    },
    stateLabelKey: resolveStateLabelKey(journeyAccess, currentJourney.state),
  };
}
