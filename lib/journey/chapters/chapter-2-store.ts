/**
 * Chapter II file-backed store (account-scoped).
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isChapter2SectionId,
  isMirrorDimensionId,
  MIRROR_DIMENSIONS,
  type MirrorDimensionId,
  type MirrorMatrixRow,
} from "@/content/journey/chapter-2-mirror";
import { normalizeMirrorReflectionAnswers } from "@/lib/journey/chapters/chapter-2";
import {
  createEmptyChapter2Record,
  emptyMirrorExerciseAnswers,
  emptyMirrorReflectionAnswers,
  type Chapter2Database,
  type Chapter2Record,
  type ChapterProgressStatus,
  type MirrorCommitmentState,
  type MirrorExerciseAnswers,
  type MirrorExerciseState,
  type MirrorReflectionState,
} from "@/lib/journey/chapters/types";
import {
  migrateChapter2CompletedSectionIds,
  migrateChapter2CurrentSectionId,
  needsChapterStructureMigration,
} from "@/lib/journey/chapters/legacy-teaching";

const DEFAULT_DATA_DIR = ".data/journey";
const DEFAULT_DB_FILE = "chapter-2.json";
const DEFAULT_DB_RELATIVE = `${DEFAULT_DATA_DIR}/${DEFAULT_DB_FILE}`;

const emptyDatabase = (): Chapter2Database => ({
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

function normalizeMatrixRow(raw: unknown): MirrorMatrixRow {
  if (!raw || typeof raw !== "object") {
    return {
      expectation: "",
      intention: "",
      decision: "",
      dailyEvidence: "",
    };
  }
  const source = raw as Record<string, unknown>;
  return {
    expectation:
      typeof source.expectation === "string" ? source.expectation : "",
    intention: typeof source.intention === "string" ? source.intention : "",
    decision: typeof source.decision === "string" ? source.decision : "",
    dailyEvidence:
      typeof source.dailyEvidence === "string" ? source.dailyEvidence : "",
  };
}

function normalizeMatrixRows(raw: unknown): MirrorMatrixRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeMatrixRow).slice(0, 100);
}

function normalizeStep4(raw: unknown): Record<MirrorDimensionId, string> {
  const base = emptyMirrorExerciseAnswers().step4;
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const source = raw as Record<string, unknown>;
  for (const dimension of MIRROR_DIMENSIONS) {
    if (isMirrorDimensionId(dimension.id)) {
      const value = source[dimension.id];
      base[dimension.id] = typeof value === "string" ? value : "";
    }
  }
  return base;
}

function normalizeAnswers(raw: unknown): MirrorExerciseAnswers {
  const base = emptyMirrorExerciseAnswers();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const source = raw as Record<string, unknown>;
  return {
    step1: normalizeAnswerList(source.step1),
    step2: normalizeAnswerList(source.step2),
    step3: normalizeMatrixRows(source.step3),
    step4: normalizeStep4(source.step4),
  };
}

function normalizeMirrorExercise(
  raw: MirrorExerciseState | undefined,
  now: string,
): MirrorExerciseState {
  if (!raw || typeof raw !== "object") {
    return {
      answers: emptyMirrorExerciseAnswers(),
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
  raw: MirrorReflectionState | undefined,
  now: string,
): MirrorReflectionState {
  if (!raw || typeof raw !== "object") {
    return {
      answers: emptyMirrorReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    };
  }
  return {
    answers: normalizeMirrorReflectionAnswers(raw.answers),
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
    completedAt:
      typeof raw.completedAt === "string" && raw.completedAt
        ? raw.completedAt
        : null,
  };
}

function normalizeCommitment(
  raw: MirrorCommitmentState | undefined,
  now: string,
): MirrorCommitmentState {
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

function normalizeStatus(raw: unknown): ChapterProgressStatus {
  if (raw === "completed" || raw === "in_progress" || raw === "not_started") {
    return raw;
  }
  return "not_started";
}

function normalizeRecord(raw: Chapter2Record): Chapter2Record | null {
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  if (!userId) {
    return null;
  }
  const now =
    typeof raw.updatedAt === "string" && raw.updatedAt
      ? raw.updatedAt
      : new Date().toISOString();
  const status = normalizeStatus(raw.status);
  const currentSectionId = migrateChapter2CurrentSectionId(
    raw.currentSectionId,
    isChapter2SectionId,
  );
  return {
    userId,
    chapterId: "chapter-2-mirror",
    status,
    currentSectionId,
    completedSectionIds: migrateChapter2CompletedSectionIds(
      raw.completedSectionIds,
      status,
      isChapter2SectionId,
    ),
    reflection: normalizeReflection(
      (raw as Chapter2Record).reflection,
      now,
    ),
    mirrorExercise: normalizeMirrorExercise(raw.mirrorExercise, now),
    commitment: normalizeCommitment(
      (raw as Chapter2Record).commitment,
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

function normalizeDatabase(raw: Chapter2Database): Chapter2Database {
  const records: Chapter2Record[] = [];
  if (Array.isArray(raw.records)) {
    for (const entry of raw.records) {
      const normalized = normalizeRecord(entry as Chapter2Record);
      if (normalized) {
        records.push(normalized);
      }
    }
  }
  return { records };
}

export type Chapter2Store = {
  findChapter2ForUser(userId: string): Promise<Chapter2Record | undefined>;
  saveChapter2(record: Chapter2Record): Promise<Chapter2Record>;
  deleteForUser(userId: string): Promise<number>;
};

export function createFileChapter2Store(options?: {
  dataDir?: string;
  fileName?: string;
}): Chapter2Store {
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

  async function readDatabase(): Promise<Chapter2Database> {
    try {
      const raw = await readFile(dbFile, "utf8");
      const parsed = JSON.parse(raw) as Chapter2Database;
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

  async function writeDatabase(database: Chapter2Database): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
    await rename(tempFile, dbFile);
  }

  return {
    findChapter2ForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
          return undefined;
        }
        const database = await readDatabase();
        return database.records.find((entry) => entry.userId === trimmed);
      });
    },

    saveChapter2(record) {
      return enqueueWrite(async () => {
        const normalized = normalizeRecord(record);
        if (!normalized) {
          throw new Error("Invalid Chapter II payload.");
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

let storeInstance: Chapter2Store | null = null;

export function getChapter2Store(): Chapter2Store {
  if (!storeInstance) {
    storeInstance = createFileChapter2Store();
  }
  return storeInstance;
}

export function setChapter2StoreForTests(store: Chapter2Store | null): void {
  storeInstance = store;
}

export function ensureChapter2Record(
  existing: Chapter2Record | undefined,
  userId: string,
): Chapter2Record {
  if (existing) {
    return existing;
  }
  return createEmptyChapter2Record(userId);
}
