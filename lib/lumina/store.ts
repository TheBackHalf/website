import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  appendMessage,
  createConversation,
  createMessage,
  sortMessagesChronologically,
} from "@/lib/lumina/conversation";
import {
  clearLuminaMemoryPayload,
  emptyLuminaMemoryRecord,
  normalizeLuminaMemoryRecord,
} from "@/lib/lumina/memory/normalize";
import type { LuminaMemoryRecord } from "@/lib/lumina/memory/types";
import type {
  LuminaConversation,
  LuminaDatabase,
  LuminaMessage,
} from "@/lib/lumina/types";

const DEFAULT_DATA_DIR = ".data/lumina";

const emptyDatabase = (): LuminaDatabase => ({
  conversations: [],
  memories: [],
});

function normalizeConversation(raw: LuminaConversation): LuminaConversation {
  const messages = Array.isArray(raw.messages)
    ? sortMessagesChronologically(
        raw.messages.filter(
          (entry): entry is LuminaMessage =>
            Boolean(entry) &&
            typeof entry.id === "string" &&
            typeof entry.conversationId === "string" &&
            typeof entry.content === "string" &&
            (entry.role === "user" ||
              entry.role === "assistant" ||
              entry.role === "system-ui"),
        ),
      )
    : [];

  return {
    id: raw.id,
    userId: raw.userId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    messages,
  };
}

function normalizeDatabase(raw: LuminaDatabase): LuminaDatabase {
  const memories = Array.isArray(raw.memories)
    ? raw.memories
        .map((entry) => normalizeLuminaMemoryRecord(entry))
        .filter((entry): entry is LuminaMemoryRecord => Boolean(entry))
    : [];

  // Reconcile duplicate userIds — last write wins by updatedAt.
  const memoryByUser = new Map<string, LuminaMemoryRecord>();
  for (const memory of memories) {
    const current = memoryByUser.get(memory.userId);
    if (!current || memory.updatedAt >= current.updatedAt) {
      memoryByUser.set(memory.userId, memory);
    }
  }

  return {
    conversations: Array.isArray(raw.conversations)
      ? raw.conversations
          .filter(
            (entry) =>
              entry &&
              typeof entry.id === "string" &&
              typeof entry.userId === "string",
          )
          .map((entry) => normalizeConversation(entry))
      : [],
    memories: [...memoryByUser.values()],
  };
}

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readDatabase(dbFile: string): Promise<LuminaDatabase> {
  try {
    const raw = await readFile(dbFile, "utf8");
    return normalizeDatabase(JSON.parse(raw) as LuminaDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(
  dataDir: string,
  dbFile: string,
  database: LuminaDatabase,
): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
  await rename(tempFile, dbFile);
}

function upsertMemoryInDatabase(
  database: LuminaDatabase,
  record: LuminaMemoryRecord,
): LuminaMemoryRecord {
  const normalized = normalizeLuminaMemoryRecord(record);
  if (!normalized) {
    throw new Error("Invalid memory record.");
  }
  const index = database.memories.findIndex(
    (entry) => entry.userId === normalized.userId,
  );
  if (index < 0) {
    database.memories.push(normalized);
  } else {
    database.memories[index] = normalized;
  }
  return normalized;
}

export type LuminaStore = {
  getOrCreateConversationForUser(userId: string): Promise<LuminaConversation>;
  findConversationForUser(
    conversationId: string,
    userId: string,
  ): Promise<LuminaConversation | undefined>;
  saveConversation(conversation: LuminaConversation): Promise<LuminaConversation>;
  appendMessageForUser(input: {
    conversationId: string;
    userId: string;
    message: Omit<LuminaMessage, "id" | "conversationId" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    };
  }): Promise<LuminaConversation | undefined>;
  getOrCreateMemoryForUser(userId: string): Promise<LuminaMemoryRecord>;
  findMemoryForUser(userId: string): Promise<LuminaMemoryRecord | undefined>;
  saveMemory(record: LuminaMemoryRecord): Promise<LuminaMemoryRecord>;
  clearMemoryPayloadForUser(userId: string): Promise<LuminaMemoryRecord>;
};

export type CreateFileLuminaStoreOptions = {
  /** Isolate eval/test data from production `.data/lumina`. */
  dataDir?: string;
};

export function createFileLuminaStore(
  options: CreateFileLuminaStoreOptions = {},
): LuminaStore {
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  const dbFile = options.dataDir
    ? `${options.dataDir}/database.json`
    : ".data/lumina/database.json";

  return {
    getOrCreateConversationForUser(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const existing = database.conversations.find(
          (entry) => entry.userId === userId,
        );
        if (existing) {
          return normalizeConversation(existing);
        }

        const created = createConversation(userId);
        database.conversations.push(created);
        await writeDatabase(dataDir, dbFile, database);
        return created;
      });
    },

    findConversationForUser(conversationId, userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const found = database.conversations.find(
          (entry) => entry.id === conversationId && entry.userId === userId,
        );
        return found ? normalizeConversation(found) : undefined;
      });
    },

    saveConversation(conversation) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const normalized = normalizeConversation(conversation);
        const index = database.conversations.findIndex(
          (entry) => entry.id === normalized.id,
        );

        if (index < 0) {
          // Ownership: never insert under a mismatched user via save.
          database.conversations.push(normalized);
        } else {
          const current = database.conversations[index]!;
          if (current.userId !== normalized.userId) {
            return normalizeConversation(current);
          }
          database.conversations[index] = normalized;
        }

        await writeDatabase(dataDir, dbFile, database);
        return normalized;
      });
    },

    appendMessageForUser(input) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const index = database.conversations.findIndex(
          (entry) =>
            entry.id === input.conversationId && entry.userId === input.userId,
        );
        if (index < 0) {
          return undefined;
        }

        const current = normalizeConversation(database.conversations[index]!);
        const message = createMessage({
          conversationId: current.id,
          role: input.message.role,
          content: input.message.content,
          citations: input.message.citations,
          createdAt: input.message.createdAt,
        });
        if (input.message.id) {
          message.id = input.message.id;
        }

        const updated = appendMessage(current, message);
        database.conversations[index] = updated;
        await writeDatabase(dataDir, dbFile, database);
        return updated;
      });
    },

    getOrCreateMemoryForUser(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const existing = database.memories.find(
          (entry) => entry.userId === userId,
        );
        if (existing) {
          return existing;
        }
        const created = emptyLuminaMemoryRecord(userId);
        upsertMemoryInDatabase(database, created);
        await writeDatabase(dataDir, dbFile, database);
        return created;
      });
    },

    findMemoryForUser(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.memories.find((entry) => entry.userId === userId);
      });
    },

    saveMemory(record) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const saved = upsertMemoryInDatabase(database, record);
        await writeDatabase(dataDir, dbFile, database);
        return saved;
      });
    },

    clearMemoryPayloadForUser(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const existing = database.memories.find(
          (entry) => entry.userId === userId,
        );
        const base = existing ?? emptyLuminaMemoryRecord(userId);
        const cleared = clearLuminaMemoryPayload(base);
        const saved = upsertMemoryInDatabase(database, cleared);
        await writeDatabase(dataDir, dbFile, database);
        return saved;
      });
    },
  };
}

let luminaStore: LuminaStore | undefined;

export function getLuminaStore(): LuminaStore {
  if (!luminaStore) {
    luminaStore = createFileLuminaStore();
  }
  return luminaStore;
}

/** Test helper — replace store implementation. */
export function setLuminaStoreForTests(store: LuminaStore | undefined) {
  luminaStore = store;
}
