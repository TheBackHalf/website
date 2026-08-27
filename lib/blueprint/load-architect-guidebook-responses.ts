/**
 * Read-only Architect Journey → Blueprint response assembly.
 * Does not mutate chapter progress or entitlement state.
 */

import { getAuthStore } from "@/lib/auth/store";
import { mapSavedJourneyToBlueprintResponses } from "@/lib/blueprint/map-journey-to-blueprint";
import type { BlueprintExerciseResponses } from "@/lib/blueprint/personalize-guidebook";
import { getChapter2Store } from "@/lib/journey/chapters/chapter-2-store";
import { getChapter3Store } from "@/lib/journey/chapters/chapter-3-store";
import { getChapter4Store } from "@/lib/journey/chapters/chapter-4-store";
import { getChapter5Store } from "@/lib/journey/chapters/chapter-5-store";
import { getChapter6Store } from "@/lib/journey/chapters/chapter-6-store";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";
import { getChapter1Store } from "@/lib/journey/chapters/store";

async function loadOrNull<T>(load: () => Promise<T | undefined>): Promise<T | null> {
  try {
    return (await load()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Load saved Journey answers for Blueprint population.
 * Missing chapters/exercises simply omit keys (blank writing lines remain).
 */
export async function loadArchitectGuidebookResponses(
  userId: string,
): Promise<BlueprintExerciseResponses> {
  let firstName: string | null = null;
  try {
    const user = await getAuthStore().findUserById(userId);
    firstName = user?.firstName?.trim() || null;
  } catch {
    firstName = null;
  }

  const [chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7] =
    await Promise.all([
      loadOrNull(() => getChapter1Store().findChapter1ForUser(userId)),
      loadOrNull(() => getChapter2Store().findChapter2ForUser(userId)),
      loadOrNull(() => getChapter3Store().findChapter3ForUser(userId)),
      loadOrNull(() => getChapter4Store().findChapter4ForUser(userId)),
      loadOrNull(() => getChapter5Store().findChapter5ForUser(userId)),
      loadOrNull(() => getChapter6Store().findChapter6ForUser(userId)),
      loadOrNull(() => getChapter7Store().findChapter7ForUser(userId)),
    ]);

  return mapSavedJourneyToBlueprintResponses({
    firstName,
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter5,
    chapter6,
    chapter7,
  });
}
