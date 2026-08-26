import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import {
  ensureLaunchDashboardSchema,
  getLaunchDashboardSql,
  isHostedProduction,
  LaunchDashboardPersistenceError,
  launchDashboardPostgresConfigured,
} from "@/lib/launch-dashboard/db";
import { privacySlaStateFor } from "@/lib/privacy/catalog";
import type { PrivacyDatabase, PrivacyRequest } from "@/lib/privacy/types";

const DEFAULT_DB_FILE = ".data/privacy/requests.json";
const DEFAULT_DB_DIR = ".data/privacy";

function dbDir(): string {
  const override = process.env.PRIVACY_DB_FILE?.replace(/\\/g, "/");
  if (!override) return DEFAULT_DB_DIR;
  const index = override.lastIndexOf("/");
  return index === -1 ? DEFAULT_DB_DIR : override.slice(0, index);
}

function usesFileOverride(): boolean {
  return Boolean(process.env.PRIVACY_DB_FILE);
}

const emptyDatabase = (): PrivacyDatabase => ({
  requests: [],
  lastUpdatedAt: new Date().toISOString(),
});

function refreshSla(request: PrivacyRequest, now = new Date()): PrivacyRequest {
  return {
    ...request,
    slaState: privacySlaStateFor(request.status, request.fulfillmentDueAt, now),
  };
}

function normalize(raw: PrivacyDatabase): PrivacyDatabase {
  return {
    requests: Array.isArray(raw.requests) ? raw.requests.map((entry) => refreshSla(entry)) : [],
    lastUpdatedAt: raw.lastUpdatedAt ?? new Date().toISOString(),
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

async function readDatabase(): Promise<PrivacyDatabase> {
  try {
    const override = process.env.PRIVACY_DB_FILE;
    const raw = override
      ? await readFile(/* turbopackIgnore: true */ override, "utf8")
      : await readFile(DEFAULT_DB_FILE, "utf8");
    return normalize(JSON.parse(raw) as PrivacyDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(database: PrivacyDatabase): Promise<void> {
  const override = process.env.PRIVACY_DB_FILE;
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

export type PrivacyStoreBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "file_local_development"
  | "unconfigured_production";

export type PrivacyStore = {
  backend: PrivacyStoreBackend;
  get(id: string): Promise<PrivacyRequest | undefined>;
  upsert(request: PrivacyRequest): Promise<PrivacyRequest>;
  list(options?: { includeTest?: boolean; email?: string }): Promise<PrivacyRequest[]>;
};

export function createFilePrivacyStore(
  backend: PrivacyStoreBackend = "file_local_development",
): PrivacyStore {
  return {
    backend,
    get(id) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.requests.find((entry) => entry.id === id);
      });
    },
    upsert(request) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const next = refreshSla(request);
        const index = database.requests.findIndex((entry) => entry.id === next.id);
        if (index >= 0) database.requests[index] = next;
        else database.requests.push(next);
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return next;
      });
    },
    list(options) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        let requests = database.requests;
        if (!options?.includeTest) {
          requests = requests.filter((entry) => !entry.test);
        }
        if (options?.email) {
          const email = options.email.trim().toLowerCase();
          requests = requests.filter((entry) => entry.requesterEmail === email);
        }
        return requests;
      });
    },
  };
}

type RequestRow = {
  id: string;
  created_at: Date | string;
  updated_at: Date | string;
  test: boolean;
  requester_email: string;
  payload: PrivacyRequest;
};

const PRIVACY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS privacy_rights_requests (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  test BOOLEAN NOT NULL DEFAULT FALSE,
  requester_email TEXT NOT NULL,
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS privacy_rights_requests_email_idx
  ON privacy_rights_requests (requester_email);
`;

export function createPostgresPrivacyStore(): PrivacyStore {
  return {
    backend: "supabase_postgres",
    async get(id) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("privacy_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      await sql.unsafe(PRIVACY_TABLE_SQL);
      const rows = await sql<RequestRow[]>`
        SELECT * FROM privacy_rights_requests WHERE id = ${id} LIMIT 1
      `;
      return rows[0] ? refreshSla(rows[0].payload) : undefined;
    },
    async upsert(request) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("privacy_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      await sql.unsafe(PRIVACY_TABLE_SQL);
      const next = refreshSla(request);
      await sql`
        INSERT INTO privacy_rights_requests (id, created_at, updated_at, test, requester_email, payload)
        VALUES (
          ${next.id}, ${next.createdAt}, ${next.updatedAt}, ${next.test === true},
          ${next.requesterEmail}, ${sql.json(next)}
        )
        ON CONFLICT (id) DO UPDATE SET
          updated_at = EXCLUDED.updated_at,
          test = EXCLUDED.test,
          requester_email = EXCLUDED.requester_email,
          payload = EXCLUDED.payload
      `;
      return next;
    },
    async list(options) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("privacy_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      await sql.unsafe(PRIVACY_TABLE_SQL);
      const rows = options?.email
        ? await sql<RequestRow[]>`
            SELECT * FROM privacy_rights_requests
            WHERE requester_email = ${options.email.trim().toLowerCase()}
            ORDER BY created_at ASC
          `
        : options?.includeTest
          ? await sql<RequestRow[]>`SELECT * FROM privacy_rights_requests ORDER BY created_at ASC`
          : await sql<RequestRow[]>`
              SELECT * FROM privacy_rights_requests WHERE test = FALSE ORDER BY created_at ASC
            `;
      const requests = rows.map((row) => refreshSla(row.payload));
      if (!options?.includeTest) {
        return requests.filter((entry) => !entry.test);
      }
      return requests;
    },
  };
}

function createUnconfiguredProductionStore(): PrivacyStore {
  const error = () =>
    Promise.reject(new LaunchDashboardPersistenceError("privacy_postgres_unconfigured"));
  return {
    backend: "unconfigured_production",
    get: error,
    upsert: error,
    list: error,
  };
}

let store: PrivacyStore | undefined;

export function getPrivacyStore(): PrivacyStore {
  if (!store) {
    if (usesFileOverride()) {
      store = createFilePrivacyStore("file_test_override");
    } else if (launchDashboardPostgresConfigured()) {
      store = createPostgresPrivacyStore();
    } else if (isHostedProduction()) {
      store = createUnconfiguredProductionStore();
    } else {
      store = createFilePrivacyStore("file_local_development");
    }
  }
  return store;
}

export function resetPrivacyStoreForTests(): void {
  store = undefined;
}
