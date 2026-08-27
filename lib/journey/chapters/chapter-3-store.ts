/**
 * Chapter III file-backed store (account-scoped).
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPostgresKeyedStore,
  createUnconfiguredParticipantStore,
  getParticipantPersistenceBackend,
  JOURNEY_COLLECTIONS,
  journeyFileOverrideDir,
} from "@/lib/journey/durable-records";

import {
  isChapter3SectionId,
  type Chapter3SectionId,
} from "@/content/journey/chapter-3-decision";
import {
  createEmptyChapter3Record,
  emptyDecisionReflectionAnswers,
  type Chapter3Database,
  type Chapter3Record,
  type ChapterProgressStatus,
  type DecisionCommitmentState,
  type DecisionPracticeState,
  type DecisionReflectionState,
} from "@/lib/journey/chapters/types";
import { normalizeReflectionAnswers } from "@/lib/journey/chapters/chapter-3";
import {
  migrateCurrentSectionId,
  needsTeachingProgressMigration,
} from "@/lib/journey/chapters/legacy-teaching";

const DEFAULT_DATA_DIR = ".data/journey";
const DEFAULT_DB_FILE = "chapter-3.json";
const DEFAULT_DB_RELATIVE = `${DEFAULT_DATA_DIR}/${DEFAULT_DB_FILE}`;

const emptyDatabase = (): Chapter3Database => ({
  records: [],
});

function normalizeStatus(raw: unknown): ChapterProgressStatus {
  if (raw === "completed" || raw === "in_progress" || raw === "not_started") {
    return raw;
  }
  return "not_started";
}

function normalizeSectionIds(raw: unknown): Chapter3SectionId[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<Chapter3SectionId>();
  const next: Chapter3SectionId[] = [];
  for (const entry of raw) {
    if (isChapter3SectionId(entry) && !seen.has(entry)) {
      seen.add(entry);
      next.push(entry);
    }
  }
  return next;
}

function normalizeReflection(
  raw: DecisionReflectionState | undefined,
  now: string,
): DecisionReflectionState {
  if (!raw || typeof raw !== "object") {
    return {
      answers: emptyDecisionReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    };
  }
  return {
    answers: normalizeReflectionAnswers(raw.answers),
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizePractice(
  raw: DecisionPracticeState | undefined,
  now: string,
): DecisionPracticeState {
  if (!raw || typeof raw !== "object") {
    return {
      statement: "",
      updatedAt: now,
      completedAt: null,
    };
  }
  return {
    statement: typeof raw.statement === "string" ? raw.statement : "",
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeCommitment(
  raw: DecisionCommitmentState | undefined,
  now: string,
): DecisionCommitmentState {
  if (!raw || typeof raw !== "object") {
    return {
      affirmed: false,
      note: "",
      updatedAt: now,
      completedAt: null,
    };
  }
  return {
    affirmed: raw.affirmed === true,
    note: typeof raw.note === "string" ? raw.note : "",
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeRecord(raw: Chapter3Record): Chapter3Record | null {
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  if (!userId) {
    return null;
  }
  const now =
    typeof raw.updatedAt === "string" && raw.updatedAt
      ? raw.updatedAt
      : new Date().toISOString();
  const currentSectionId = migrateCurrentSectionId(
    raw.currentSectionId,
    isChapter3SectionId,
    "reflection",
    "welcome",
  );

  return {
    userId,
    chapterId: "chapter-3-decision",
    status: normalizeStatus(raw.status),
    currentSectionId,
    completedSectionIds: normalizeSectionIds(raw.completedSectionIds),
    reflection: normalizeReflection(raw.reflection, now),
    practice: normalizePractice(raw.practice, now),
    commitment: normalizeCommitment(raw.commitment, now),
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : now,
    updatedAt: now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeDatabase(raw: Chapter3Database): Chapter3Database {
  const records: Chapter3Record[] = [];
  if (Array.isArray(raw.records)) {
    for (const entry of raw.records) {
      const normalized = normalizeRecord(entry as Chapter3Record);
      if (normalized) {
        records.push(normalized);
      }
    }
  }
  return { records };
}

export type Chapter3Store = {
  findChapter3ForUser(userId: string): Promise<Chapter3Record | undefined>;
  saveChapter3(record: Chapter3Record): Promise<Chapter3Record>;
  deleteForUser(userId: string): Promise<number>;
};

export function createFileChapter3Store(options?: {
  dataDir?: string;
  fileName?: string;
}): Chapter3Store {
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

  async function readDatabase(): Promise<Chapter3Database> {
    try {
      const raw = await readFile(dbFile, "utf8");
      const parsed = JSON.parse(raw) as Chapter3Database;
      const needsWrite = Array.isArray(parsed.records)
        ? parsed.records.some((entry) =>
            needsTeachingProgressMigration(
              entry.currentSectionId,
              entry.completedSectionIds,
            ),
          )
        : false;
      const database = normalizeDatabase(parsed);
      if (needsWrite) {
        await writeDatabase(database);
      }
      return database;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        return emptyDatabase();
      }
      throw error;
    }
  }

  async function writeDatabase(database: Chapter3Database): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
    await rename(tempFile, dbFile);
  }

  return {
    findChapter3ForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
          return undefined;
        }
        const database = await readDatabase();
        return database.records.find((entry) => entry.userId === trimmed);
      });
    },

    saveChapter3(record) {
      return enqueueWrite(async () => {
        const normalized = normalizeRecord(record);
        if (!normalized) {
          throw new Error("Invalid Chapter III payload.");
        }
        const database = await readDatabase();
        const index = database.records.findIndex(
          (entry) => entry.userId === normalized.userId,
        );
        if (index < 0) {
          database.records.push(normalized);
        } else {
          database.records[index] = normalized;
        }
        await writeDatabase(database);
        return normalized;
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

let storeInstance: Chapter3Store | null = null;

function createPostgresChapter3Store(): Chapter3Store {
  const keyed = createPostgresKeyedStore<Chapter3Record>(JOURNEY_COLLECTIONS.chapter3);
  return {
    findChapter3ForUser(userId) {
      return keyed.findForUser(userId.trim());
    },
    async saveChapter3(record) {
      const normalized = normalizeRecord(record);
      if (!normalized) {
        throw new Error("Invalid Chapter III payload.");
      }
      return keyed.save(normalized);
    },
    deleteForUser(userId) {
      return keyed.deleteForUser(userId);
    },
  };
}

export function getChapter3Store(): Chapter3Store {
  if (!storeInstance) {
    const override = journeyFileOverrideDir();
    const backend = getParticipantPersistenceBackend(Boolean(override));
    if (backend === "file_test_override") {
      storeInstance = createFileChapter3Store({ dataDir: override });
    } else if (backend === "supabase_postgres") {
      storeInstance = createPostgresChapter3Store();
    } else if (backend === "unconfigured_production") {
      storeInstance = createUnconfiguredParticipantStore<Chapter3Store>("journey_chapter_3");
    } else {
      storeInstance = createFileChapter3Store();
    }
  }
  return storeInstance;
}

export function setChapter3StoreForTests(store: Chapter3Store | null): void {
  storeInstance = store;
}

export function ensureChapter3Record(
  existing: Chapter3Record | undefined,
  userId: string,
): Chapter3Record {
  if (existing) {
    return existing;
  }
  return createEmptyChapter3Record(userId);
}
