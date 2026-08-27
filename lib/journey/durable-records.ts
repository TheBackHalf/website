import {
  ensureLaunchDashboardSchema,
  getLaunchDashboardSql,
  isHostedProduction,
  LaunchDashboardPersistenceError,
  launchDashboardPostgresConfigured,
} from "@/lib/launch-dashboard/db";

export const JOURNEY_PARTICIPANT_TABLE = "journey_participant_records";
export const LUMINA_CONVERSATIONS_TABLE = "lumina_conversations";
export const LUMINA_MEMORIES_TABLE = "lumina_memories";

export const JOURNEY_COLLECTIONS = {
  progress: "journey_progress",
  onboarding: "journey_onboarding",
  chapter1: "journey_chapter_1",
  chapter2: "journey_chapter_2",
  chapter3: "journey_chapter_3",
  chapter4: "journey_chapter_4",
  chapter5: "journey_chapter_5",
  chapter6: "journey_chapter_6",
  chapter7: "journey_chapter_7",
} as const;

export type JourneyCollection =
  (typeof JOURNEY_COLLECTIONS)[keyof typeof JOURNEY_COLLECTIONS];

export const PARTICIPANT_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS journey_participant_records (
  collection TEXT NOT NULL,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (collection, user_id)
);
CREATE INDEX IF NOT EXISTS journey_participant_records_user_idx
  ON journey_participant_records (user_id);
CREATE TABLE IF NOT EXISTS lumina_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS lumina_conversations_user_idx ON lumina_conversations (user_id);
CREATE TABLE IF NOT EXISTS lumina_memories (
  user_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
`;

type ParticipantRow<T> = {
  collection: string;
  user_id: string;
  payload: T;
  updated_at: Date | string;
};

export type ParticipantPersistenceBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "file_local_development"
  | "unconfigured_production";

export function journeyFileOverrideDir(): string | undefined {
  const value = process.env.JOURNEY_DB_DIR?.trim();
  return value ? value : undefined;
}

export function luminaFileOverrideDir(): string | undefined {
  const value = process.env.LUMINA_DATA_DIR?.trim();
  return value ? value : undefined;
}

export function getParticipantPersistenceBackend(
  fileOverride: boolean,
): ParticipantPersistenceBackend {
  if (fileOverride) return "file_test_override";
  if (launchDashboardPostgresConfigured()) return "supabase_postgres";
  if (isHostedProduction()) return "unconfigured_production";
  return "file_local_development";
}

async function requireSql() {
  const sql = getLaunchDashboardSql();
  if (!sql) {
    throw new LaunchDashboardPersistenceError("participant_postgres_unconfigured");
  }
  await ensureLaunchDashboardSchema(sql);
  await sql.unsafe(PARTICIPANT_TABLE_SQL);
  return sql;
}

export async function readJourneyParticipantRecord<T>(
  collection: JourneyCollection,
  userId: string,
): Promise<T | undefined> {
  const trimmed = userId.trim();
  if (!trimmed) return undefined;
  const sql = await requireSql();
  const rows = await sql<ParticipantRow<T>[]>`
    SELECT * FROM journey_participant_records
    WHERE collection = ${collection} AND user_id = ${trimmed}
    LIMIT 1
  `;
  return rows[0]?.payload;
}

export async function writeJourneyParticipantRecord<T extends { userId: string }>(
  collection: JourneyCollection,
  record: T,
): Promise<T> {
  const sql = await requireSql();
  const userId = record.userId.trim();
  if (!userId) {
    throw new Error("Invalid participant record.");
  }
  const now = new Date().toISOString();
  await sql`
    INSERT INTO journey_participant_records (collection, user_id, payload, updated_at)
    VALUES (${collection}, ${userId}, ${sql.json(record as never)}, ${now})
    ON CONFLICT (collection, user_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at
  `;
  return record;
}

export async function deleteJourneyParticipantRecord(
  collection: JourneyCollection,
  userId: string,
): Promise<number> {
  const trimmed = userId.trim();
  if (!trimmed) return 0;
  const sql = await requireSql();
  const rows = await sql<{ user_id: string }[]>`
    DELETE FROM journey_participant_records
    WHERE collection = ${collection} AND user_id = ${trimmed}
    RETURNING user_id
  `;
  return rows.length;
}

export async function deleteAllJourneyParticipantRecordsForUser(
  userId: string,
): Promise<number> {
  const trimmed = userId.trim();
  if (!trimmed) return 0;
  const sql = await requireSql();
  const rows = await sql<{ user_id: string }[]>`
    DELETE FROM journey_participant_records
    WHERE user_id = ${trimmed}
    RETURNING user_id
  `;
  return rows.length;
}

export async function listJourneyParticipantRecords<T>(
  collection: JourneyCollection,
): Promise<T[]> {
  const sql = await requireSql();
  const rows = await sql<ParticipantRow<T>[]>`
    SELECT * FROM journey_participant_records
    WHERE collection = ${collection}
    ORDER BY updated_at ASC
  `;
  return rows.map((row) => row.payload);
}

export function createUnconfiguredParticipantStore<T extends object>(
  name: string,
): T {
  const reject = () =>
    Promise.reject(new LaunchDashboardPersistenceError(`${name}_postgres_unconfigured`));
  return new Proxy({} as T, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      return reject;
    },
  });
}

export function createPostgresKeyedStore<T extends { userId: string }>(
  collection: JourneyCollection,
) {
  return {
    findForUser(userId: string) {
      return readJourneyParticipantRecord<T>(collection, userId);
    },
    save(record: T) {
      return writeJourneyParticipantRecord(collection, record);
    },
    deleteForUser(userId: string) {
      return deleteJourneyParticipantRecord(collection, userId);
    },
    list() {
      return listJourneyParticipantRecords<T>(collection);
    },
  };
}
