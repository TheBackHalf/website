import type { SupportPreference } from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";
import type { LuminaMemoryProgress } from "@/lib/lumina/memory/types";

/** Row 77 — server-only Lumina Journey context (never send full object to client). */

export type LuminaJourneyState =
  | "not_started"
  | "in_progress"
  | "stage_completed"
  | "journey_completed";

export type LuminaJourneyStageSource = "memory_progress" | "none" | "fixture";

export type LuminaCurrentJourney = {
  state: LuminaJourneyState;
  stageId: string | null;
  chapterId: string | null;
  status: string | null;
  stepId: null;
  updatedAt: string | null;
  source: LuminaJourneyStageSource;
};

export type LuminaCompletedWorkItem = {
  id: string;
  kind: "stage" | "chapter" | "milestone" | "assessment";
  stageId?: string;
  chapterId?: string;
  label: string;
  completedAt: string;
  /** Must be explicitly marked complete — never inferred. */
  explicit: true;
};

export type LuminaSavedArtifactStatus = "saved" | "available_template";

export type LuminaSavedArtifactItem = {
  id: string;
  artifactId: string;
  label: string;
  status: LuminaSavedArtifactStatus;
  ownerUserId: string;
  /** Metadata only — never raw body content. */
  updatedAt: string | null;
};

export type LuminaUpcomingRequirement = {
  stageId: string;
  chapterId: string;
  kind: "stage";
  /** Structural next from catalog — not fabricated assessments. */
  source: "catalog";
};

export type LuminaRelevantInsight = {
  id: string;
  kind: "decision" | "summary" | "milestone";
  text: string;
  createdAt: string;
  source: string;
};

export type LuminaArchitectContext = {
  preferredName: string;
  pronunciation: string;
  locale: Locale;
  supportPreference: SupportPreference | "";
  timeZone: string;
};

export type LuminaJourneyContextMeta = {
  memoryEnabled: boolean;
  assembledAt: string;
  limits: {
    maxInsights: number;
    maxCompletedWork: number;
    maxSavedArtifacts: number;
  };
};

/** Row 84 — structured Aliveness assessment product state (server-only). */
export type LuminaAlivenessAssessmentContext = {
  status: "not_started" | "in_progress" | "complete";
  total?: number;
  maxTotal?: number;
  domainScores?: Array<{
    domainId: string;
    name: string;
    score: number;
    maxScore: number;
  }>;
  highestDomains?: string[];
  lowestDomains?: string[];
  completedAt?: string;
};

/** Row 85 — Chapter I progress/exercise summary (counts only — no raw answers). */
export type LuminaChapter1Context = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: string;
  completedSectionIds: string[];
  alivenessProject: {
    status: "not_started" | "in_progress" | "complete";
    answerCounts: Record<string, number>;
    targets: Record<string, number>;
    completedAt: string | null;
  };
  completedAt: string | null;
  updatedAt: string;
};

/** Row 86 — Chapter II progress/exercise summary (counts only — no raw answers). */
export type LuminaChapter2Context = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: string;
  completedSectionIds: string[];
  mirrorExercise: {
    status: "not_started" | "in_progress" | "complete";
    step1Count: number;
    step2Count: number;
    step3CompleteRows: number;
    step4FilledDimensions: number;
    targets: {
      step1: number;
      step2: number;
      step3: number;
      step4: number;
    };
    completedAt: string | null;
  };
  completedAt: string | null;
  updatedAt: string;
};

/** Row 87 — Chapter III progress/exercise summary (counts only — no raw answers). */
export type LuminaChapter3Context = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: string;
  completedSectionIds: string[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  practice: {
    status: "not_started" | "in_progress" | "complete";
    hasStatement: boolean;
    completedAt: string | null;
  };
  commitment: {
    status: "not_started" | "in_progress" | "complete";
    affirmed: boolean;
    completedAt: string | null;
  };
  completedAt: string | null;
  updatedAt: string;
};

/** Row 129 — Chapter IV progress/exercise summary (counts only — no raw answers). */
export type LuminaChapter4Context = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: string;
  completedSectionIds: string[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  practice: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  commitment: {
    status: "not_started" | "in_progress" | "complete";
    affirmed: boolean;
    completedAt: string | null;
  };
  completedAt: string | null;
  updatedAt: string;
};

export type LuminaChapter5Context = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: string;
  completedSectionIds: string[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  practice: {
    status: "not_started" | "in_progress" | "complete";
    hasStatement: boolean;
    completedAt: string | null;
  };
  commitment: {
    status: "not_started" | "in_progress" | "complete";
    affirmed: boolean;
    completedAt: string | null;
  };
  completedAt: string | null;
  updatedAt: string;
};

export type LuminaChapter6Context = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: string;
  completedSectionIds: string[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  practice: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  commitment: {
    status: "not_started" | "in_progress" | "complete";
    affirmed: boolean;
    completedAt: string | null;
  };
  completedAt: string | null;
  updatedAt: string;
};

export type LuminaChapter7Context = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId: string;
  completedSectionIds: string[];
  reflection: {
    status: "not_started" | "in_progress" | "complete";
    filledCount: number;
    targetCount: number;
    completedAt: string | null;
  };
  practice: {
    status: "not_started" | "in_progress" | "complete";
    hasStatement: boolean;
    completedAt: string | null;
  };
  commitment: {
    status: "not_started" | "in_progress" | "complete";
    affirmed: boolean;
    completedAt: string | null;
  };
  completedAt: string | null;
  updatedAt: string;
};

export type LuminaJourneyContext = {
  architect: LuminaArchitectContext;
  currentJourney: LuminaCurrentJourney;
  completedWork: LuminaCompletedWorkItem[];
  savedArtifacts: LuminaSavedArtifactItem[];
  upcomingRequirements: LuminaUpcomingRequirement[];
  relevantInsights: LuminaRelevantInsight[];
  /** Journey product state — not gated by conversational memory consent. */
  alivenessAssessment: LuminaAlivenessAssessmentContext;
  /** Row 85 — Chapter I / Awakening exercise progress (metadata only). */
  chapter1: LuminaChapter1Context;
  /** Row 86 — Chapter II / Mirror exercise progress (metadata only). */
  chapter2: LuminaChapter2Context;
  /** Row 87 — Chapter III / Decision exercise progress (metadata only). */
  chapter3: LuminaChapter3Context;
  /** Row 129 — Chapter IV / Standards exercise progress (metadata only). */
  chapter4: LuminaChapter4Context;
  /** Row 130 — Chapter V / Architect exercise progress (metadata only). */
  chapter5: LuminaChapter5Context;
  /** Row 131 — Chapter VI / Expansion exercise progress (metadata only). */
  chapter6: LuminaChapter6Context;
  /** Row 132 — Chapter VII / Beginning exercise progress (metadata only). */
  chapter7: LuminaChapter7Context;
  meta: LuminaJourneyContextMeta;
};

/** Injectable seam for tests/matrix — production default uses progress pointer + empty lists. */
export type JourneyStateAdapter = {
  resolveProgress(userId: string): Promise<LuminaMemoryProgress | null>;
  listCompletedWork(userId: string): Promise<LuminaCompletedWorkItem[]>;
  listSavedArtifacts(userId: string): Promise<LuminaSavedArtifactItem[]>;
  source?: LuminaJourneyStageSource;
};

export type AssembleLuminaJourneyContextOptions = {
  adapter?: JourneyStateAdapter;
  /** Ignored for stage resolution — present only so callers cannot forge stage via client. */
  clientStageHint?: unknown;
};
