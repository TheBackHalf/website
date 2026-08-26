import { toArchitectProfileView } from "@/lib/account/profile";
import { getAuthStore } from "@/lib/auth/store";
import type { UserRecord } from "@/lib/auth/types";
import { getLuminaMemoryStore } from "@/lib/lumina/memory/store";
import type {
  LuminaMemoryBundle,
  LuminaMemoryControlsView,
  LuminaMemoryRecord,
} from "@/lib/lumina/memory/types";

/**
 * Clean retrieval shape for later prompt/context rows.
 * Never logs private memory content.
 */
export type LuminaMemoryRetrieval = {
  userId: string;
  enabled: boolean;
  identity: LuminaMemoryBundle["identity"];
  preferences: LuminaMemoryBundle["preferences"];
  /** Durable sections — empty when memory is disabled. */
  durable: {
    summaries: LuminaMemoryBundle["summaries"];
    decisions: LuminaMemoryBundle["decisions"];
    milestones: LuminaMemoryBundle["milestones"];
    progress: LuminaMemoryBundle["progress"];
  };
  counts: LuminaMemoryBundle["counts"];
};

function identityFromUser(user: UserRecord): LuminaMemoryBundle["identity"] {
  const profile = toArchitectProfileView(user);
  return {
    preferredName: profile.firstName,
    pronunciation: profile.pronunciation,
    locale: profile.locale,
  };
}

function preferencesFromUser(
  user: UserRecord,
): LuminaMemoryBundle["preferences"] {
  const profile = toArchitectProfileView(user);
  return {
    locale: profile.locale,
    supportPreference: profile.supportPreference,
    timeZone: profile.timeZone,
  };
}

function emptyDurable(): LuminaMemoryRetrieval["durable"] {
  return {
    summaries: [],
    decisions: [],
    milestones: [],
    progress: null,
  };
}

export function toLuminaMemoryBundle(
  user: UserRecord,
  memory: LuminaMemoryRecord | undefined,
): LuminaMemoryBundle {
  const enabled = memory?.enabled === true;
  const durable = enabled
    ? {
        summaries: memory?.summaries ?? [],
        decisions: memory?.decisions ?? [],
        milestones: memory?.milestones ?? [],
        progress: memory?.progress ?? null,
      }
    : emptyDurable();

  return {
    identity: identityFromUser(user),
    preferences: preferencesFromUser(user),
    enabled,
    ...(memory?.enabledAt ? { enabledAt: memory.enabledAt } : {}),
    ...(memory?.disabledAt ? { disabledAt: memory.disabledAt } : {}),
    summaries: durable.summaries,
    decisions: durable.decisions,
    milestones: durable.milestones,
    progress: durable.progress,
    counts: {
      summaries: durable.summaries.length,
      decisions: durable.decisions.length,
      milestones: durable.milestones.length,
    },
  };
}

export function toLuminaMemoryControlsView(
  memory: LuminaMemoryRecord | undefined,
): LuminaMemoryControlsView {
  const enabled = memory?.enabled === true;
  return {
    enabled,
    counts: {
      summaries: enabled ? (memory?.summaries.length ?? 0) : 0,
      decisions: enabled ? (memory?.decisions.length ?? 0) : 0,
      milestones: enabled ? (memory?.milestones.length ?? 0) : 0,
    },
  };
}

export async function getLuminaMemoryBundleForUser(
  userId: string,
): Promise<LuminaMemoryBundle | null> {
  const user = await getAuthStore().findUserById(userId);
  if (!user) {
    return null;
  }
  const memory = await getLuminaMemoryStore().findMemoryForUser(userId);
  return toLuminaMemoryBundle(user, memory);
}

/**
 * Structured retrieval for future prompt assembly rows.
 * Identity/preferences always come from profile — never duplicated into memory.
 */
export async function retrieveLuminaMemoryForUser(
  userId: string,
): Promise<LuminaMemoryRetrieval | null> {
  const bundle = await getLuminaMemoryBundleForUser(userId);
  if (!bundle) {
    return null;
  }

  return {
    userId,
    enabled: bundle.enabled,
    identity: bundle.identity,
    preferences: bundle.preferences,
    durable: {
      summaries: bundle.summaries,
      decisions: bundle.decisions,
      milestones: bundle.milestones,
      progress: bundle.progress,
    },
    counts: bundle.counts,
  };
}
