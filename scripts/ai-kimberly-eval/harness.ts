import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createFileAuthStore,
  getAuthStore,
  setAuthStoreForTests,
} from "@/lib/auth/store";
import type { UserRecord } from "@/lib/auth/types";
import {
  createFileAiKimberlyStore,
  getAiKimberlyStore,
  setAiKimberlyStoreForTests,
} from "@/lib/ai-kimberly/store";
import {
  createFileLuminaStore,
  setLuminaStoreForTests,
} from "@/lib/lumina/store";
import type { AiKimberlyConversation } from "@/lib/ai-kimberly/types";

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

export async function setupEvalHarness(): Promise<EvalHarness> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "ai-kimberly-eval-"));
  const authDir = path.join(rootDir, "auth");
  const founderDir = path.join(rootDir, "ai-kimberly");
  const luminaDir = path.join(rootDir, "lumina");

  setAuthStoreForTests(createFileAuthStore({ dataDir: authDir }));
  setAiKimberlyStoreForTests(createFileAiKimberlyStore({ dataDir: founderDir }));
  setLuminaStoreForTests(createFileLuminaStore({ dataDir: luminaDir }));

  const userA = await seedUser({
    email: "eval-founder-a@example.test",
    firstName: "Ava",
    lastName: "Architect",
    locale: "en",
    arcCode: "FKIMA001",
  });
  const userB = await seedUser({
    email: "eval-founder-b@example.test",
    firstName: "Bea",
    lastName: "Builder",
    locale: "es",
    arcCode: "FKIMB002",
  });

  return {
    rootDir,
    users: { userA, userB },
    async cleanup() {
      setAiKimberlyStoreForTests(undefined);
      setLuminaStoreForTests(undefined);
      setAuthStoreForTests(null);
      await rm(rootDir, { recursive: true, force: true });
    },
  };
}

export async function withFreshConversation(
  userId: string,
): Promise<AiKimberlyConversation> {
  return getAiKimberlyStore().getOrCreateConversationForUser(userId);
}
