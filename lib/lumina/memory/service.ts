import { recordConsentsForUser } from "@/lib/consent/record-consent";
import { buildLuminaMemoryConsentRecord } from "@/lib/lumina/memory/consent";
import {
  getLuminaMemoryBundleForUser,
  retrieveLuminaMemoryForUser,
} from "@/lib/lumina/memory/retrieve";
import { getLuminaMemoryStore } from "@/lib/lumina/memory/store";
import type {
  ClearLuminaMemoryResult,
  GetLuminaMemoryBundleResult,
  LuminaMemoryWriteInput,
  SetLuminaMemoryEnabledResult,
  WriteLuminaMemoryResult,
} from "@/lib/lumina/memory/types";

export async function getLuminaMemoryBundleResultForUser(
  userId: string,
): Promise<GetLuminaMemoryBundleResult> {
  const bundle = await getLuminaMemoryBundleForUser(userId);
  if (!bundle) {
    return { status: "error", message: "Account not found." };
  }
  return { status: "ok", bundle };
}

export async function setLuminaMemoryEnabledForUser(
  userId: string,
  enabled: boolean,
): Promise<SetLuminaMemoryEnabledResult> {
  const store = getLuminaMemoryStore();

  if (enabled) {
    await recordConsentsForUser(userId, [
      buildLuminaMemoryConsentRecord(userId),
    ]);
    await store.setMemoryEnabled(userId, true);
    return { status: "ok", enabled: true };
  }

  await store.setMemoryEnabled(userId, false);
  return { status: "ok", enabled: false };
}

export async function writeLuminaMemoryForUser(
  userId: string,
  input: LuminaMemoryWriteInput,
): Promise<WriteLuminaMemoryResult> {
  const write = await getLuminaMemoryStore().writeMemoryWhenEnabled(
    userId,
    input,
  );

  if (write.status === "disabled") {
    return { status: "disabled" };
  }
  if (write.status === "validation_error") {
    return { status: "validation_error", message: write.message };
  }

  const bundle = await getLuminaMemoryBundleForUser(userId);
  if (!bundle) {
    return { status: "error", message: "Account not found." };
  }
  return { status: "ok", bundle };
}

export async function clearLuminaMemoryForUserResult(
  userId: string,
): Promise<ClearLuminaMemoryResult> {
  await getLuminaMemoryStore().clearLuminaMemoryForUser(userId);
  return { status: "ok" };
}

/** Re-export retrieval for integration without dumping private content to logs. */
export { retrieveLuminaMemoryForUser };
