import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import {
  ensureLaunchDashboardSchema,
  getLaunchDashboardSql,
  isHostedProduction,
  LaunchDashboardPersistenceError,
  launchDashboardPostgresConfigured,
} from "@/lib/launch-dashboard/db";
import type { SupportDatabase, SupportTicket } from "@/lib/support/ticket-types";
import { slaStateFor } from "@/lib/support/classify";

const DEFAULT_DB_FILE = ".data/support/tickets.json";
const DEFAULT_DB_DIR = ".data/support";

function dbDir(): string {
  const override = process.env.SUPPORT_DB_FILE?.replace(/\\/g, "/");
  if (!override) return DEFAULT_DB_DIR;
  const index = override.lastIndexOf("/");
  return index === -1 ? DEFAULT_DB_DIR : override.slice(0, index);
}

function usesFileOverride(): boolean {
  return Boolean(process.env.SUPPORT_DB_FILE);
}

const emptyDatabase = (): SupportDatabase => ({
  tickets: [],
  lastUpdatedAt: new Date().toISOString(),
});

function refreshSla(ticket: SupportTicket, now = new Date()): SupportTicket {
  return {
    ...ticket,
    slaState: slaStateFor(ticket.priority, ticket.responseDueAt, now),
  };
}

function normalize(raw: SupportDatabase): SupportDatabase {
  return {
    tickets: Array.isArray(raw.tickets) ? raw.tickets.map((ticket) => refreshSla(ticket)) : [],
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

async function readDatabase(): Promise<SupportDatabase> {
  try {
    const override = process.env.SUPPORT_DB_FILE;
    const raw = override
      ? await readFile(/* turbopackIgnore: true */ override, "utf8")
      : await readFile(DEFAULT_DB_FILE, "utf8");
    return normalize(JSON.parse(raw) as SupportDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(database: SupportDatabase): Promise<void> {
  const override = process.env.SUPPORT_DB_FILE;
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

export type SupportStoreBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "file_local_development"
  | "unconfigured_production";

export type SupportStore = {
  backend: SupportStoreBackend;
  read(): Promise<SupportDatabase>;
  get(id: string): Promise<SupportTicket | undefined>;
  findByEmailMessageId(messageId: string): Promise<SupportTicket | undefined>;
  findByThreadKey(threadKey: string): Promise<SupportTicket | undefined>;
  upsert(ticket: SupportTicket): Promise<SupportTicket>;
  list(options?: { includeTest?: boolean }): Promise<SupportTicket[]>;
};

export function createFileSupportStore(
  backend: SupportStoreBackend = "file_local_development",
): SupportStore {
  return {
    backend,
    read() {
      return enqueueWrite(async () => readDatabase());
    },
    get(id) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.tickets.find((ticket) => ticket.id === id);
      });
    },
    findByEmailMessageId(messageId) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.tickets.find((ticket) =>
          ticket.emailMessageIds.includes(messageId),
        );
      });
    },
    findByThreadKey(threadKey) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.tickets.find((ticket) => ticket.emailThreadKey === threadKey);
      });
    },
    upsert(ticket) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const next = refreshSla(ticket);
        const index = database.tickets.findIndex((entry) => entry.id === next.id);
        if (index >= 0) database.tickets[index] = next;
        else database.tickets.push(next);
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return next;
      });
    },
    list(options) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        if (options?.includeTest) return database.tickets;
        return database.tickets.filter((ticket) => !ticket.test);
      });
    },
  };
}

type TicketRow = {
  id: string;
  created_at: Date | string;
  updated_at: Date | string;
  test: boolean;
  payload: SupportTicket;
};

export function createPostgresSupportStore(): SupportStore {
  return {
    backend: "supabase_postgres",
    async read() {
      const tickets = await this.list({ includeTest: true });
      return {
        tickets,
        lastUpdatedAt: new Date().toISOString(),
      };
    },
    async get(id) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("support_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const rows = await sql<TicketRow[]>`
        SELECT * FROM support_tickets WHERE id = ${id} LIMIT 1
      `;
      return rows[0] ? refreshSla(rows[0].payload) : undefined;
    },
    async findByEmailMessageId(messageId) {
      const tickets = await this.list({ includeTest: true });
      return tickets.find((ticket) => ticket.emailMessageIds.includes(messageId));
    },
    async findByThreadKey(threadKey) {
      const tickets = await this.list({ includeTest: true });
      return tickets.find((ticket) => ticket.emailThreadKey === threadKey);
    },
    async upsert(ticket) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("support_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const next = refreshSla(ticket);
      await sql`
        INSERT INTO support_tickets (id, created_at, updated_at, test, payload)
        VALUES (
          ${next.id}, ${next.createdAt}, ${next.updatedAt}, ${next.test === true},
          ${sql.json(next)}
        )
        ON CONFLICT (id) DO UPDATE SET
          updated_at = EXCLUDED.updated_at,
          test = EXCLUDED.test,
          payload = EXCLUDED.payload
      `;
      return next;
    },
    async list(options) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("support_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const rows = options?.includeTest
        ? await sql<TicketRow[]>`SELECT * FROM support_tickets ORDER BY created_at ASC`
        : await sql<TicketRow[]>`
            SELECT * FROM support_tickets WHERE test = FALSE ORDER BY created_at ASC
          `;
      return rows.map((row) => refreshSla(row.payload));
    },
  };
}

function createUnconfiguredProductionStore(): SupportStore {
  const error = () =>
    Promise.reject(new LaunchDashboardPersistenceError("support_postgres_unconfigured"));
  return {
    backend: "unconfigured_production",
    read: error,
    get: error,
    findByEmailMessageId: error,
    findByThreadKey: error,
    upsert: error,
    list: error,
  };
}

let store: SupportStore | undefined;

export function getSupportDurability(): {
  backend: SupportStoreBackend;
  productionSourceOfTruth: string;
  dataDirIsSourceOfTruth: boolean;
} {
  if (usesFileOverride()) {
    return {
      backend: "file_test_override",
      productionSourceOfTruth:
        "Isolated test file override (SUPPORT_DB_FILE). Not production.",
      dataDirIsSourceOfTruth: false,
    };
  }
  if (launchDashboardPostgresConfigured()) {
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

export function getSupportStore(): SupportStore {
  if (!store) {
    if (usesFileOverride()) {
      store = createFileSupportStore("file_test_override");
    } else if (launchDashboardPostgresConfigured()) {
      store = createPostgresSupportStore();
    } else if (isHostedProduction()) {
      store = createUnconfiguredProductionStore();
    } else {
      store = createFileSupportStore("file_local_development");
    }
  }
  return store;
}

export function resetSupportStoreForTests(): void {
  store = undefined;
}
