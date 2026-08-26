import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import {
  EmailCompliancePersistenceError,
  emailCompliancePostgresConfigured,
  ensureEmailComplianceSchema,
  getEmailComplianceSql,
  isHostedProduction,
} from "@/lib/email/db";
import type {
  ConsentSource,
  EmailComplianceDatabase,
  EmailConsentRecord,
  EmailSuppressionRecord,
  SuppressionReason,
} from "@/lib/email/types";

const DEFAULT_DB_FILE = ".data/email-compliance/database.json";
const DEFAULT_DB_DIR = ".data/email-compliance";

function dbDir(): string {
  const override = process.env.EMAIL_COMPLIANCE_DB_FILE?.replace(/\\/g, "/");
  if (!override) return DEFAULT_DB_DIR;
  const index = override.lastIndexOf("/");
  return index === -1 ? DEFAULT_DB_DIR : override.slice(0, index);
}

function usesFileOverride(): boolean {
  return Boolean(process.env.EMAIL_COMPLIANCE_DB_FILE);
}

const emptyDatabase = (): EmailComplianceDatabase => ({
  suppression: [],
  consents: [],
  lastUpdatedAt: new Date().toISOString(),
});

function normalizeDatabase(raw: EmailComplianceDatabase): EmailComplianceDatabase {
  return {
    suppression: Array.isArray(raw.suppression) ? raw.suppression : [],
    consents: Array.isArray(raw.consents) ? raw.consents : [],
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

async function readDatabase(): Promise<EmailComplianceDatabase> {
  try {
    const override = process.env.EMAIL_COMPLIANCE_DB_FILE;
    const raw = override
      ? await readFile(/* turbopackIgnore: true */ override, "utf8")
      : await readFile(DEFAULT_DB_FILE, "utf8");
    return normalizeDatabase(JSON.parse(raw) as EmailComplianceDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(database: EmailComplianceDatabase): Promise<void> {
  const override = process.env.EMAIL_COMPLIANCE_DB_FILE;
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

export type EmailComplianceStoreBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "file_local_development"
  | "unconfigured_production";

export type EmailComplianceStore = {
  backend: EmailComplianceStoreBackend;
  getSuppression(email: string): Promise<EmailSuppressionRecord | undefined>;
  listSuppression(options?: { includeTest?: boolean }): Promise<EmailSuppressionRecord[]>;
  suppress(record: Omit<EmailSuppressionRecord, "email"> & { email: string }): Promise<EmailSuppressionRecord>;
  getActiveConsent(email: string): Promise<EmailConsentRecord | undefined>;
  listConsents(email: string): Promise<EmailConsentRecord[]>;
  recordConsent(record: Omit<EmailConsentRecord, "id"> & { id?: string }): Promise<EmailConsentRecord>;
  revokeConsent(email: string, at?: string): Promise<void>;
};

function createFileStore(
  backend: EmailComplianceStoreBackend = "file_local_development",
): EmailComplianceStore {
  return {
    backend,
    getSuppression(email) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const normalized = normalizeEmail(email);
        return database.suppression.find((row) => row.email === normalized);
      });
    },
    listSuppression(options) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return options?.includeTest
          ? database.suppression
          : database.suppression.filter((row) => row.test !== true);
      });
    },
    suppress(record) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const next: EmailSuppressionRecord = {
          ...record,
          email: normalizeEmail(record.email),
        };
        const existing = database.suppression.findIndex((row) => row.email === next.email);
        if (existing >= 0) {
          database.suppression[existing] = next;
        } else {
          database.suppression.push(next);
        }
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return next;
      });
    },
    getActiveConsent(email) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const normalized = normalizeEmail(email);
        return database.consents.find(
          (row) => row.email === normalized && !row.revokedAt,
        );
      });
    },
    listConsents(email) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const normalized = normalizeEmail(email);
        return database.consents.filter((row) => row.email === normalized);
      });
    },
    recordConsent(record) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const next: EmailConsentRecord = {
          ...record,
          id: record.id ?? randomUUID(),
          email: normalizeEmail(record.email),
        };
        database.consents.push(next);
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return next;
      });
    },
    revokeConsent(email, at) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const normalized = normalizeEmail(email);
        const revokedAt = at ?? new Date().toISOString();
        for (const row of database.consents) {
          if (row.email === normalized && !row.revokedAt) {
            row.revokedAt = revokedAt;
          }
        }
        database.lastUpdatedAt = revokedAt;
        await writeDatabase(database);
      });
    },
  };
}

type SuppressionRow = {
  email: string;
  reason: SuppressionReason;
  source: string;
  suppressed_at: Date | string;
  detail: string | null;
  test: boolean;
};

type ConsentRow = {
  id: string;
  email: string;
  source: ConsentSource;
  source_detail: string;
  captured_at: Date | string;
  revoked_at: Date | string | null;
  method: EmailConsentRecord["method"];
  test: boolean;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function createPostgresStore(): EmailComplianceStore {
  return {
    backend: "supabase_postgres",
    async getSuppression(email) {
      const sql = getEmailComplianceSql();
      if (!sql) {
        throw new EmailCompliancePersistenceError("email_postgres_unconfigured");
      }
      await ensureEmailComplianceSchema(sql);
      const rows = await sql<SuppressionRow[]>`
        SELECT * FROM bh_email_suppression WHERE email = ${normalizeEmail(email)} LIMIT 1
      `;
      const row = rows[0];
      if (!row) return undefined;
      return {
        email: row.email,
        reason: row.reason,
        source: row.source,
        suppressedAt: iso(row.suppressed_at),
        detail: row.detail ?? undefined,
        test: row.test,
      };
    },
    async listSuppression(options) {
      const sql = getEmailComplianceSql();
      if (!sql) {
        throw new EmailCompliancePersistenceError("email_postgres_unconfigured");
      }
      await ensureEmailComplianceSchema(sql);
      const rows = options?.includeTest
        ? await sql<SuppressionRow[]>`SELECT * FROM bh_email_suppression ORDER BY suppressed_at ASC`
        : await sql<SuppressionRow[]>`
            SELECT * FROM bh_email_suppression WHERE test = FALSE ORDER BY suppressed_at ASC
          `;
      return rows.map((row) => ({
        email: row.email,
        reason: row.reason,
        source: row.source,
        suppressedAt: iso(row.suppressed_at),
        detail: row.detail ?? undefined,
        test: row.test,
      }));
    },
    async suppress(record) {
      const sql = getEmailComplianceSql();
      if (!sql) {
        throw new EmailCompliancePersistenceError("email_postgres_unconfigured");
      }
      await ensureEmailComplianceSchema(sql);
      const next: EmailSuppressionRecord = {
        ...record,
        email: normalizeEmail(record.email),
      };
      await sql`
        INSERT INTO bh_email_suppression (email, reason, source, suppressed_at, detail, test)
        VALUES (
          ${next.email},
          ${next.reason},
          ${next.source},
          ${next.suppressedAt},
          ${next.detail ?? null},
          ${next.test === true}
        )
        ON CONFLICT (email) DO UPDATE SET
          reason = EXCLUDED.reason,
          source = EXCLUDED.source,
          suppressed_at = EXCLUDED.suppressed_at,
          detail = EXCLUDED.detail,
          test = EXCLUDED.test
      `;
      return next;
    },
    async getActiveConsent(email) {
      const sql = getEmailComplianceSql();
      if (!sql) {
        throw new EmailCompliancePersistenceError("email_postgres_unconfigured");
      }
      await ensureEmailComplianceSchema(sql);
      const rows = await sql<ConsentRow[]>`
        SELECT * FROM bh_email_consent
        WHERE email = ${normalizeEmail(email)} AND revoked_at IS NULL
        ORDER BY captured_at DESC
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return undefined;
      return {
        id: row.id,
        email: row.email,
        source: row.source,
        sourceDetail: row.source_detail,
        capturedAt: iso(row.captured_at),
        revokedAt: row.revoked_at ? iso(row.revoked_at) : undefined,
        method: row.method,
        test: row.test,
      };
    },
    async listConsents(email) {
      const sql = getEmailComplianceSql();
      if (!sql) {
        throw new EmailCompliancePersistenceError("email_postgres_unconfigured");
      }
      await ensureEmailComplianceSchema(sql);
      const rows = await sql<ConsentRow[]>`
        SELECT * FROM bh_email_consent
        WHERE email = ${normalizeEmail(email)}
        ORDER BY captured_at ASC
      `;
      return rows.map((row) => ({
        id: row.id,
        email: row.email,
        source: row.source,
        sourceDetail: row.source_detail,
        capturedAt: iso(row.captured_at),
        revokedAt: row.revoked_at ? iso(row.revoked_at) : undefined,
        method: row.method,
        test: row.test,
      }));
    },
    async recordConsent(record) {
      const sql = getEmailComplianceSql();
      if (!sql) {
        throw new EmailCompliancePersistenceError("email_postgres_unconfigured");
      }
      await ensureEmailComplianceSchema(sql);
      const next: EmailConsentRecord = {
        ...record,
        id: record.id ?? randomUUID(),
        email: normalizeEmail(record.email),
      };
      await sql`
        INSERT INTO bh_email_consent (
          id, email, source, source_detail, captured_at, revoked_at, method, test
        ) VALUES (
          ${next.id},
          ${next.email},
          ${next.source},
          ${next.sourceDetail},
          ${next.capturedAt},
          ${next.revokedAt ?? null},
          ${next.method},
          ${next.test === true}
        )
      `;
      return next;
    },
    async revokeConsent(email, at) {
      const sql = getEmailComplianceSql();
      if (!sql) {
        throw new EmailCompliancePersistenceError("email_postgres_unconfigured");
      }
      await ensureEmailComplianceSchema(sql);
      const revokedAt = at ?? new Date().toISOString();
      await sql`
        UPDATE bh_email_consent
        SET revoked_at = ${revokedAt}
        WHERE email = ${normalizeEmail(email)} AND revoked_at IS NULL
      `;
    },
  };
}

function createUnconfiguredProductionStore(): EmailComplianceStore {
  const error = () =>
    Promise.reject(new EmailCompliancePersistenceError("email_postgres_unconfigured"));
  return {
    backend: "unconfigured_production",
    getSuppression: error,
    listSuppression: error,
    suppress: error,
    getActiveConsent: error,
    listConsents: error,
    recordConsent: error,
    revokeConsent: error,
  };
}

let store: EmailComplianceStore | undefined;

export function getEmailComplianceDurability(): {
  backend: EmailComplianceStoreBackend;
  productionSourceOfTruth: string;
} {
  if (usesFileOverride()) {
    return {
      backend: "file_test_override",
      productionSourceOfTruth: "Isolated test file override (EMAIL_COMPLIANCE_DB_FILE). Not production.",
    };
  }
  if (emailCompliancePostgresConfigured()) {
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

export function getEmailComplianceStore(): EmailComplianceStore {
  if (!store) {
    if (usesFileOverride()) {
      store = createFileStore("file_test_override");
    } else if (emailCompliancePostgresConfigured()) {
      store = createPostgresStore();
    } else if (isHostedProduction()) {
      store = createUnconfiguredProductionStore();
    } else {
      store = createFileStore("file_local_development");
    }
  }
  return store;
}

export function resetEmailComplianceStoreForTests(): void {
  store = undefined;
}
