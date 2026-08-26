import { getJourneyProgressStore } from "@/lib/journey/progress";
import { getLuminaMemoryStore } from "@/lib/lumina/memory/store";
import type { LuminaMemoryProgress } from "@/lib/lumina/memory/types";

/**
 * Row 83 — Journey progress pointer.
 * Prefers first-class journey progress store; falls back to Lumina memory pointer
 * only when memory is enabled and has progress.
 */
export type JourneyProgressPointer = LuminaMemoryProgress;

export async function resolveJourneyProgressPointer(
  userId: string,
): Promise<JourneyProgressPointer | null> {
  const trimmed = typeof userId === "string" ? userId.trim() : "";
  if (!trimmed) {
    return null;
  }

  const journeyProgress =
    await getJourneyProgressStore().findProgressForUser(trimmed);
  if (journeyProgress?.chapterId && journeyProgress.status) {
    return {
      chapterId: journeyProgress.chapterId,
      status: journeyProgress.status,
      updatedAt: journeyProgress.updatedAt,
    };
  }

  const memory = await getLuminaMemoryStore().findMemoryForUser(trimmed);
  if (!memory?.enabled || !memory.progress) {
    return null;
  }
  return memory.progress;
}
