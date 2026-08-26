import type { ConsentRecord, ConsentRecordResult } from "@/lib/consent/types";
import { getAuthStore } from "@/lib/auth/store";

export async function recordConsent(
  record: ConsentRecord,
): Promise<ConsentRecordResult> {
  if (!record.userId) {
    return { status: "pending" };
  }

  const store = getAuthStore();
  await store.recordConsents([record]);
  return { status: "recorded" };
}

export async function recordConsents(
  records: ConsentRecord[],
): Promise<ConsentRecordResult> {
  const persistable = records.filter((record) => record.userId);

  if (persistable.length === 0) {
    return { status: "pending" };
  }

  const store = getAuthStore();
  await store.recordConsents(persistable);
  return { status: "recorded" };
}

export async function recordConsentsForUser(
  userId: string,
  records: ConsentRecord[],
): Promise<ConsentRecordResult> {
  const withUser = records.map((record) => ({ ...record, userId }));
  return recordConsents(withUser);
}
