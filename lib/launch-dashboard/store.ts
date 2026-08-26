import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import {
  ensureLaunchDashboardSchema,
  getLaunchDashboardSql,
  isHostedProduction,
  LaunchDashboardPersistenceError,
  launchDashboardPostgresConfigured,
} from "@/lib/launch-dashboard/db";
import type {
  AvailabilityRecord,
  DailyLaunchSnapshot,
  LaunchDashboardDatabase,
  LaunchRiskRecord,
  SupportOpsRecord,
} from "@/lib/launch-dashboard/types";
import type { LaunchOpsErrorRecord } from "@/lib/launch-ops-errors/types";
import {
  fingerprintOpsError,
  sanitizeOpsErrorInput,
} from "@/lib/launch-ops-errors/types";

const DEFAULT_DB_FILE = ".data/launch-dashboard/database.json";
const DEFAULT_DB_DIR = ".data/launch-dashboard";

function dbDir(): string {
  const override = process.env.LAUNCH_DASHBOARD_DB_FILE?.replace(/\\/g, "/");
  if (!override) return DEFAULT_DB_DIR;
  const index = override.lastIndexOf("/");
  return index === -1 ? DEFAULT_DB_DIR : override.slice(0, index);
}

function usesFileOverride(): boolean {
  return Boolean(process.env.LAUNCH_DASHBOARD_DB_FILE);
}

const emptyDatabase = (): LaunchDashboardDatabase => ({
  risks: [],
  support: [],
  availability: [],
  snapshots: [],
  opsErrors: [],
  lastUpdatedAt: new Date().toISOString(),
});

function normalize(raw: LaunchDashboardDatabase): LaunchDashboardDatabase {
  return {
    risks: Array.isArray(raw.risks) ? raw.risks : [],
    support: Array.isArray(raw.support) ? raw.support : [],
    availability: Array.isArray(raw.availability) ? raw.availability : [],
    snapshots: Array.isArray(raw.snapshots) ? raw.snapshots : [],
    opsErrors: Array.isArray(raw.opsErrors) ? raw.opsErrors : [],
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

async function readDatabase(): Promise<LaunchDashboardDatabase> {
  try {
    const override = process.env.LAUNCH_DASHBOARD_DB_FILE;
    const raw = override
      ? await readFile(/* turbopackIgnore: true */ override, "utf8")
      : await readFile(DEFAULT_DB_FILE, "utf8");
    return normalize(JSON.parse(raw) as LaunchDashboardDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(database: LaunchDashboardDatabase): Promise<void> {
  const override = process.env.LAUNCH_DASHBOARD_DB_FILE;
  if (override) {
    await mkdir(/* turbopackIgnore: true */ dbDir(), { recursive: true });
    const tempFile = `${override}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(/* turbopackIgnore: true */ tempFile, JSON.stringify(database, null, 2), "utf8");
    await rename(/* turbopackIgnore: true */ tempFile, /* turbopackIgnore: true */ override);
    return;
  }
  await mkdir(DEFAULT_DB_DIR, { recursive: true });
  const tempFile = `${DEFAULT_DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
  await rename(tempFile, DEFAULT_DB_FILE);
}

function applyOpsError(
  database: LaunchDashboardDatabase,
  input: Parameters<LaunchDashboardStore["upsertOpsError"]>[0],
): LaunchOpsErrorRecord {
  const sanitized = sanitizeOpsErrorInput(input);
  const fingerprint = fingerprintOpsError(sanitized);
  const now = input.lastSeen ?? new Date().toISOString();
  const existing = database.opsErrors.find((row) => row.fingerprint === fingerprint);
  if (existing) {
    existing.lastSeen = now;
    existing.occurrenceCount += 1;
    existing.status = "open";
    if (input.severity) existing.severity = input.severity;
    return existing;
  }
  const record: LaunchOpsErrorRecord = {
    id: input.id ?? crypto.randomUUID(),
    fingerprint,
    firstSeen: input.firstSeen ?? now,
    lastSeen: now,
    occurrenceCount: 1,
    productArea: sanitized.productArea,
    errorCategory: sanitized.errorCategory,
    severity:
      input.severity ??
      (sanitized.productArea === "registration" ||
      sanitized.productArea === "checkout" ||
      sanitized.productArea === "payment" ||
      sanitized.productArea === "auth"
        ? "CRITICAL"
        : "HIGH"),
    route: sanitized.route,
    service: sanitized.service,
    safeCode: sanitized.safeCode,
    status: "open",
    test: input.test === true,
  };
  database.opsErrors.push(record);
  return record;
}

export type LaunchDashboardStoreBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "file_local_development"
  | "unconfigured_production";

export type LaunchDashboardStore = {
  backend: LaunchDashboardStoreBackend;
  read(): Promise<LaunchDashboardDatabase>;
  upsertRisk(record: LaunchRiskRecord): Promise<LaunchRiskRecord>;
  deleteRisk(id: string): Promise<boolean>;
  upsertSupport(record: SupportOpsRecord): Promise<SupportOpsRecord>;
  upsertAvailability(record: AvailabilityRecord): Promise<AvailabilityRecord>;
  saveSnapshot(snapshot: DailyLaunchSnapshot): Promise<{
    status: "created" | "updated" | "frozen_unchanged";
    record: DailyLaunchSnapshot;
  }>;
  getSnapshot(dateEtValue: string): Promise<DailyLaunchSnapshot | undefined>;
  upsertOpsError(input: {
    id?: string;
    productArea?: string;
    errorCategory?: string;
    route?: string;
    service?: string;
    safeCode?: string;
    message?: string;
    severity?: LaunchOpsErrorRecord["severity"];
    test?: boolean;
    firstSeen?: string;
    lastSeen?: string;
  }): Promise<LaunchOpsErrorRecord>;
  listOpsErrors(options?: { includeTest?: boolean }): Promise<LaunchOpsErrorRecord[]>;
};

function freezeSnapshot(
  existing: DailyLaunchSnapshot | undefined,
  snapshot: DailyLaunchSnapshot,
  today: string,
): {
  status: "created" | "updated" | "frozen_unchanged";
  record: DailyLaunchSnapshot;
} {
  if (existing?.frozen && snapshot.dateEt < today) {
    return { status: "frozen_unchanged", record: existing };
  }
  const record: DailyLaunchSnapshot = {
    ...snapshot,
    frozen: snapshot.dateEt < today,
    capturedAt: new Date().toISOString(),
  };
  return {
    status: existing ? "updated" : "created",
    record,
  };
}

export function createFileLaunchDashboardStore(
  backend: LaunchDashboardStoreBackend = "file_local_development",
): LaunchDashboardStore {
  return {
    backend,
    read() {
      return enqueueWrite(async () => readDatabase());
    },

    upsertRisk(record) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const index = database.risks.findIndex((entry) => entry.id === record.id);
        if (index >= 0) database.risks[index] = record;
        else database.risks.push(record);
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return record;
      });
    },

    deleteRisk(id) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const next = database.risks.filter((entry) => entry.id !== id);
        if (next.length === database.risks.length) return false;
        database.risks = next;
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return true;
      });
    },

    upsertSupport(record) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const index = database.support.findIndex((entry) => entry.id === record.id);
        if (index >= 0) database.support[index] = record;
        else database.support.push(record);
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return record;
      });
    },

    upsertAvailability(record) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const index = database.availability.findIndex(
          (entry) => entry.area === record.area,
        );
        const next = { ...record, source: record.source ?? "manual" };
        if (index >= 0) database.availability[index] = next;
        else database.availability.push(next);
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return next;
      });
    },

    saveSnapshot(snapshot) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const today = dateEt();
        const index = database.snapshots.findIndex(
          (entry) => entry.dateEt === snapshot.dateEt,
        );
        const existing = index >= 0 ? database.snapshots[index] : undefined;
        const result = freezeSnapshot(existing, snapshot, today);
        if (result.status === "frozen_unchanged") return result;
        if (index >= 0) database.snapshots[index] = result.record;
        else database.snapshots.push(result.record);
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return result;
      });
    },

    getSnapshot(dateEtValue) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.snapshots.find((entry) => entry.dateEt === dateEtValue);
      });
    },

    upsertOpsError(input) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        const record = applyOpsError(database, input);
        database.lastUpdatedAt = new Date().toISOString();
        await writeDatabase(database);
        return record;
      });
    },

    listOpsErrors(options) {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        if (options?.includeTest) return database.opsErrors;
        return database.opsErrors.filter((row) => !row.test);
      });
    },
  };
}

type RiskRow = {
  id: string;
  date_identified_et: string;
  description: string;
  category: LaunchRiskRecord["category"];
  severity: LaunchRiskRecord["severity"];
  owner: string;
  status: LaunchRiskRecord["status"];
  mitigation: string;
  founder_escalation_required: boolean;
  resolution_date_et: string | null;
  test: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type AvailabilityRow = {
  area: AvailabilityRecord["area"];
  status: AvailabilityRecord["status"];
  note: string | null;
  updated_at: Date | string;
  updated_by: string;
  source: "automated" | "manual";
};

type SnapshotRow = {
  date_et: string;
  frozen: boolean;
  captured_at: Date | string;
  model: DailyLaunchSnapshot["model"];
};

type ErrorRow = {
  id: string;
  fingerprint: string;
  first_seen: Date | string;
  last_seen: Date | string;
  occurrence_count: number;
  product_area: string;
  error_category: string;
  severity: LaunchOpsErrorRecord["severity"];
  route: string | null;
  service: string | null;
  safe_code: string | null;
  status: LaunchOpsErrorRecord["status"];
  test: boolean;
};

type JsonRow = { id: string; payload: SupportOpsRecord };

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function riskFromRow(row: RiskRow): LaunchRiskRecord {
  return {
    id: row.id,
    dateIdentifiedEt: row.date_identified_et,
    description: row.description,
    category: row.category,
    severity: row.severity,
    owner: row.owner,
    status: row.status,
    mitigation: row.mitigation,
    founderEscalationRequired: row.founder_escalation_required,
    resolutionDateEt: row.resolution_date_et ?? undefined,
    test: row.test,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function availabilityFromRow(row: AvailabilityRow): AvailabilityRecord {
  return {
    area: row.area,
    status: row.status,
    note: row.note ?? undefined,
    updatedAt: iso(row.updated_at),
    updatedBy: row.updated_by,
    source: row.source,
  };
}

function snapshotFromRow(row: SnapshotRow): DailyLaunchSnapshot {
  return {
    dateEt: row.date_et,
    frozen: row.frozen,
    capturedAt: iso(row.captured_at),
    model: row.model,
  };
}

function errorFromRow(row: ErrorRow): LaunchOpsErrorRecord {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    firstSeen: iso(row.first_seen),
    lastSeen: iso(row.last_seen),
    occurrenceCount: Number(row.occurrence_count) || 1,
    productArea: row.product_area,
    errorCategory: row.error_category,
    severity: row.severity,
    route: row.route ?? undefined,
    service: row.service ?? undefined,
    safeCode: row.safe_code ?? undefined,
    status: row.status,
    test: row.test,
  };
}

export function createPostgresLaunchDashboardStore(): LaunchDashboardStore {
  return {
    backend: "supabase_postgres",
    async read() {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const [risks, support, availability, snapshots, opsErrors, meta] = await Promise.all([
        sql<RiskRow[]>`SELECT * FROM launch_dashboard_risks ORDER BY created_at ASC`,
        sql<JsonRow[]>`SELECT id, payload FROM launch_dashboard_support`,
        sql<AvailabilityRow[]>`SELECT * FROM launch_dashboard_availability`,
        sql<SnapshotRow[]>`SELECT * FROM launch_dashboard_snapshots ORDER BY date_et ASC`,
        sql<ErrorRow[]>`SELECT * FROM launch_ops_errors ORDER BY last_seen DESC`,
        sql<{ value: { lastUpdatedAt?: string } }[]>`
          SELECT value FROM launch_dashboard_meta WHERE key = 'lastUpdatedAt'
        `,
      ]);
      return {
        risks: risks.map(riskFromRow),
        support: support.map((row) => row.payload),
        availability: availability.map(availabilityFromRow),
        snapshots: snapshots.map(snapshotFromRow),
        opsErrors: opsErrors.map(errorFromRow),
        lastUpdatedAt: meta[0]?.value?.lastUpdatedAt ?? new Date().toISOString(),
      };
    },

    async upsertRisk(record) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      await sql`
        INSERT INTO launch_dashboard_risks (
          id, date_identified_et, description, category, severity, owner, status,
          mitigation, founder_escalation_required, resolution_date_et, test,
          created_at, updated_at
        ) VALUES (
          ${record.id}, ${record.dateIdentifiedEt}, ${record.description},
          ${record.category}, ${record.severity}, ${record.owner}, ${record.status},
          ${record.mitigation}, ${record.founderEscalationRequired},
          ${record.resolutionDateEt ?? null}, ${record.test === true},
          ${record.createdAt}, ${record.updatedAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          date_identified_et = EXCLUDED.date_identified_et,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          severity = EXCLUDED.severity,
          owner = EXCLUDED.owner,
          status = EXCLUDED.status,
          mitigation = EXCLUDED.mitigation,
          founder_escalation_required = EXCLUDED.founder_escalation_required,
          resolution_date_et = EXCLUDED.resolution_date_et,
          test = EXCLUDED.test,
          updated_at = EXCLUDED.updated_at
      `;
      await touchMeta(sql);
      return record;
    },

    async deleteRisk(id) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const deleted = await sql<{ id: string }[]>`
        DELETE FROM launch_dashboard_risks WHERE id = ${id} RETURNING id
      `;
      if (deleted[0]) await touchMeta(sql);
      return Boolean(deleted[0]);
    },

    async upsertSupport(record) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      await sql`
        INSERT INTO launch_dashboard_support (id, payload)
        VALUES (${record.id}, ${sql.json(record)})
        ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload
      `;
      await touchMeta(sql);
      return record;
    },

    async upsertAvailability(record) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const next = { ...record, source: record.source ?? ("manual" as const) };
      await sql`
        INSERT INTO launch_dashboard_availability (
          area, status, note, updated_at, updated_by, source
        ) VALUES (
          ${next.area}, ${next.status}, ${next.note ?? null}, ${next.updatedAt},
          ${next.updatedBy}, ${next.source}
        )
        ON CONFLICT (area) DO UPDATE SET
          status = EXCLUDED.status,
          note = EXCLUDED.note,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by,
          source = EXCLUDED.source
      `;
      await touchMeta(sql);
      return next;
    },

    async saveSnapshot(snapshot) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const today = dateEt();
      const existingRows = await sql<SnapshotRow[]>`
        SELECT * FROM launch_dashboard_snapshots WHERE date_et = ${snapshot.dateEt} LIMIT 1
      `;
      const existing = existingRows[0] ? snapshotFromRow(existingRows[0]) : undefined;
      const result = freezeSnapshot(existing, snapshot, today);
      if (result.status === "frozen_unchanged") return result;
      await sql`
        INSERT INTO launch_dashboard_snapshots (date_et, frozen, captured_at, model)
        VALUES (
          ${result.record.dateEt}, ${result.record.frozen}, ${result.record.capturedAt},
          ${sql.json(result.record.model)}
        )
        ON CONFLICT (date_et) DO UPDATE SET
          frozen = EXCLUDED.frozen,
          captured_at = EXCLUDED.captured_at,
          model = EXCLUDED.model
      `;
      await touchMeta(sql);
      return result;
    },

    async getSnapshot(dateEtValue) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const rows = await sql<SnapshotRow[]>`
        SELECT * FROM launch_dashboard_snapshots WHERE date_et = ${dateEtValue} LIMIT 1
      `;
      return rows[0] ? snapshotFromRow(rows[0]) : undefined;
    },

    async upsertOpsError(input) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const sanitized = sanitizeOpsErrorInput(input);
      const fingerprint = fingerprintOpsError(sanitized);
      const now = input.lastSeen ?? new Date().toISOString();
      const severity =
        input.severity ??
        (sanitized.productArea === "registration" ||
        sanitized.productArea === "checkout" ||
        sanitized.productArea === "payment" ||
        sanitized.productArea === "auth"
          ? "CRITICAL"
          : "HIGH");
      const existing = await sql<ErrorRow[]>`
        SELECT * FROM launch_ops_errors WHERE fingerprint = ${fingerprint} LIMIT 1
      `;
      if (existing[0]) {
        const updated = await sql<ErrorRow[]>`
          UPDATE launch_ops_errors
          SET last_seen = ${now},
              occurrence_count = launch_ops_errors.occurrence_count + 1,
              status = 'open'
          WHERE fingerprint = ${fingerprint}
          RETURNING *
        `;
        await touchMeta(sql);
        return errorFromRow(updated[0]!);
      }
      const inserted = await sql<ErrorRow[]>`
        INSERT INTO launch_ops_errors (
          id, fingerprint, first_seen, last_seen, occurrence_count,
          product_area, error_category, severity, route, service, safe_code, status, test
        ) VALUES (
          ${input.id ?? crypto.randomUUID()}, ${fingerprint}, ${input.firstSeen ?? now},
          ${now}, 1, ${sanitized.productArea}, ${sanitized.errorCategory}, ${severity},
          ${sanitized.route ?? null}, ${sanitized.service ?? null},
          ${sanitized.safeCode ?? null}, 'open', ${input.test === true}
        )
        RETURNING *
      `;
      await touchMeta(sql);
      return errorFromRow(inserted[0]!);
    },

    async listOpsErrors(options) {
      const sql = getLaunchDashboardSql();
      if (!sql) throw new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured");
      await ensureLaunchDashboardSchema(sql);
      const rows = options?.includeTest
        ? await sql<ErrorRow[]>`SELECT * FROM launch_ops_errors ORDER BY last_seen DESC`
        : await sql<ErrorRow[]>`SELECT * FROM launch_ops_errors WHERE test = FALSE ORDER BY last_seen DESC`;
      return rows.map(errorFromRow);
    },
  };
}

async function touchMeta(sql: NonNullable<ReturnType<typeof getLaunchDashboardSql>>): Promise<void> {
  await sql`
    INSERT INTO launch_dashboard_meta (key, value, updated_at)
    VALUES ('lastUpdatedAt', ${sql.json({ lastUpdatedAt: new Date().toISOString() })}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

function createUnconfiguredProductionStore(): LaunchDashboardStore {
  const error = () =>
    Promise.reject(
      new LaunchDashboardPersistenceError("launch_dashboard_postgres_unconfigured"),
    );
  return {
    backend: "unconfigured_production",
    read: error,
    upsertRisk: error,
    deleteRisk: error,
    upsertSupport: error,
    upsertAvailability: error,
    saveSnapshot: error,
    getSnapshot: error,
    upsertOpsError: error,
    listOpsErrors: error,
  };
}

let store: LaunchDashboardStore | undefined;

export function getLaunchDashboardDurability(): {
  backend: LaunchDashboardStoreBackend;
  productionSourceOfTruth: string;
  dataDirIsSourceOfTruth: boolean;
} {
  if (usesFileOverride()) {
    return {
      backend: "file_test_override",
      productionSourceOfTruth:
        "Isolated test file override (LAUNCH_DASHBOARD_DB_FILE). Not production.",
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

export function getLaunchDashboardStore(): LaunchDashboardStore {
  if (!store) {
    if (usesFileOverride()) {
      store = createFileLaunchDashboardStore("file_test_override");
    } else if (launchDashboardPostgresConfigured()) {
      store = createPostgresLaunchDashboardStore();
    } else if (isHostedProduction()) {
      store = createUnconfiguredProductionStore();
    } else {
      store = createFileLaunchDashboardStore("file_local_development");
    }
  }
  return store;
}

export function resetLaunchDashboardStoreForTests(): void {
  store = undefined;
}
