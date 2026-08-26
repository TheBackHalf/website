import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { JSONValue } from "postgres";
import {
  ensureLifecycleSchema,
  getLifecycleSql,
  isHostedProduction,
  LifecyclePersistenceError,
  lifecyclePostgresConfigured,
} from "@/lib/lifecycle/db";
import { sanitizeLifecyclePayload } from "@/lib/lifecycle/privacy";
import type {
  LifecycleAutomationId,
  LifecycleDatabase,
  LifecycleDispatchRecord,
  LifecycleFamily,
} from "@/lib/lifecycle/types";

const DEFAULT_DB_FILE = ".data/lifecycle/database.json";
const DEFAULT_DB_DIR = ".data/lifecycle";

function dbDir(): string {
  const override = process.env.LIFECYCLE_DB_FILE?.replace(/\\/g, "/");
  if (!override) return DEFAULT_DB_DIR;
  const index = override.lastIndexOf("/");
  return index === -1 ? DEFAULT_DB_DIR : override.slice(0, index);
}

function usesFileOverride(): boolean {
  return Boolean(process.env.LIFECYCLE_DB_FILE);
}

const emptyDatabase = (): LifecycleDatabase => ({
  dispatches: [],
});

function normalizeDatabase(raw: LifecycleDatabase): LifecycleDatabase {
  return {
    dispatches: Array.isArray(raw.dispatches) ? raw.dispatches : [],
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

async function readDatabase(): Promise<LifecycleDatabase> {
  try {
    const override = process.env.LIFECYCLE_DB_FILE;
    const raw = override
      ? await readFile(/* turbopackIgnore: true */ override, "utf8")
      : await readFile(DEFAULT_DB_FILE, "utf8");
    return normalizeDatabase(JSON.parse(raw) as LifecycleDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(database: LifecycleDatabase): Promise<void> {
  const override = process.env.LIFECYCLE_DB_FILE;
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

export type LifecycleStoreBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "file_local_development"
  | "unconfigured_production";

export type LifecycleStore = {
  backend: LifecycleStoreBackend;
  findByIdempotencyKey(key: string): Promise<LifecycleDispatchRecord | undefined>;
  recordDispatch(
    record: Omit<LifecycleDispatchRecord, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ): Promise<{ status: "created" | "duplicate"; record: LifecycleDispatchRecord }>;
  listByUserId(userId: string): Promise<LifecycleDispatchRecord[]>;
  listDispatches(): Promise<LifecycleDispatchRecord[]>;
  deleteTestDispatchesByKeys(keys: string[]): Promise<number>;
};

function toRecord(
  input: Omit<LifecycleDispatchRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): LifecycleDispatchRecord {
  return {
    id: input.id ?? crypto.randomUUID(),
    automationId: input.automationId,
    family: input.family,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
    status: input.status,
    channel: input.channel,
    locale: input.locale === "es" ? "es" : "en",
    createdAt: input.createdAt ?? new Date().toISOString(),
    detail: input.detail,
    payload: sanitizeLifecyclePayload(input.payload),
    test: input.test === true,
  };
}

export function createFileLifecycleStore(
  backend: Extract<
    LifecycleStoreBackend,
    "file_test_override" | "file_local_development"
  > = "file_local_development",
): LifecycleStore {
  return {
    backend,
    findByIdempotencyKey(key) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.dispatches.find((entry) => entry.idempotencyKey === key);
      });
    },
    recordDispatch(input) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const existing = database.dispatches.find(
          (entry) => entry.idempotencyKey === input.idempotencyKey,
        );
        if (existing) {
          return { status: "duplicate" as const, record: existing };
        }
        const record = toRecord(input);
        database.dispatches.push(record);
        await writeDatabase(database);
        return { status: "created" as const, record };
      });
    },
    listByUserId(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.dispatches.filter((entry) => entry.userId === userId);
      });
    },
    listDispatches() {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.dispatches;
      });
    },
    deleteTestDispatchesByKeys(keys) {
      return enqueueWrite(async () => {
        const unique = new Set(keys.filter((key) => key.length > 0));
        if (unique.size === 0) return 0;
        const database = await readDatabase();
        const before = database.dispatches.length;
        database.dispatches = database.dispatches.filter(
          (entry) => !(entry.test === true && unique.has(entry.idempotencyKey)),
        );
        if (database.dispatches.length !== before) {
          await writeDatabase(database);
        }
        return before - database.dispatches.length;
      });
    },
  };
}

type DispatchRow = {
  id: string;
  automation_id: LifecycleAutomationId;
  family: LifecycleFamily;
  user_id: string | null;
  idempotency_key: string;
  status: LifecycleDispatchRecord["status"];
  channel: LifecycleDispatchRecord["channel"];
  locale: "en" | "es";
  created_at: Date | string;
  detail: string | null;
  payload: Record<string, unknown> | null;
  test: boolean;
};

function fromRow(row: DispatchRow): LifecycleDispatchRecord {
  return {
    id: row.id,
    automationId: row.automation_id,
    family: row.family,
    userId: row.user_id ?? undefined,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    channel: row.channel,
    locale: row.locale === "es" ? "es" : "en",
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at.toISOString(),
    detail: row.detail ?? undefined,
    payload: row.payload ?? undefined,
    test: row.test,
  };
}

export function createPostgresLifecycleStore(): LifecycleStore {
  return {
    backend: "supabase_postgres",
    async findByIdempotencyKey(key) {
      const sql = getLifecycleSql();
      if (!sql) throw new LifecyclePersistenceError("lifecycle_postgres_unconfigured");
      await ensureLifecycleSchema(sql);
      const rows = await sql<DispatchRow[]>`
        SELECT * FROM lifecycle_dispatches WHERE idempotency_key = ${key} LIMIT 1
      `;
      return rows[0] ? fromRow(rows[0]) : undefined;
    },
    async recordDispatch(input) {
      const sql = getLifecycleSql();
      if (!sql) throw new LifecyclePersistenceError("lifecycle_postgres_unconfigured");
      await ensureLifecycleSchema(sql);
      const record = toRecord(input);
      const inserted = await sql<DispatchRow[]>`
        INSERT INTO lifecycle_dispatches (
          id, automation_id, family, user_id, idempotency_key, status, channel,
          locale, created_at, detail, payload, test
        ) VALUES (
          ${record.id}, ${record.automationId}, ${record.family},
          ${record.userId ?? null}, ${record.idempotencyKey}, ${record.status},
          ${record.channel}, ${record.locale}, ${record.createdAt},
          ${record.detail ?? null},
          ${record.payload ? sql.json(record.payload as JSONValue) : null},
          ${record.test === true}
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *
      `;
      if (inserted[0]) {
        return { status: "created" as const, record: fromRow(inserted[0]) };
      }
      const existing = await sql<DispatchRow[]>`
        SELECT * FROM lifecycle_dispatches
        WHERE idempotency_key = ${record.idempotencyKey}
        LIMIT 1
      `;
      return { status: "duplicate" as const, record: fromRow(existing[0]!) };
    },
    async listByUserId(userId) {
      const sql = getLifecycleSql();
      if (!sql) throw new LifecyclePersistenceError("lifecycle_postgres_unconfigured");
      await ensureLifecycleSchema(sql);
      const rows = await sql<DispatchRow[]>`
        SELECT * FROM lifecycle_dispatches WHERE user_id = ${userId} ORDER BY created_at ASC
      `;
      return rows.map(fromRow);
    },
    async listDispatches() {
      const sql = getLifecycleSql();
      if (!sql) throw new LifecyclePersistenceError("lifecycle_postgres_unconfigured");
      await ensureLifecycleSchema(sql);
      const rows = await sql<DispatchRow[]>`
        SELECT * FROM lifecycle_dispatches ORDER BY created_at ASC
      `;
      return rows.map(fromRow);
    },
    async deleteTestDispatchesByKeys(keys) {
      const unique = [...new Set(keys.filter((key) => key.length > 0))];
      if (unique.length === 0) return 0;
      const sql = getLifecycleSql();
      if (!sql) throw new LifecyclePersistenceError("lifecycle_postgres_unconfigured");
      await ensureLifecycleSchema(sql);
      const rows = await sql<{ id: string }[]>`
        DELETE FROM lifecycle_dispatches
        WHERE test = true
          AND idempotency_key IN ${sql(unique)}
        RETURNING id
      `;
      return rows.length;
    },
  };
}

function createUnconfiguredProductionStore(): LifecycleStore {
  const error = () =>
    Promise.reject(new LifecyclePersistenceError("lifecycle_postgres_unconfigured"));
  return {
    backend: "unconfigured_production",
    findByIdempotencyKey: error,
    recordDispatch: error,
    listByUserId: error,
    listDispatches: error,
    deleteTestDispatchesByKeys: error,
  };
}

let store: LifecycleStore | undefined;

export function getLifecycleDurability(): {
  backend: LifecycleStoreBackend;
  productionSourceOfTruth: string;
} {
  if (usesFileOverride()) {
    return {
      backend: "file_test_override",
      productionSourceOfTruth: "Isolated test file override (LIFECYCLE_DB_FILE). Not production.",
    };
  }
  if (lifecyclePostgresConfigured()) {
    return {
      backend: "supabase_postgres",
      productionSourceOfTruth:
        "Supabase Postgres via POSTGRES_URL / POSTGRES_URL_NON_POOLING (existing production database)",
    };
  }
  if (isHostedProduction()) {
    return {
      backend: "unconfigured_production",
      productionSourceOfTruth:
        "Postgres required in Vercel production; filesystem fallback is disabled",
    };
  }
  return {
    backend: "file_local_development",
    productionSourceOfTruth: "Local development file fallback. Not the production system of record.",
  };
}

export function getLifecycleStore(): LifecycleStore {
  if (!store) {
    if (usesFileOverride()) {
      store = createFileLifecycleStore("file_test_override");
    } else if (lifecyclePostgresConfigured()) {
      store = createPostgresLifecycleStore();
    } else if (isHostedProduction()) {
      store = createUnconfiguredProductionStore();
    } else {
      store = createFileLifecycleStore("file_local_development");
    }
  }
  return store;
}

export function resetLifecycleStoreForTests(): void {
  store = undefined;
}
