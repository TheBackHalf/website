/**
 * Row 85 — Chapter I file-backed store (account-scoped).
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createEmptyChapter1Record,
  emptyAlivenessProjectAnswers,
  emptyAwakeningReflectionAnswers,
  type AlivenessProjectAnswers,
  type AlivenessProjectState,
  type AwakeningCommitmentState,
  type AwakeningReflectionState,
  type Chapter1Database,
  type Chapter1Record,
  type ChapterProgressStatus,
} from "@/lib/journey/chapters/types";
import type {
  AlivenessProjectQuestionId,
  Chapter1SectionId,
} from "@/content/journey/chapter-1-awakening";
import { isChapter1SectionId } from "@/content/journey/chapter-1-awakening";
import { normalizeAwakeningReflectionAnswers } from "@/lib/journey/chapters/chapter-1";
import {
  migrateChapter1CompletedSectionIds,
  migrateChapter1CurrentSectionId,
  needsChapterStructureMigration,
} from "@/lib/journey/chapters/legacy-teaching";
import {
  createPostgresChapterDocumentAdapter,
  rejectUnconfiguredJourneyStore,
} from "@/lib/journey/chapters/postgres-store";
import { createJourneyChapterStoreInstance } from "@/lib/journey/chapters/runtime";

const DEFAULT_DATA_DIR = ".data/journey";
const DEFAULT_DB_FILE = "chapter-1.json";
const DEFAULT_DB_RELATIVE = `${DEFAULT_DATA_DIR}/${DEFAULT_DB_FILE}`;

const QUESTION_IDS: AlivenessProjectQuestionId[] = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
];

const emptyDatabase = (): Chapter1Database => ({
  records: [],
});

function normalizeAnswerList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => (typeof entry === "string" ? entry : ""))
    .slice(0, 200);
}

function normalizeAnswers(raw: unknown): AlivenessProjectAnswers {
  const base = emptyAlivenessProjectAnswers();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const source = raw as Record<string, unknown>;
  for (const id of QUESTION_IDS) {
    base[id] = normalizeAnswerList(source[id]);
  }
  return base;
}

function normalizeAlivenessProject(
  raw: AlivenessProjectState | undefined,
  now: string,
): AlivenessProjectState {
  if (!raw || typeof raw !== "object") {
    return {
      answers: emptyAlivenessProjectAnswers(),
      updatedAt: now,
      completedAt: null,
    };
  }
  return {
    answers: normalizeAnswers(raw.answers),
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeReflection(
  raw: AwakeningReflectionState | undefined,
  now: string,
): AwakeningReflectionState {
  if (!raw || typeof raw !== "object") {
    return {
      answers: emptyAwakeningReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    };
  }
  return {
    answers: normalizeAwakeningReflectionAnswers(raw.answers),
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeCommitment(
  raw: AwakeningCommitmentState | undefined,
  now: string,
): AwakeningCommitmentState {
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

function normalizeSectionIds(
  raw: unknown,
  status: ChapterProgressStatus,
): Chapter1SectionId[] {
  return migrateChapter1CompletedSectionIds(raw, status, isChapter1SectionId);
}

function normalizeStatus(raw: unknown): ChapterProgressStatus {
  if (raw === "completed" || raw === "in_progress" || raw === "not_started") {
    return raw;
  }
  return "not_started";
}

function normalizeRecord(raw: Chapter1Record): Chapter1Record | null {
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  if (!userId) {
    return null;
  }
  const now =
    typeof raw.updatedAt === "string" && raw.updatedAt
      ? raw.updatedAt
      : new Date().toISOString();
  const status = normalizeStatus(raw.status);
  const currentSectionId = migrateChapter1CurrentSectionId(
    raw.currentSectionId,
    isChapter1SectionId,
  );
  return {
    userId,
    chapterId: "chapter-1-awakening",
    status,
    currentSectionId,
    completedSectionIds: normalizeSectionIds(raw.completedSectionIds, status),
    reflection: normalizeReflection(
      (raw as Chapter1Record).reflection,
      now,
    ),
    alivenessProject: normalizeAlivenessProject(raw.alivenessProject, now),
    commitment: normalizeCommitment(
      (raw as Chapter1Record).commitment,
      now,
    ),
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : now,
    updatedAt: now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeDatabase(raw: Chapter1Database): Chapter1Database {
  const records: Chapter1Record[] = [];
  if (Array.isArray(raw.records)) {
    for (const entry of raw.records) {
      const normalized = normalizeRecord(entry as Chapter1Record);
      if (normalized) {
        records.push(normalized);
      }
    }
  }
  return { records };
}

export type Chapter1Store = {
  findChapter1ForUser(userId: string): Promise<Chapter1Record | undefined>;
  saveChapter1(record: Chapter1Record): Promise<Chapter1Record>;
};

export function createFileChapter1Store(options?: {
  dataDir?: string;
  fileName?: string;
}): Chapter1Store {
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

  async function readDatabase(): Promise<Chapter1Database> {
    try {
      const raw = await readFile(dbFile, "utf8");
      const parsed = JSON.parse(raw) as Chapter1Database;
      const needsWrite = Array.isArray(parsed.records)
        ? parsed.records.some((entry) =>
            needsChapterStructureMigration(
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

  async function writeDatabase(database: Chapter1Database): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
    await rename(tempFile, dbFile);
  }

  return {
    findChapter1ForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
          return undefined;
        }
        const database = await readDatabase();
        return database.records.find((entry) => entry.userId === trimmed);
      });
    },

    saveChapter1(record) {
      return enqueueWrite(async () => {
        const normalized = normalizeRecord(record);
        if (!normalized) {
          throw new Error("Invalid Chapter I payload.");
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

let storeInstance: Chapter1Store | null = null;

function createPostgresChapter1Store(): Chapter1Store {
  const docs = createPostgresChapterDocumentAdapter<Chapter1Record>({
    chapterId: "chapter-1-awakening",
    normalize: normalizeRecord,
    invalidMessage: "Invalid Chapter I payload.",
  });
  return {
    findChapter1ForUser: (userId) => docs.find(userId),
    saveChapter1: (record) => docs.save(record),
  };
}

function createUnconfiguredChapter1Store(): Chapter1Store {
  return {
    findChapter1ForUser: rejectUnconfiguredJourneyStore,
    saveChapter1: rejectUnconfiguredJourneyStore,
  };
}

export function getChapter1Store(): Chapter1Store {
  if (!storeInstance) {
    storeInstance = createJourneyChapterStoreInstance({
      file: () => createFileChapter1Store(),
      postgres: createPostgresChapter1Store,
      unconfigured: createUnconfiguredChapter1Store,
    });
  }
  return storeInstance;
}

export function setChapter1StoreForTests(store: Chapter1Store | null): void {
  storeInstance = store;
}

export function ensureChapter1Record(
  existing: Chapter1Record | undefined,
  userId: string,
): Chapter1Record {
  if (existing) {
    return existing;
  }
  return createEmptyChapter1Record(userId);
}
