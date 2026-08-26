import { journeyStages } from "@/content/journey-stages";
import { resolveJourneyProgressPointer } from "@/lib/journey/progress-pointers";
import type { LuminaMemoryProgress } from "@/lib/lumina/memory/types";
import type {
  JourneyStateAdapter,
  LuminaCurrentJourney,
  LuminaJourneyState,
} from "@/lib/lumina/context/types";

/** Blueprint chapter id → journey stage id (order-aligned with journeyStages). */
const BLUEPRINT_CHAPTER_TO_STAGE: Record<string, string> = {
  "chapter-1-awakening": "awakening",
  "chapter-2-mirror": "mirror",
  "chapter-3-decision": "decision",
  "chapter-4-standards": "standards",
  "chapter-5-architect": "architect",
  "chapter-6-expansion": "expansion",
  "chapter-7-beginning": "beginning",
};

const STAGE_TO_BLUEPRINT_CHAPTER: Record<string, string> = Object.fromEntries(
  Object.entries(BLUEPRINT_CHAPTER_TO_STAGE).map(([chapterId, stageId]) => [
    stageId,
    chapterId,
  ]),
);

const STAGE_IDS = new Set(journeyStages.map((stage) => stage.id));

export function mapProgressChapterIdToStageId(
  chapterId: string | null | undefined,
): string | null {
  if (!chapterId || typeof chapterId !== "string") {
    return null;
  }
  const trimmed = chapterId.trim();
  if (!trimmed) {
    return null;
  }
  if (STAGE_IDS.has(trimmed)) {
    return trimmed;
  }
  return BLUEPRINT_CHAPTER_TO_STAGE[trimmed] ?? null;
}

export function stageIdToBlueprintChapterId(stageId: string): string | null {
  return STAGE_TO_BLUEPRINT_CHAPTER[stageId] ?? null;
}

function normalizeStatus(status: string | null | undefined): string | null {
  if (typeof status !== "string") {
    return null;
  }
  const trimmed = status.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveStateFromProgress(
  stageId: string | null,
  status: string | null,
): LuminaJourneyState {
  const normalized = normalizeStatus(status);

  // Full journey completion only when status explicitly says so — never infer from stage 7.
  if (normalized === "journey_completed") {
    return "journey_completed";
  }

  if (!stageId) {
    return "not_started";
  }

  if (
    normalized === "stage_completed" ||
    normalized === "chapter_completed" ||
    normalized === "completed"
  ) {
    return "stage_completed";
  }

  if (
    normalized === "in_progress" ||
    normalized === "started" ||
    normalized === "active" ||
    normalized === null
  ) {
    // Mapped chapter with null/active status counts as in progress.
    return "in_progress";
  }

  // Unknown status with a mapped stage — treat as in progress (do not guess completion).
  return "in_progress";
}

export function resolveCurrentJourneyFromProgress(
  progress: LuminaMemoryProgress | null,
  source: LuminaCurrentJourney["source"] = "memory_progress",
): LuminaCurrentJourney {
  if (!progress) {
    return {
      state: "not_started",
      stageId: null,
      chapterId: null,
      status: null,
      stepId: null,
      updatedAt: null,
      source: "none",
    };
  }

  const stageId = mapProgressChapterIdToStageId(progress.chapterId);
  if (!stageId) {
    // Unmappable chapter id → not_started (do not guess).
    return {
      state: "not_started",
      stageId: null,
      chapterId: progress.chapterId,
      status: progress.status,
      stepId: null,
      updatedAt: progress.updatedAt,
      source,
    };
  }

  const chapterId =
    progress.chapterId && BLUEPRINT_CHAPTER_TO_STAGE[progress.chapterId]
      ? progress.chapterId
      : stageIdToBlueprintChapterId(stageId);

  const state = resolveStateFromProgress(stageId, progress.status);

  return {
    state,
    stageId,
    chapterId,
    status: progress.status,
    stepId: null,
    updatedAt: progress.updatedAt,
    source,
  };
}

const defaultProgressAdapter: JourneyStateAdapter = {
  resolveProgress: resolveJourneyProgressPointer,
  async listCompletedWork() {
    return [];
  },
  async listSavedArtifacts() {
    return [];
  },
  source: "memory_progress",
};

/**
 * Deterministic, server-only current Journey stage.
 * Never reads client/URL input. Progress comes from memory when enabled (Row 76 stub).
 */
export async function resolveAuthoritativeCurrentJourneyStage(
  userId: string,
  adapter: JourneyStateAdapter = defaultProgressAdapter,
): Promise<LuminaCurrentJourney> {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    return {
      state: "not_started",
      stageId: null,
      chapterId: null,
      status: null,
      stepId: null,
      updatedAt: null,
      source: "none",
    };
  }

  const progress = await adapter.resolveProgress(userId.trim());
  return resolveCurrentJourneyFromProgress(
    progress,
    adapter.source ?? "memory_progress",
  );
}
