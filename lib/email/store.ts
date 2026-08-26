import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import {
  EmailPersistenceError,
  emailPostgresConfigured,
  ensureEmailSchema,
  getEmailSql,
  isHostedProduction,
} from "@/lib/email/db";
import type {
  EmailDatabase,
  EmailDeliveryEvent,
  EmailSuppressionReason,
  EmailSuppressionRecord,
} from "@/lib/email/types";

const DEFAULT_DB_FILE = ".data/email/database.json";
const DEFAULT_DB_DIR = ".data/email";

function dbDir(): string {
  const override = process.env.EMAIL_DB_FILE?.replace(/\\/g, "/");
  if (!override) return DEFAULT_DB_DIR;
  const index = override.lastIndexOf("/");
  return index === -1 ? DEFAULT_DB_DIR : override.slice(0, index);
}

function usesFileOverride(): boolean {
  return Boolean(process.env.EMAIL_DB_FILE);
}

const emptyDatabase = (): EmailDatabase => ({
  suppressions: [],
  events: [],
  lastUpdatedAt: new Date().toISOString(),
});

function normalize(raw: EmailDatabase): EmailDatabase {
  return {
    suppressions: Array.isArray(raw.suppressions) ? raw.suppressions : [],
    events: Array.isArray(raw.events) ? raw.events : [],
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

async function readDatabase(): Promise<EmailDatabase> {
  try {
    const override = process.env.EMAIL_DB_FILE;
    const raw = override
      ? await readFile(/* turbopackIgnore: true */ override, "utf8")
      : await readFile(DEFAULT_DB_FILE, "utf8");
    return normalize(JSON.parse(raw) as EmailDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(database: EmailDatabase): Promise<void> {
  const override = process.env.EMAIL_DB_FILE;
  const payload = JSON.stringify(database, null, 2);
  if (override) {
    await mkdir(/* turbopackIgnore: true */ dbDir(), { recursive: true });
    const tempFile = `${override}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(/* turbopackIgnore: true */ tempFile, payload, "utf8");
    await rename(/* turbopackIgnore: true */ tempFile, override);
    return;
  }
  await mkdir(DEFAULT_DB_DIR, { recursive: true });
  const tempFile = `${DEFAULT_DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, payload, "utf8");
  await rename(tempFile, DEFAULT_DB_FILE);
}

const REASON_RANK: Record<EmailSuppressionReason, number> = {
  complaint: 3,
  hard_bounce: 2,
  unsubscribe: 1,
};

function strongerReason(
  current: EmailSuppressionReason,
  next: EmailSuppressionReason,
): EmailSuppressionReason {
  return REASON_RANK[next] >= REASON_RANK[current] ? next : current;
}

export type EmailStoreBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "file_local_development"
  | "unconfigured_production";

export type EmailStore = {
  backend: EmailStoreBackend;
  getSuppression(email: string): Promise<EmailSuppressionRecord | undefined>;
  upsertSuppression(record: EmailSuppressionRecord): Promise<EmailSuppressionRecord>;
  listSuppressions(options?: {
    includeTest?: boolean;
  }): Promise<EmailSuppressionRecord[]>;
  recordEvent(event: EmailDeliveryEvent): Promise<EmailDeliveryEvent>;
  listEvents(options?: { includeTest?: boolean }): Promise<EmailDeliveryEvent[]>;
};

export function createFileEmailStore(
  backend: EmailStoreBackend = "file_local_development",
): EmailStore {
  return {
    backend,
    getSuppression(email) {
      const key = normalizeEmail(email);
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.suppressions.find((row) => row.email === key);
      });
    },
    upsertSuppression(record) {
      const next: EmailSuppressionRecord = {
        ...record,
        email: normalizeEmail(record.email),
      };
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const index = database.suppressions.findIndex(
          (row) => row.email === next.email,
        );
        if (index >= 0) {
          const existing = database.suppressions[index]!;
          database.suppressions[index] = {
            ...existing,
            ...next,
            reason: strongerReason(existing.reason, next.reason),
            createdAt: existing.createdAt,
            updatedAt: next.updatedAt,
          };
        } else {
          database.suppressions.push(next);
        }
        database.lastUpdatedAt = next.updatedAt;
        await writeDatabase(database);
        return database.suppressions.find((row) => row.email === next.email)!;
      });
    },
    listSuppressions(options) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        if (options?.includeTest) return database.suppressions;
        return database.suppressions.filter((row) => !row.test);
      });
    },
    recordEvent(event) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        database.events.push(event);
        database.lastUpdatedAt = event.createdAt;
        await writeDatabase(database);
        return event;
      });
    },
    listEvents(options) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        if (options?.includeTest) return database.events;
        return database.events.filter((row) => !row.test);
      });
    },
  };
}

type SuppressionRow = {
  email: string;
  reason: EmailSuppressionReason;
  source: string;
  detail: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  test: boolean;
};

type EventRow = {
  id: string;
  created_at: Date | string;
  type: EmailDeliveryEvent["type"];
  status: EmailDeliveryEvent["status"];
  category: EmailDeliveryEvent["category"];
  email: string;
  provider: "google_workspace_smtp";
  message_id: string | null;
  error: string | null;
  test: boolean;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function createPostgresEmailStore(): EmailStore {
  return {
    backend: "supabase_postgres",
    async getSuppression(email) {
      const sql = getEmailSql();
      if (!sql) throw new EmailPersistenceError("email_postgres_unconfigured");
      await ensureEmailSchema(sql);
      const key = normalizeEmail(email);
      const rows = await sql<SuppressionRow[]>`
        SELECT * FROM bh_email_suppressions WHERE email = ${key} LIMIT 1
      `;
      const row = rows[0];
      if (!row) return undefined;
      return {
        email: row.email,
        reason: row.reason,
        source: row.source,
        detail: row.detail ?? undefined,
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
        test: row.test,
      };
    },
    async upsertSuppression(record) {
      const sql = getEmailSql();
      if (!sql) throw new EmailPersistenceError("email_postgres_unconfigured");
      await ensureEmailSchema(sql);
      const next: EmailSuppressionRecord = {
        ...record,
        email: normalizeEmail(record.email),
      };
      const existing = await this.getSuppression(next.email);
      const merged: EmailSuppressionRecord = existing
        ? {
            ...existing,
            ...next,
            reason: strongerReason(existing.reason, next.reason),
            createdAt: existing.createdAt,
          }
        : next;
      await sql`
        INSERT INTO bh_email_suppressions (
          email, reason, source, detail, created_at, updated_at, test
        )
        VALUES (
          ${merged.email}, ${merged.reason}, ${merged.source},
          ${merged.detail ?? null}, ${merged.createdAt}, ${merged.updatedAt},
          ${merged.test === true}
        )
        ON CONFLICT (email) DO UPDATE SET
          reason = EXCLUDED.reason,
          source = EXCLUDED.source,
          detail = EXCLUDED.detail,
          updated_at = EXCLUDED.updated_at,
          test = EXCLUDED.test
      `;
      return merged;
    },
    async listSuppressions(options) {
      const sql = getEmailSql();
      if (!sql) throw new EmailPersistenceError("email_postgres_unconfigured");
      await ensureEmailSchema(sql);
      const rows = options?.includeTest
        ? await sql<SuppressionRow[]>`SELECT * FROM bh_email_suppressions`
        : await sql<SuppressionRow[]>`
            SELECT * FROM bh_email_suppressions WHERE test = FALSE
          `;
      return rows.map((row) => ({
        email: row.email,
        reason: row.reason,
        source: row.source,
        detail: row.detail ?? undefined,
        createdAt: iso(row.created_at),
        updatedAt: iso(row.updated_at),
        test: row.test,
      }));
    },
    async recordEvent(event) {
      const sql = getEmailSql();
      if (!sql) throw new EmailPersistenceError("email_postgres_unconfigured");
      await ensureEmailSchema(sql);
      await sql`
        INSERT INTO bh_email_events (
          id, created_at, type, status, category, email, provider,
          message_id, error, test
        )
        VALUES (
          ${event.id}, ${event.createdAt}, ${event.type}, ${event.status},
          ${event.category}, ${event.email}, ${event.provider},
          ${event.messageId ?? null}, ${event.error ?? null},
          ${event.test === true}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      return event;
    },
    async listEvents(options) {
      const sql = getEmailSql();
      if (!sql) throw new EmailPersistenceError("email_postgres_unconfigured");
      await ensureEmailSchema(sql);
      const rows = options?.includeTest
        ? await sql<EventRow[]>`
            SELECT * FROM bh_email_events ORDER BY created_at ASC
          `
        : await sql<EventRow[]>`
            SELECT * FROM bh_email_events WHERE test = FALSE ORDER BY created_at ASC
          `;
      return rows.map((row) => ({
        id: row.id,
        createdAt: iso(row.created_at),
        type: row.type,
        status: row.status,
        category: row.category,
        email: row.email,
        provider: row.provider,
        messageId: row.message_id ?? undefined,
        error: row.error ?? undefined,
        test: row.test,
      }));
    },
  };
}

function createUnconfiguredProductionStore(): EmailStore {
  const error = () =>
    Promise.reject(new EmailPersistenceError("email_postgres_unconfigured"));
  return {
    backend: "unconfigured_production",
    getSuppression: error,
    upsertSuppression: error,
    listSuppressions: error,
    recordEvent: error,
    listEvents: error,
  };
}

let store: EmailStore | undefined;

export function getEmailDurability(): {
  backend: EmailStoreBackend;
  productionSourceOfTruth: string;
} {
  if (usesFileOverride()) {
    return {
      backend: "file_test_override",
      productionSourceOfTruth:
        "Isolated test file override (EMAIL_DB_FILE). Not production.",
    };
  }
  if (emailPostgresConfigured()) {
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
    productionSourceOfTruth:
      "Local development file fallback. Not the production system of record.",
  };
}

export function getEmailStore(): EmailStore {
  if (!store) {
    if (usesFileOverride()) {
      store = createFileEmailStore("file_test_override");
    } else if (emailPostgresConfigured()) {
      store = createPostgresEmailStore();
    } else if (isHostedProduction()) {
      store = createUnconfiguredProductionStore();
    } else {
      store = createFileEmailStore("file_local_development");
    }
  }
  return store;
}

export function resetEmailStoreForTests(): void {
  store = undefined;
  writeQueue = Promise.resolve();
}
