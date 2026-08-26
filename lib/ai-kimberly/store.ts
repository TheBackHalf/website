import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import {
  appendMessage,
  createConversation,
  createMessage,
  sortMessagesChronologically,
} from "@/lib/lumina/conversation";
import type {
  AiKimberlyConversation,
  AiKimberlyDatabase,
} from "@/lib/ai-kimberly/types";
import type { LuminaMessage } from "@/lib/lumina/types";

const DEFAULT_DATA_DIR = ".data/ai-kimberly";

const emptyDatabase = (): AiKimberlyDatabase => ({
  conversations: [],
});

function normalizeConversation(
  raw: AiKimberlyConversation,
): AiKimberlyConversation {
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

function normalizeDatabase(raw: AiKimberlyDatabase): AiKimberlyDatabase {
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

async function readDatabase(dbFile: string): Promise<AiKimberlyDatabase> {
  try {
    const raw = await readFile(dbFile, "utf8");
    return normalizeDatabase(JSON.parse(raw) as AiKimberlyDatabase);
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
  database: AiKimberlyDatabase,
): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
  await rename(tempFile, dbFile);
}

export type AiKimberlyStore = {
  getOrCreateConversationForUser(
    userId: string,
  ): Promise<AiKimberlyConversation>;
  findConversationForUser(
    conversationId: string,
    userId: string,
  ): Promise<AiKimberlyConversation | undefined>;
  saveConversation(
    conversation: AiKimberlyConversation,
  ): Promise<AiKimberlyConversation>;
};

export type CreateFileAiKimberlyStoreOptions = {
  dataDir?: string;
};

export function createFileAiKimberlyStore(
  options: CreateFileAiKimberlyStoreOptions = {},
): AiKimberlyStore {
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  const dbFile = options.dataDir
    ? `${options.dataDir}/database.json`
    : ".data/ai-kimberly/database.json";

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
  };
}

let aiKimberlyStore: AiKimberlyStore | undefined;

export function getAiKimberlyStore(): AiKimberlyStore {
  if (!aiKimberlyStore) {
    aiKimberlyStore = createFileAiKimberlyStore();
  }
  return aiKimberlyStore;
}

export function setAiKimberlyStoreForTests(store: AiKimberlyStore | undefined) {
  aiKimberlyStore = store;
}

export { createMessage, appendMessage };
