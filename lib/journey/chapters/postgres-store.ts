/**
 * JSONB adapter for existing chapter store interfaces.
 * One table, one SQL client — Chapter I–VII are adapters, not separate stores.
 */

import {
  findJourneyChapterPayload,
  JourneyPersistenceError,
  saveJourneyChapterPayload,
} from "@/lib/journey/chapters/db";

export function createPostgresChapterDocumentAdapter<
  TRecord extends { userId: string; chapterId: string },
>(options: {
  chapterId: string;
  normalize: (raw: TRecord) => TRecord | null;
  invalidMessage: string;
}): {
  find(userId: string): Promise<TRecord | undefined>;
  save(record: TRecord): Promise<TRecord>;
} {
  return {
    async find(userId) {
      const trimmed = userId.trim();
      if (!trimmed) return undefined;
      const payload = await findJourneyChapterPayload(trimmed, options.chapterId);
      if (!payload || typeof payload !== "object") return undefined;
      return options.normalize(payload as TRecord) ?? undefined;
    },
    async save(record) {
      const normalized = options.normalize(record);
      if (!normalized) {
        throw new Error(options.invalidMessage);
      }
      await saveJourneyChapterPayload(
        normalized.userId,
        options.chapterId,
        normalized,
      );
      return normalized;
    },
  };
}

export function rejectUnconfiguredJourneyStore(): Promise<never> {
  return Promise.reject(
    new JourneyPersistenceError("journey_postgres_unconfigured"),
  );
}
