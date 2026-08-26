/**
 * Shared Journey chapter document persistence.
 *
 * This is the durable backend for the existing Chapter I–VII stores —
 * not a second Journey product store. B2 181/182/185 persistence
 * remediation should reuse this table / SQL client rather than adding
 * another chapter database.
 */

import type { Sql } from "postgres";
import {
  analyticsPostgresConfigured,
  getAnalyticsSql,
  isHostedProduction,
} from "@/lib/analytics/db";

export { isHostedProduction };

export class JourneyPersistenceError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "JourneyPersistenceError";
    this.code = code;
  }
}

export type JourneyChapterStoreBackend =
  | "supabase_postgres"
  | "file_local_development"
  | "unconfigured_production";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS bh_journey_chapters (
  user_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, chapter_id)
);
CREATE INDEX IF NOT EXISTS bh_journey_chapters_user_idx
  ON bh_journey_chapters (user_id);
`;

let schemaReady = false;

export function journeyPostgresConfigured(): boolean {
  return analyticsPostgresConfigured();
}

export function getJourneySql(): Sql | null {
  return getAnalyticsSql();
}

export async function ensureJourneyChapterSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql.unsafe(SCHEMA_SQL);
  schemaReady = true;
}

export function resetJourneyChapterSchemaFlagForTests(): void {
  schemaReady = false;
}

function requireSql(): Sql {
  const sql = getJourneySql();
  if (!sql) {
    throw new JourneyPersistenceError("journey_postgres_unconfigured");
  }
  return sql;
}

type ChapterRow = {
  user_id: string;
  chapter_id: string;
  payload: unknown;
  updated_at: Date | string;
};

export async function findJourneyChapterPayload(
  userId: string,
  chapterId: string,
): Promise<unknown | undefined> {
  const sql = requireSql();
  await ensureJourneyChapterSchema(sql);
  const rows = await sql<ChapterRow[]>`
    SELECT user_id, chapter_id, payload, updated_at
    FROM bh_journey_chapters
    WHERE user_id = ${userId} AND chapter_id = ${chapterId}
    LIMIT 1
  `;
  return rows[0]?.payload;
}

export async function saveJourneyChapterPayload(
  userId: string,
  chapterId: string,
  payload: object,
): Promise<void> {
  const sql = requireSql();
  await ensureJourneyChapterSchema(sql);
  const updatedAt = new Date().toISOString();
  await sql`
    INSERT INTO bh_journey_chapters (user_id, chapter_id, payload, updated_at)
    VALUES (${userId}, ${chapterId}, ${sql.json(payload as never)}, ${updatedAt})
    ON CONFLICT (user_id, chapter_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function deleteJourneyChapterPayloadForTests(
  userId: string,
  chapterId: string,
): Promise<void> {
  const sql = requireSql();
  await ensureJourneyChapterSchema(sql);
  await sql`
    DELETE FROM bh_journey_chapters
    WHERE user_id = ${userId} AND chapter_id = ${chapterId}
  `;
}
