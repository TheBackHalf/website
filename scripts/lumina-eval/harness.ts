import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { setAiEmergencyDisableForTests } from "@/lib/ai-controls/env";
import { resetAiControlLogsForTests } from "@/lib/ai-controls/logging";
import { setLuminaProviderAdapterForTests } from "@/lib/ai-controls/lumina";
import { resetAiControlStoreForTests, setAiControlClockForTests } from "@/lib/ai-controls/store";

import {
  createFileAuthStore,
  getAuthStore,
  setAuthStoreForTests,
} from "@/lib/auth/store";
import type { UserRecord } from "@/lib/auth/types";
import { resetLuminaContextFixturesForTests } from "@/lib/lumina/context/fixture-adapter";
import {
  createLuminaMemoryStore,
  setLuminaMemoryStoreForTests,
} from "@/lib/lumina/memory/store";
import {
  createFileLuminaStore,
  getLuminaStore,
  setLuminaStoreForTests,
} from "@/lib/lumina/store";
import type { LuminaConversation } from "@/lib/lumina/types";

export type EvalUsers = {
  userA: UserRecord;
  userB: UserRecord;
};

export type EvalHarness = {
  rootDir: string;
  users: EvalUsers;
  cleanup: () => Promise<void>;
};

async function seedUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  locale: "en" | "es";
  arcCode: string;
}): Promise<UserRecord> {
  return getAuthStore().createUser({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    authProvider: "email",
    arcCode: input.arcCode,
    emailVerified: true,
    locale: input.locale,
    passwordHash: "eval-stub-hash-not-a-secret",
    ageEligible: true,
    ageEligibleConfirmedAt: new Date().toISOString(),
  });
}

/**
 * Isolates auth + Lumina file stores under a temp directory.
 * Never touches production `.data/` trees.
 */
export async function setupEvalHarness(): Promise<EvalHarness> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "lumina-eval-"));
  const authDir = path.join(rootDir, "auth");
  const luminaDir = path.join(rootDir, "lumina");

  setAuthStoreForTests(createFileAuthStore({ dataDir: authDir }));
  setLuminaStoreForTests(createFileLuminaStore({ dataDir: luminaDir }));
  setLuminaMemoryStoreForTests(createLuminaMemoryStore());
  resetLuminaContextFixturesForTests();
  resetAiControlStoreForTests();
  resetAiControlLogsForTests();
  setAiEmergencyDisableForTests(null);
  setLuminaProviderAdapterForTests(null);
  setAiControlClockForTests(null);

  const userA = await seedUser({
    email: "eval-user-a@example.test",
    firstName: "Ava",
    lastName: "Architect",
    locale: "en",
    arcCode: "EVALA001",
  });
  const userB = await seedUser({
    email: "eval-user-b@example.test",
    firstName: "Bea",
    lastName: "Builder",
    locale: "es",
    arcCode: "EVALB002",
  });

  return {
    rootDir,
    users: { userA, userB },
    async cleanup() {
      resetLuminaContextFixturesForTests();
      setLuminaMemoryStoreForTests(undefined);
      setLuminaStoreForTests(undefined);
      setAuthStoreForTests(null);
      resetAiControlStoreForTests();
      resetAiControlLogsForTests();
      setAiEmergencyDisableForTests(null);
      setLuminaProviderAdapterForTests(null);
      setAiControlClockForTests(null);
      await rm(rootDir, { recursive: true, force: true });
    },
  };
}

export async function withFreshConversation(
  userId: string,
): Promise<LuminaConversation> {
  return getLuminaStore().getOrCreateConversationForUser(userId);
}
