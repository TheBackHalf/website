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
import type { LuminaConversation, LuminaMessage } from "@/lib/lumina/types";
import type { LuminaStore } from "@/lib/lumina/store";
import {
  LUMINA_CONVERSATIONS_TABLE,
  LUMINA_MEMORIES_TABLE,
  PARTICIPANT_TABLE_SQL,
} from "@/lib/journey/durable-records";
import {
  ensureLaunchDashboardSchema,
  getLaunchDashboardSql,
  LaunchDashboardPersistenceError,
} from "@/lib/launch-dashboard/db";

type ConversationRow = {
  id: string;
  user_id: string;
  payload: LuminaConversation;
  created_at: Date | string;
  updated_at: Date | string;
};

type MemoryRow = {
  user_id: string;
  payload: LuminaMemoryRecord;
  updated_at: Date | string;
};

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

async function requireSql() {
  const sql = getLaunchDashboardSql();
  if (!sql) {
    throw new LaunchDashboardPersistenceError("lumina_postgres_unconfigured");
  }
  await ensureLaunchDashboardSchema(sql);
  await sql.unsafe(PARTICIPANT_TABLE_SQL);
  return sql;
}

export function createPostgresLuminaStore(): LuminaStore {
  return {
    async getOrCreateConversationForUser(userId) {
      const sql = await requireSql();
      const existing = await sql<ConversationRow[]>`
        SELECT * FROM lumina_conversations
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (existing[0]) {
        return normalizeConversation(existing[0].payload);
      }
      const created = createConversation(userId);
      await sql`
        INSERT INTO lumina_conversations (id, user_id, payload, created_at, updated_at)
        VALUES (
          ${created.id}, ${created.userId}, ${sql.json(created)},
          ${created.createdAt}, ${created.updatedAt}
        )
      `;
      return created;
    },

    async findConversationForUser(conversationId, userId) {
      const sql = await requireSql();
      const rows = await sql<ConversationRow[]>`
        SELECT * FROM lumina_conversations
        WHERE id = ${conversationId} AND user_id = ${userId}
        LIMIT 1
      `;
      return rows[0] ? normalizeConversation(rows[0].payload) : undefined;
    },

    async saveConversation(conversation) {
      const sql = await requireSql();
      const normalized = normalizeConversation(conversation);
      const current = await sql<ConversationRow[]>`
        SELECT * FROM lumina_conversations WHERE id = ${normalized.id} LIMIT 1
      `;
      if (current[0] && current[0].user_id !== normalized.userId) {
        return normalizeConversation(current[0].payload);
      }
      await sql`
        INSERT INTO lumina_conversations (id, user_id, payload, created_at, updated_at)
        VALUES (
          ${normalized.id}, ${normalized.userId}, ${sql.json(normalized)},
          ${normalized.createdAt}, ${normalized.updatedAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at
      `;
      return normalized;
    },

    async appendMessageForUser(input) {
      const sql = await requireSql();
      const rows = await sql<ConversationRow[]>`
        SELECT * FROM lumina_conversations
        WHERE id = ${input.conversationId} AND user_id = ${input.userId}
        LIMIT 1
      `;
      if (!rows[0]) return undefined;
      const current = normalizeConversation(rows[0].payload);
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
      await sql`
        UPDATE lumina_conversations
        SET payload = ${sql.json(updated)}, updated_at = ${updated.updatedAt}
        WHERE id = ${updated.id} AND user_id = ${updated.userId}
      `;
      return updated;
    },

    async getOrCreateMemoryForUser(userId) {
      const sql = await requireSql();
      const rows = await sql<MemoryRow[]>`
        SELECT * FROM lumina_memories WHERE user_id = ${userId} LIMIT 1
      `;
      if (rows[0]) {
        return normalizeLuminaMemoryRecord(rows[0].payload) ?? rows[0].payload;
      }
      const created = emptyLuminaMemoryRecord(userId);
      await sql`
        INSERT INTO lumina_memories (user_id, payload, updated_at)
        VALUES (${created.userId}, ${sql.json(created)}, ${created.updatedAt})
      `;
      return created;
    },

    async findMemoryForUser(userId) {
      const sql = await requireSql();
      const rows = await sql<MemoryRow[]>`
        SELECT * FROM lumina_memories WHERE user_id = ${userId} LIMIT 1
      `;
      if (!rows[0]) return undefined;
      return normalizeLuminaMemoryRecord(rows[0].payload) ?? rows[0].payload;
    },

    async saveMemory(record) {
      const sql = await requireSql();
      const normalized = normalizeLuminaMemoryRecord(record);
      if (!normalized) {
        throw new Error("Invalid memory record.");
      }
      await sql`
        INSERT INTO lumina_memories (user_id, payload, updated_at)
        VALUES (${normalized.userId}, ${sql.json(normalized)}, ${normalized.updatedAt})
        ON CONFLICT (user_id) DO UPDATE SET
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at
      `;
      return normalized;
    },

    async clearMemoryPayloadForUser(userId) {
      const existing = await this.findMemoryForUser(userId);
      const base = existing ?? emptyLuminaMemoryRecord(userId);
      return this.saveMemory(clearLuminaMemoryPayload(base));
    },

    async listConversationsForUser(userId) {
      const sql = await requireSql();
      const rows = await sql<ConversationRow[]>`
        SELECT * FROM lumina_conversations
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;
      return rows.map((row) => normalizeConversation(row.payload));
    },

    async eraseParticipantDataForUser(userId) {
      const sql = await requireSql();
      await sql`DELETE FROM lumina_conversations WHERE user_id = ${userId}`;
      await sql`DELETE FROM lumina_memories WHERE user_id = ${userId}`;
    },
  };
}

export { LUMINA_CONVERSATIONS_TABLE, LUMINA_MEMORIES_TABLE };
