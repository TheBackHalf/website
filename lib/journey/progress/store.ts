import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import {
  createPostgresKeyedStore,
  createUnconfiguredParticipantStore,
  getParticipantPersistenceBackend,
  JOURNEY_COLLECTIONS,
  journeyFileOverrideDir,
} from "@/lib/journey/durable-records";
import type {
  JourneyProgressDatabase,
  JourneyProgressRecord,
  JourneyProgressStatus,
} from "@/lib/journey/progress/types";

const DEFAULT_DATA_DIR = ".data/journey";
const DEFAULT_DB_FILE = "progress.json";
const DEFAULT_DB_RELATIVE = `${DEFAULT_DATA_DIR}/${DEFAULT_DB_FILE}`;

const emptyDatabase = (): JourneyProgressDatabase => ({
  records: [],
});

function normalizeDatabase(raw: JourneyProgressDatabase): JourneyProgressDatabase {
  return {
    records: Array.isArray(raw.records) ? raw.records : [],
  };
}

export type JourneyProgressStore = {
  findProgressForUser(userId: string): Promise<JourneyProgressRecord | undefined>;
  upsertProgress(input: {
    userId: string;
    chapterId: string;
    status: JourneyProgressStatus;
  }): Promise<JourneyProgressRecord>;
  listProgress(): Promise<JourneyProgressRecord[]>;
  deleteForUser(userId: string): Promise<number>;
};

export function createFileJourneyProgressStore(options?: {
  dataDir?: string;
  fileName?: string;
}): JourneyProgressStore {
  const dataDir = options?.dataDir ?? DEFAULT_DATA_DIR;
  const dbFile =
    options?.dataDir || options?.fileName
      ? `${dataDir}/${options?.fileName ?? DEFAULT_DB_FILE}`
      : DEFAULT_DB_RELATIVE;
  let writeQueue: Promise<void> = Promise.resolve();

  function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const run = writeQueue.then(operation, operation);
    writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function readDatabase(): Promise<JourneyProgressDatabase> {
    try {
      const raw = await readFile(/* turbopackIgnore: true */ dbFile, "utf8");
      return normalizeDatabase(JSON.parse(raw) as JourneyProgressDatabase);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        return emptyDatabase();
      }
      throw error;
    }
  }

  async function writeDatabase(database: JourneyProgressDatabase): Promise<void> {
    await mkdir(/* turbopackIgnore: true */ dataDir, { recursive: true });
    const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(/* turbopackIgnore: true */ tempFile, JSON.stringify(database, null, 2), "utf8");
    await rename(/* turbopackIgnore: true */ tempFile, /* turbopackIgnore: true */ dbFile);
  }

  return {
    findProgressForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
          return undefined;
        }
        const database = await readDatabase();
        return database.records.find((entry) => entry.userId === trimmed);
      });
    },

    upsertProgress(input) {
      return enqueueWrite(async () => {
        const userId = input.userId.trim();
        const chapterId = input.chapterId.trim();
        const status =
          typeof input.status === "string" ? input.status.trim() : "";
        if (!userId || !chapterId || !status) {
          throw new Error("Invalid journey progress payload.");
        }

        const now = new Date().toISOString();
        const database = await readDatabase();
        const index = database.records.findIndex(
          (entry) => entry.userId === userId,
        );
        const previous = index >= 0 ? database.records[index] : undefined;
        const next: JourneyProgressRecord = {
          userId,
          chapterId,
          status,
          updatedAt: now,
        };
        if (index < 0) {
          database.records.push(next);
        } else {
          database.records[index] = next;
        }
        await writeDatabase(database);
        try {
          const { emitJourneyProgressAnalytics } = await import(
            "@/lib/analytics/product-hooks"
          );
          await emitJourneyProgressAnalytics(previous, next);
        } catch {
          // Analytics must not block Journey progress.
        }
        return next;
      }).catch(async (error) => {
        try {
          const { trackProductEvent } = await import("@/lib/analytics/track");
          await trackProductEvent({
            name: "journey_save_failed",
            userId: input.userId,
            productArea: "journey",
            idempotencyKey: `journey_save_failed:${input.userId}:${Date.now()}`,
            payload: {
              chapterId: input.chapterId,
              errorCategory: "save_failed",
            },
          });
        } catch {
          // ignore
        }
        throw error;
      });
    },

    listProgress() {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.records;
      });
    },

    deleteForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) return 0;
        const database = await readDatabase();
        const remaining = database.records.filter((entry) => entry.userId !== trimmed);
        const removed = database.records.length - remaining.length;
        if (removed > 0) {
          database.records = remaining;
          await writeDatabase(database);
        }
        return removed;
      });
    },
  };
}

function createPostgresJourneyProgressStore(): JourneyProgressStore {
  const keyed = createPostgresKeyedStore<JourneyProgressRecord>(
    JOURNEY_COLLECTIONS.progress,
  );
  return {
    findProgressForUser(userId) {
      return keyed.findForUser(userId.trim());
    },
    async upsertProgress(input) {
      const userId = input.userId.trim();
      const chapterId = input.chapterId.trim();
      const status =
        typeof input.status === "string" ? input.status.trim() : "";
      if (!userId || !chapterId || !status) {
        throw new Error("Invalid journey progress payload.");
      }
      const previous = await keyed.findForUser(userId);
      const next: JourneyProgressRecord = {
        userId,
        chapterId,
        status: status as JourneyProgressStatus,
        updatedAt: new Date().toISOString(),
      };
      await keyed.save(next);
      try {
        const { emitJourneyProgressAnalytics } = await import(
          "@/lib/analytics/product-hooks"
        );
        await emitJourneyProgressAnalytics(previous, next);
      } catch {
        // Analytics must not block Journey progress.
      }
      return next;
    },
    listProgress() {
      return keyed.list();
    },
    deleteForUser(userId) {
      return keyed.deleteForUser(userId);
    },
  };
}

let storeInstance: JourneyProgressStore | null = null;

export function getJourneyProgressStore(): JourneyProgressStore {
  if (!storeInstance) {
    const override = journeyFileOverrideDir();
    const backend = getParticipantPersistenceBackend(Boolean(override));
    if (backend === "file_test_override") {
      storeInstance = createFileJourneyProgressStore({ dataDir: override });
    } else if (backend === "supabase_postgres") {
      storeInstance = createPostgresJourneyProgressStore();
    } else if (backend === "unconfigured_production") {
      storeInstance = createUnconfiguredParticipantStore<JourneyProgressStore>(
        "journey_progress",
      );
    } else {
      storeInstance = createFileJourneyProgressStore();
    }
  }
  return storeInstance;
}

export function setJourneyProgressStoreForTests(
  store: JourneyProgressStore | null,
): void {
  storeInstance = store;
}
