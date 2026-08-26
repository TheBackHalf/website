import type { SupportPreference } from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";

/** Row 76 — Lumina cross-session memory (no LLM summarization). */

export type LuminaMemorySummarySource = "system" | "explicit" | "fixture";
export type LuminaMemoryDecisionSource = "explicit" | "journey";
export type LuminaMemoryMilestoneSource = "journey" | "explicit";

export type LuminaMemorySummary = {
  id: string;
  text: string;
  sourceConversationId?: string;
  createdAt: string;
  updatedAt: string;
  source: LuminaMemorySummarySource;
};

export type LuminaMemoryDecision = {
  id: string;
  text: string;
  confirmed: true;
  createdAt: string;
  updatedAt: string;
  source: LuminaMemoryDecisionSource;
};

export type LuminaMemoryMilestone = {
  id: string;
  key: string;
  label: string;
  achievedAt: string;
  source: LuminaMemoryMilestoneSource;
};

export type LuminaMemoryProgress = {
  chapterId: string | null;
  status: string | null;
  updatedAt: string | null;
};

export type LuminaMemoryRecord = {
  userId: string;
  enabled: boolean;
  enabledAt?: string;
  disabledAt?: string;
  summaries: LuminaMemorySummary[];
  decisions: LuminaMemoryDecision[];
  milestones: LuminaMemoryMilestone[];
  progress: LuminaMemoryProgress | null;
  updatedAt: string;
};

export type LuminaMemoryIdentity = {
  preferredName: string;
  pronunciation: string;
  locale: Locale;
};

export type LuminaMemoryPreferences = {
  locale: Locale;
  supportPreference: SupportPreference | "";
  timeZone: string;
};

/** Owner-facing bundle: profile identity/preferences + durable memory sections. */
export type LuminaMemoryBundle = {
  identity: LuminaMemoryIdentity;
  preferences: LuminaMemoryPreferences;
  enabled: boolean;
  enabledAt?: string;
  disabledAt?: string;
  summaries: LuminaMemorySummary[];
  decisions: LuminaMemoryDecision[];
  milestones: LuminaMemoryMilestone[];
  progress: LuminaMemoryProgress | null;
  counts: {
    summaries: number;
    decisions: number;
    milestones: number;
  };
};

/** Non-sensitive controls view for settings / chat indicator. */
export type LuminaMemoryControlsView = {
  enabled: boolean;
  counts: {
    summaries: number;
    decisions: number;
    milestones: number;
  };
};

export type LuminaMemoryWriteInput = {
  summary?: {
    id?: string;
    text: string;
    sourceConversationId?: string;
    source?: LuminaMemorySummarySource;
  };
  decision?: {
    id?: string;
    text: string;
    confirmed?: boolean;
    source?: LuminaMemoryDecisionSource;
  };
  milestone?: {
    id?: string;
    key: string;
    label: string;
    achievedAt?: string;
    source?: LuminaMemoryMilestoneSource;
  };
  progress?: {
    chapterId: string | null;
    status: string | null;
    updatedAt?: string | null;
  };
};

export type GetLuminaMemoryBundleResult =
  | { status: "ok"; bundle: LuminaMemoryBundle }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

export type SetLuminaMemoryEnabledResult =
  | { status: "ok"; enabled: boolean }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

export type WriteLuminaMemoryResult =
  | { status: "ok"; bundle: LuminaMemoryBundle }
  | { status: "disabled" }
  | { status: "validation_error"; message: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

export type ClearLuminaMemoryResult =
  | { status: "ok" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error"; message: string };
