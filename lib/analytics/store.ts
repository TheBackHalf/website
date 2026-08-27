import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import {
  AnalyticsPersistenceError,
  analyticsPostgresConfigured,
  ensureAnalyticsSchema,
  getAnalyticsSql,
  isHostedProduction,
} from "@/lib/analytics/db";
import type { AnalyticsEventName } from "@/lib/analytics/taxonomy";
import type {
  AnalyticsDatabase,
  AnalyticsEventRecord,
} from "@/lib/analytics/types";

const DEFAULT_DB_FILE = ".data/analytics/database.json";
const DEFAULT_DB_DIR = ".data/analytics";

function dbDir(): string {
  const override = process.env.ANALYTICS_DB_FILE?.replace(/\\/g, "/");
  if (!override) return DEFAULT_DB_DIR;
  const index = override.lastIndexOf("/");
  return index === -1 ? DEFAULT_DB_DIR : override.slice(0, index);
}

function usesFileOverride(): boolean {
  return Boolean(process.env.ANALYTICS_DB_FILE);
}

function forceFail(): void {
  if (process.env.ANALYTICS_FORCE_FAIL === "1") {
    throw new AnalyticsPersistenceError("analytics_forced_failure");
  }
}

function isTestRecord(input: {
  test?: boolean;
  payload?: AnalyticsEventRecord["payload"];
  idempotencyKey?: string;
  userId?: string;
}): boolean {
  if (input.test === true) return true;
  const session = String(input.payload?.stripeCheckoutSessionId ?? "");
  const intent = String(input.payload?.stripePaymentIntentId ?? "");
  const key = input.idempotencyKey ?? "";
  const userId = input.userId ?? "";
  return (
    session.startsWith("cs_test_") ||
    intent.startsWith("pi_test_") ||
    key.includes("cs_test_") ||
    key.includes("row150") ||
    key.startsWith("p1:") ||
    key.startsWith("p4:") ||
    key.startsWith("p5:") ||
    key.startsWith("p6:") ||
    key.startsWith("p9-") ||
    key.startsWith("p10-") ||
    key.startsWith("p-area:") ||
    key.startsWith("p-download:") ||
    userId.includes("row150")
  );
}

const emptyDatabase = (): AnalyticsDatabase => ({
  events: [],
});

function normalizeDatabase(raw: AnalyticsDatabase): AnalyticsDatabase {
  return {
    events: Array.isArray(raw.events) ? raw.events : [],
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

async function readDatabase(): Promise<AnalyticsDatabase> {
  try {
    const override = process.env.ANALYTICS_DB_FILE;
    const raw = override
      ? await readFile(/* turbopackIgnore: true */ override, "utf8")
      : await readFile(DEFAULT_DB_FILE, "utf8");
    return normalizeDatabase(JSON.parse(raw) as AnalyticsDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(database: AnalyticsDatabase): Promise<void> {
  const override = process.env.ANALYTICS_DB_FILE;
  const payload = JSON.stringify(database, null, 2);
  if (override) {
    await mkdir(/* turbopackIgnore: true */ dbDir(), { recursive: true });
    const tempFile = `${override}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(/* turbopackIgnore: true */ tempFile, payload, "utf8");
    await rename(/* turbopackIgnore: true */ tempFile, /* turbopackIgnore: true */ override);
    return;
  }
  await mkdir(DEFAULT_DB_DIR, { recursive: true });
  const tempFile = `${DEFAULT_DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, payload, "utf8");
  await rename(tempFile, DEFAULT_DB_FILE);
}

export type AnalyticsStoreBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "file_local_development"
  | "unconfigured_production";

export type AnalyticsStore = {
  backend: AnalyticsStoreBackend;
  findByIdempotencyKey(
    key: string,
  ): Promise<AnalyticsEventRecord | undefined>;
  appendEvent(
    record: Omit<AnalyticsEventRecord, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ): Promise<{ status: "created" | "duplicate"; record: AnalyticsEventRecord }>;
  listEventsByUserId(userId: string): Promise<AnalyticsEventRecord[]>;
  listEvents(): Promise<AnalyticsEventRecord[]>;
  deleteTestEventsByKeys(keys: string[]): Promise<number>;
  unlinkUserId(userId: string): Promise<number>;
};

function toRecord(
  input: Omit<AnalyticsEventRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): AnalyticsEventRecord {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    createdAt: input.createdAt ?? new Date().toISOString(),
    test: isTestRecord(input),
  };
}

export function createFileAnalyticsStore(
  backend: AnalyticsStoreBackend = "file_local_development",
): AnalyticsStore {
  return {
    backend,
    findByIdempotencyKey(key) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.events.find((entry) => entry.idempotencyKey === key);
      });
    },

    appendEvent(input) {
      return enqueueWrite(async () => {
        forceFail();
        const database = await readDatabase();
        const existing = database.events.find(
          (entry) => entry.idempotencyKey === input.idempotencyKey,
        );
        if (existing) {
          return { status: "duplicate" as const, record: existing };
        }

        const record = toRecord(input);
        database.events.push(record);
        await writeDatabase(database);
        return { status: "created" as const, record };
      });
    },

    listEventsByUserId(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.events.filter((entry) => entry.userId === userId);
      });
    },

    listEvents() {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.events;
      });
    },

    deleteTestEventsByKeys(keys) {
      return enqueueWrite(async () => {
        if (keys.length === 0) return 0;
        const wanted = new Set(keys);
        const database = await readDatabase();
        const remaining = database.events.filter(
          (entry) => !(entry.test === true && wanted.has(entry.idempotencyKey)),
        );
        const removed = database.events.length - remaining.length;
        if (removed > 0) {
          database.events = remaining;
          await writeDatabase(database);
        }
        return removed;
      });
    },

    unlinkUserId(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) return 0;
        const database = await readDatabase();
        let count = 0;
        database.events = database.events.map((entry) => {
          if (entry.userId !== trimmed) return entry;
          count += 1;
          return { ...entry, userId: undefined };
        });
        if (count > 0) await writeDatabase(database);
        return count;
      });
    },
  };
}

type EventRow = {
  id: string;
  name: AnalyticsEventName;
  created_at: Date | string;
  user_id: string | null;
  idempotency_key: string;
  payload: AnalyticsEventRecord["payload"] | null;
  test: boolean;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function fromRow(row: EventRow): AnalyticsEventRecord {
  return {
    id: row.id,
    name: row.name,
    userId: row.user_id ?? undefined,
    idempotencyKey: row.idempotency_key,
    payload: row.payload ?? undefined,
    createdAt: iso(row.created_at),
    test: row.test,
  };
}

export function createPostgresAnalyticsStore(): AnalyticsStore {
  return {
    backend: "supabase_postgres",
    async findByIdempotencyKey(key) {
      const sql = getAnalyticsSql();
      if (!sql) throw new AnalyticsPersistenceError("analytics_postgres_unconfigured");
      await ensureAnalyticsSchema(sql);
      const rows = await sql<EventRow[]>`
        SELECT * FROM analytics_events WHERE idempotency_key = ${key} LIMIT 1
      `;
      return rows[0] ? fromRow(rows[0]) : undefined;
    },

    async appendEvent(input) {
      forceFail();
      const sql = getAnalyticsSql();
      if (!sql) throw new AnalyticsPersistenceError("analytics_postgres_unconfigured");
      await ensureAnalyticsSchema(sql);
      const record = toRecord(input);
      const inserted = await sql<EventRow[]>`
        INSERT INTO analytics_events (
          id, name, created_at, user_id, idempotency_key, payload, test
        ) VALUES (
          ${record.id}, ${record.name}, ${record.createdAt}, ${record.userId ?? null},
          ${record.idempotencyKey}, ${record.payload ? sql.json(record.payload) : null},
          ${record.test === true}
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *
      `;
      if (inserted[0]) {
        return { status: "created" as const, record: fromRow(inserted[0]) };
      }
      const existing = await sql<EventRow[]>`
        SELECT * FROM analytics_events WHERE idempotency_key = ${record.idempotencyKey} LIMIT 1
      `;
      return { status: "duplicate" as const, record: fromRow(existing[0]!) };
    },

    async listEventsByUserId(userId) {
      const sql = getAnalyticsSql();
      if (!sql) throw new AnalyticsPersistenceError("analytics_postgres_unconfigured");
      await ensureAnalyticsSchema(sql);
      const rows = await sql<EventRow[]>`
        SELECT * FROM analytics_events WHERE user_id = ${userId} ORDER BY created_at ASC
      `;
      return rows.map(fromRow);
    },

    async listEvents() {
      const sql = getAnalyticsSql();
      if (!sql) throw new AnalyticsPersistenceError("analytics_postgres_unconfigured");
      await ensureAnalyticsSchema(sql);
      const rows = await sql<EventRow[]>`
        SELECT * FROM analytics_events ORDER BY created_at ASC
      `;
      return rows.map(fromRow);
    },

    async deleteTestEventsByKeys(keys) {
      const unique = [...new Set(keys.filter((key) => key.length > 0))];
      if (unique.length === 0) return 0;
      const sql = getAnalyticsSql();
      if (!sql) throw new AnalyticsPersistenceError("analytics_postgres_unconfigured");
      await ensureAnalyticsSchema(sql);
      const rows = await sql<{ id: string }[]>`
        DELETE FROM analytics_events
        WHERE test = true
          AND idempotency_key IN ${sql(unique)}
        RETURNING id
      `;
      return rows.length;
    },

    async unlinkUserId(userId) {
      const trimmed = userId.trim();
      if (!trimmed) return 0;
      const sql = getAnalyticsSql();
      if (!sql) throw new AnalyticsPersistenceError("analytics_postgres_unconfigured");
      await ensureAnalyticsSchema(sql);
      const rows = await sql<{ id: string }[]>`
        UPDATE analytics_events
        SET user_id = NULL
        WHERE user_id = ${trimmed}
        RETURNING id
      `;
      return rows.length;
    },
  };
}

function createUnconfiguredProductionStore(): AnalyticsStore {
  const error = () =>
    Promise.reject(new AnalyticsPersistenceError("analytics_postgres_unconfigured"));
  return {
    backend: "unconfigured_production",
    findByIdempotencyKey: error,
    appendEvent() {
      forceFail();
      return error();
    },
    listEventsByUserId: error,
    listEvents: error,
    deleteTestEventsByKeys: error,
    unlinkUserId: error,
  };
}

let analyticsStore: AnalyticsStore | undefined;

export function getAnalyticsDurability(): {
  backend: AnalyticsStoreBackend;
  productionSourceOfTruth: string;
  dataDirIsSourceOfTruth: boolean;
} {
  if (usesFileOverride()) {
    return {
      backend: "file_test_override",
      productionSourceOfTruth:
        "Isolated test file override (ANALYTICS_DB_FILE). Not production.",
      dataDirIsSourceOfTruth: false,
    };
  }
  if (analyticsPostgresConfigured()) {
    return {
      backend: "supabase_postgres",
      productionSourceOfTruth:
        "Supabase Postgres via POSTGRES_URL / POSTGRES_URL_NON_POOLING (existing production database)",
      dataDirIsSourceOfTruth: false,
    };
  }
  if (isHostedProduction()) {
    return {
      backend: "unconfigured_production",
      productionSourceOfTruth:
        "Postgres required in Vercel production; filesystem fallback is disabled",
      dataDirIsSourceOfTruth: false,
    };
  }
  return {
    backend: "file_local_development",
    productionSourceOfTruth:
      "Local development file fallback. Not the production system of record.",
    dataDirIsSourceOfTruth: false,
  };
}

export function getAnalyticsStore(): AnalyticsStore {
  if (!analyticsStore) {
    if (usesFileOverride()) {
      analyticsStore = createFileAnalyticsStore("file_test_override");
    } else if (analyticsPostgresConfigured()) {
      analyticsStore = createPostgresAnalyticsStore();
    } else if (isHostedProduction()) {
      analyticsStore = createUnconfiguredProductionStore();
    } else {
      analyticsStore = createFileAnalyticsStore("file_local_development");
    }
  }
  return analyticsStore;
}

export function resetAnalyticsStoreForTests(): void {
  analyticsStore = undefined;
}
