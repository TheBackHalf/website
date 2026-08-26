import type { LuminaMemoryProgress } from "@/lib/lumina/memory/types";
import type {
  JourneyStateAdapter,
  LuminaCompletedWorkItem,
  LuminaSavedArtifactItem,
} from "@/lib/lumina/context/types";

/**
 * TEST/MATRIX ONLY — injectable Journey state for Row 77 validation.
 * Not the production default. Not a Journey engine (Rows 83–94 remain pending).
 */

export type LuminaContextFixtureSeed = {
  progress?: LuminaMemoryProgress | null;
  completedWork?: LuminaCompletedWorkItem[];
  savedArtifacts?: LuminaSavedArtifactItem[];
};

const fixtureByUser = new Map<string, LuminaContextFixtureSeed>();

export function resetLuminaContextFixturesForTests() {
  fixtureByUser.clear();
}

export function seedLuminaContextFixtureForTests(
  userId: string,
  seed: LuminaContextFixtureSeed,
) {
  fixtureByUser.set(userId, {
    progress: seed.progress ?? null,
    completedWork: seed.completedWork ? [...seed.completedWork] : [],
    savedArtifacts: seed.savedArtifacts ? [...seed.savedArtifacts] : [],
  });
}

export function getLuminaContextFixtureForTests(
  userId: string,
): LuminaContextFixtureSeed | undefined {
  return fixtureByUser.get(userId);
}

export function createFixtureJourneyStateAdapter(): JourneyStateAdapter {
  return {
    source: "fixture",
    async resolveProgress(userId) {
      const seed = fixtureByUser.get(userId);
      return seed?.progress ?? null;
    },
    async listCompletedWork(userId) {
      const seed = fixtureByUser.get(userId);
      return seed?.completedWork ? [...seed.completedWork] : [];
    },
    async listSavedArtifacts(userId) {
      const seed = fixtureByUser.get(userId);
      // Ownership: only return artifacts owned by this userId.
      return (seed?.savedArtifacts ?? []).filter(
        (entry) => entry.ownerUserId === userId,
      );
    },
  };
}
