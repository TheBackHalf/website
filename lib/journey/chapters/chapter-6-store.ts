/**
 * Chapter VI file-backed store (account-scoped).
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isChapter6SectionId,
  type Chapter6SectionId,
} from "@/content/journey/chapter-6-expansion";
import {
  createEmptyChapter6Record,
  emptyExpansionPracticeAnswers,
  emptyExpansionReflectionAnswers,
  type Chapter6Database,
  type Chapter6Record,
  type ChapterProgressStatus,
  type ExpansionCommitmentState,
  type ExpansionPracticeState,
  type ExpansionReflectionState,
} from "@/lib/journey/chapters/types";
import {
  normalizePracticeAnswers,
  normalizeReflectionAnswers,
} from "@/lib/journey/chapters/chapter-6";
import {
  migrateCurrentSectionId,
  needsTeachingProgressMigration,
} from "@/lib/journey/chapters/legacy-teaching";
import { DurablePersistenceError, resolveDurableBackend } from "@/lib/durable/db";
import { createUserDocumentAdapter } from "@/lib/durable/documents";

const DEFAULT_DATA_DIR = ".data/journey";
const DEFAULT_DB_FILE = "chapter-6.json";
const DEFAULT_DB_RELATIVE = `${DEFAULT_DATA_DIR}/${DEFAULT_DB_FILE}`;

const emptyDatabase = (): Chapter6Database => ({
  records: [],
});

function normalizeStatus(raw: unknown): ChapterProgressStatus {
  if (raw === "completed" || raw === "in_progress" || raw === "not_started") {
    return raw;
  }
  return "not_started";
}

function normalizeSectionIds(raw: unknown): Chapter6SectionId[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<Chapter6SectionId>();
  const next: Chapter6SectionId[] = [];
  for (const entry of raw) {
    if (isChapter6SectionId(entry) && !seen.has(entry)) {
      seen.add(entry);
      next.push(entry);
    }
  }
  return next;
}

function normalizeReflection(
  raw: ExpansionReflectionState | undefined,
  now: string,
): ExpansionReflectionState {
  if (!raw || typeof raw !== "object") {
    return {
      answers: emptyExpansionReflectionAnswers(),
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
  raw: ExpansionPracticeState | undefined,
  now: string,
): ExpansionPracticeState {
  if (!raw || typeof raw !== "object") {
    return {
      answers: emptyExpansionPracticeAnswers(),
      updatedAt: now,
      completedAt: null,
    };
  }
  return {
    answers: normalizePracticeAnswers(raw.answers),
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeCommitment(
  raw: ExpansionCommitmentState | undefined,
  now: string,
): ExpansionCommitmentState {
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

function normalizeRecord(raw: Chapter6Record): Chapter6Record | null {
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
    isChapter6SectionId,
    "reflection",
    "welcome",
  );

  return {
    userId,
    chapterId: "chapter-6-expansion",
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

function normalizeDatabase(raw: Chapter6Database): Chapter6Database {
  const records: Chapter6Record[] = [];
  if (Array.isArray(raw.records)) {
    for (const entry of raw.records) {
      const normalized = normalizeRecord(entry as Chapter6Record);
      if (normalized) {
        records.push(normalized);
      }
    }
  }
  return { records };
}

export type Chapter6Store = {
  findChapter6ForUser(userId: string): Promise<Chapter6Record | undefined>;
  saveChapter6(record: Chapter6Record): Promise<Chapter6Record>;
};

export function createFileChapter6Store(options?: {
  dataDir?: string;
  fileName?: string;
}): Chapter6Store {
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

  async function readDatabase(): Promise<Chapter6Database> {
    try {
      const raw = await readFile(dbFile, "utf8");
      const parsed = JSON.parse(raw) as Chapter6Database;
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

  async function writeDatabase(database: Chapter6Database): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
    await rename(tempFile, dbFile);
  }

  return {
    findChapter6ForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
          return undefined;
        }
        const database = await readDatabase();
        return database.records.find((entry) => entry.userId === trimmed);
      });
    },

    saveChapter6(record) {
      return enqueueWrite(async () => {
        const normalized = normalizeRecord(record);
        if (!normalized) {
          throw new Error("Invalid Chapter VI payload.");
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
  };
}

let storeInstance: Chapter6Store | null = null;

function createPostgresChapter6Store(): Chapter6Store {
  const docs = createUserDocumentAdapter<Chapter6Record>({
    collection: "journey_chapter_6",
    normalize: (raw) => normalizeRecord(raw),
  });
  return {
    findChapter6ForUser: (userId) => docs.findForUser(userId),
    saveChapter6: (record) => docs.save(record),
  };
}

function createUnconfiguredChapter6Store(): Chapter6Store {
  const reject = () =>
    Promise.reject(new DurablePersistenceError("journey_postgres_unconfigured"));
  return { findChapter6ForUser: reject, saveChapter6: reject };
}

export function getChapter6Store(): Chapter6Store {
  if (!storeInstance) {
    const backend = resolveDurableBackend();
    if (backend === "supabase_postgres") {
      storeInstance = createPostgresChapter6Store();
    } else if (backend === "unconfigured_production") {
      storeInstance = createUnconfiguredChapter6Store();
    } else {
      storeInstance = createFileChapter6Store();
    }
  }
  return storeInstance;
}

export function setChapter6StoreForTests(store: Chapter6Store | null): void {
  storeInstance = store;
}

export function ensureChapter6Record(
  existing: Chapter6Record | undefined,
  userId: string,
): Chapter6Record {
  if (existing) {
    return existing;
  }
  return createEmptyChapter6Record(userId);
}
