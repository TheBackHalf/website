/**
 * Chapter VII file-backed store (account-scoped).
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import {
  isChapter7SectionId,
  type Chapter7SectionId,
} from "@/content/journey/chapter-7-beginning";
import {
  createEmptyChapter7Record,
  emptyBeginningReflectionAnswers,
  type BeginningCommitmentState,
  type BeginningPracticeState,
  type BeginningReflectionState,
  type Chapter7Database,
  type Chapter7Record,
  type ChapterProgressStatus,
} from "@/lib/journey/chapters/types";
import { normalizeReflectionAnswers } from "@/lib/journey/chapters/chapter-7";
import {
  migrateCurrentSectionId,
  needsTeachingProgressMigration,
} from "@/lib/journey/chapters/legacy-teaching";

const DEFAULT_DATA_DIR = ".data/journey";
const DEFAULT_DB_FILE = "chapter-7.json";
const DEFAULT_DB_RELATIVE = `${DEFAULT_DATA_DIR}/${DEFAULT_DB_FILE}`;

const emptyDatabase = (): Chapter7Database => ({
  records: [],
});

function normalizeStatus(raw: unknown): ChapterProgressStatus {
  if (raw === "completed" || raw === "in_progress" || raw === "not_started") {
    return raw;
  }
  return "not_started";
}

function normalizeSectionIds(raw: unknown): Chapter7SectionId[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<Chapter7SectionId>();
  const next: Chapter7SectionId[] = [];
  for (const entry of raw) {
    if (isChapter7SectionId(entry) && !seen.has(entry)) {
      seen.add(entry);
      next.push(entry);
    }
  }
  return next;
}

function normalizeReflection(
  raw: BeginningReflectionState | undefined,
  now: string,
): BeginningReflectionState {
  if (!raw || typeof raw !== "object") {
    return {
      answers: emptyBeginningReflectionAnswers(),
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
  raw: BeginningPracticeState | undefined,
  now: string,
): BeginningPracticeState {
  if (!raw || typeof raw !== "object") {
    return {
      statement: "",
      signature: "",
      signedDate: "",
      updatedAt: now,
      completedAt: null,
    };
  }
  return {
    statement: typeof raw.statement === "string" ? raw.statement : "",
    signature: typeof raw.signature === "string" ? raw.signature : "",
    signedDate: typeof raw.signedDate === "string" ? raw.signedDate : "",
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeCommitment(
  raw: BeginningCommitmentState | undefined,
  now: string,
): BeginningCommitmentState {
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

function normalizeRecord(raw: Chapter7Record): Chapter7Record | null {
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
    isChapter7SectionId,
    "reflection",
    "welcome",
  );

  return {
    userId,
    chapterId: "chapter-7-beginning",
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

function normalizeDatabase(raw: Chapter7Database): Chapter7Database {
  const records: Chapter7Record[] = [];
  if (Array.isArray(raw.records)) {
    for (const entry of raw.records) {
      const normalized = normalizeRecord(entry as Chapter7Record);
      if (normalized) {
        records.push(normalized);
      }
    }
  }
  return { records };
}

export type Chapter7Store = {
  findChapter7ForUser(userId: string): Promise<Chapter7Record | undefined>;
  saveChapter7(record: Chapter7Record): Promise<Chapter7Record>;
};

export function createFileChapter7Store(options?: {
  dataDir?: string;
  fileName?: string;
}): Chapter7Store {
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

  async function readDatabase(): Promise<Chapter7Database> {
    try {
      const raw = await readFile(dbFile, "utf8");
      const parsed = JSON.parse(raw) as Chapter7Database;
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

  async function writeDatabase(database: Chapter7Database): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
    await rename(tempFile, dbFile);
  }

  return {
    findChapter7ForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
          return undefined;
        }
        const database = await readDatabase();
        return database.records.find((entry) => entry.userId === trimmed);
      });
    },

    saveChapter7(record) {
      return enqueueWrite(async () => {
        const normalized = normalizeRecord(record);
        if (!normalized) {
          throw new Error("Invalid Chapter VII payload.");
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

let storeInstance: Chapter7Store | null = null;

export function getChapter7Store(): Chapter7Store {
  if (!storeInstance) {
    storeInstance = createFileChapter7Store();
  }
  return storeInstance;
}

export function setChapter7StoreForTests(store: Chapter7Store | null): void {
  storeInstance = store;
}

export function ensureChapter7Record(
  existing: Chapter7Record | undefined,
  userId: string,
): Chapter7Record {
  if (existing) {
    return existing;
  }
  return createEmptyChapter7Record(userId);
}
