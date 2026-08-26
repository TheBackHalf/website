import { DurablePersistenceError, requireDurableSql } from "@/lib/durable/db";
import { ensureDurableSchema } from "@/lib/durable/schema";

type DocumentRow<T> = {
  collection: string;
  doc_id: string;
  payload: T;
  updated_at: Date | string;
};

const COLLECTION = /^[a-z0-9_]+$/;

function assertCollection(collection: string): string {
  if (!COLLECTION.test(collection)) {
    throw new DurablePersistenceError("invalid_collection");
  }
  return collection;
}

export async function getDurableDocument<T>(
  collection: string,
  docId: string,
): Promise<T | undefined> {
  const trimmed = docId.trim();
  if (!trimmed) return undefined;
  const sql = await ensureDurableSchema();
  const rows = await sql<DocumentRow<T>[]>`
    SELECT payload FROM bh_durable_documents
    WHERE collection = ${assertCollection(collection)} AND doc_id = ${trimmed}
    LIMIT 1
  `;
  return rows[0]?.payload;
}

export async function putDurableDocument<T>(
  collection: string,
  docId: string,
  payload: T,
): Promise<T> {
  const trimmed = docId.trim();
  if (!trimmed) {
    throw new DurablePersistenceError("invalid_document_id");
  }
  const sql = await ensureDurableSchema();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO bh_durable_documents (collection, doc_id, payload, updated_at)
    VALUES (
      ${assertCollection(collection)},
      ${trimmed},
      ${sql.json(payload as never)},
      ${now}
    )
    ON CONFLICT (collection, doc_id)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
  `;
  return payload;
}

export async function listDurableDocuments<T>(collection: string): Promise<T[]> {
  const sql = await ensureDurableSchema();
  const rows = await sql<DocumentRow<T>[]>`
    SELECT payload FROM bh_durable_documents
    WHERE collection = ${assertCollection(collection)}
    ORDER BY updated_at ASC
  `;
  return rows.map((row) => row.payload);
}

export function createUserDocumentAdapter<T extends { userId: string }>(options: {
  collection: string;
  normalize: (raw: T) => T | null;
}): {
  findForUser(userId: string): Promise<T | undefined>;
  save(record: T): Promise<T>;
  list(): Promise<T[]>;
} {
  const { collection, normalize } = options;
  return {
    async findForUser(userId) {
      const raw = await getDurableDocument<T>(collection, userId);
      if (!raw) return undefined;
      return normalize(raw) ?? undefined;
    },
    async save(record) {
      const normalized = normalize(record);
      if (!normalized?.userId) {
        throw new DurablePersistenceError("invalid_document");
      }
      return putDurableDocument(collection, normalized.userId, normalized);
    },
    async list() {
      const rows = await listDurableDocuments<T>(collection);
      return rows
        .map((row) => normalize(row))
        .filter((row): row is T => Boolean(row));
    },
  };
}

export function requireDurableSqlOrThrow() {
  return requireDurableSql();
}
