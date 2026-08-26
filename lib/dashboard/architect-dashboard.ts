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
import {
  getOnboardingStateForUser,
} from "@/lib/journey/onboarding/eligibility";
import { getOnboardingPath } from "@/lib/journey/onboarding/paths";
import { resolveResumeStep } from "@/lib/journey/onboarding/service";
import { resolveJourneyContinueHref } from "@/lib/journey/progress/paths";
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
  const href = await resolveJourneyContinueHref(locale, options.userId);
  return { ...base, href };
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
