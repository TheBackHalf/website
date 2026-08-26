import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { unknownAttribution } from "@/lib/marketing-kpi/attribution";
import {
  ensureMarketingKpiSchema,
  getMarketingKpiSql,
  isHostedMarketingKpiRuntime,
  marketingKpiPostgresConfigured,
} from "@/lib/marketing-kpi/db";
import { classifyRecord } from "@/lib/marketing-kpi/period";
import type {
  KpiDurabilityBackend,
  MarketingEventRecord,
  MarketingKpiDatabase,
  MarketingPurchaseRecord,
  SocialDailyRecord,
} from "@/lib/marketing-kpi/types";

const DEFAULT_DB_FILE = ".data/marketing-kpi/database.json";
const DEFAULT_DB_DIR = ".data/marketing-kpi";

function dbDir(): string {
  const override = process.env.MARKETING_KPI_DB_FILE?.replace(/\\/g, "/");
  if (!override) return DEFAULT_DB_DIR;
  const index = override.lastIndexOf("/");
  return index === -1 ? DEFAULT_DB_DIR : override.slice(0, index);
}

function usesFileOverride(): boolean {
  return Boolean(process.env.MARKETING_KPI_DB_FILE);
}

const emptyDatabase = (): MarketingKpiDatabase => ({
  events: [],
  socialDaily: [],
  purchases: [],
  lastUpdatedAt: new Date().toISOString(),
});

function normalizeEvent(
  raw: Partial<MarketingEventRecord> & {
    name: MarketingEventRecord["name"];
    createdAt: string;
    dateEt: string;
    attribution: MarketingEventRecord["attribution"];
    idempotencyKey: string;
  },
): MarketingEventRecord {
  const classified = classifyRecord({
    createdAt: raw.createdAt,
    test: raw.test,
    stripeCheckoutSessionId: raw.stripeCheckoutSessionId,
    stripePaymentIntentId: raw.stripePaymentIntentId,
  });
  return {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name,
    createdAt: raw.createdAt,
    dateEt: raw.dateEt,
    attribution: raw.attribution,
    path: raw.path,
    idempotencyKey: raw.idempotencyKey,
    stripeCheckoutSessionId: raw.stripeCheckoutSessionId,
    stripePaymentIntentId: raw.stripePaymentIntentId,
    stripeEventId: raw.stripeEventId,
    amountCents: raw.amountCents,
    currency: raw.currency,
    test: raw.test,
    period: raw.period ?? classified.period,
    classification: raw.classification ?? classified.classification,
  };
}

function normalizePurchase(
  raw: Partial<MarketingPurchaseRecord> & {
    paidAt: string;
    dateEt: string;
    status: MarketingPurchaseRecord["status"];
  },
): MarketingPurchaseRecord {
  const classified = classifyRecord({
    createdAt: raw.paidAt,
    test: raw.test,
    stripeCheckoutSessionId: raw.stripeCheckoutSessionId,
    stripePaymentIntentId: raw.stripePaymentIntentId,
  });
  return {
    id: raw.id ?? crypto.randomUUID(),
    billingPurchaseId: raw.billingPurchaseId,
    stripeCheckoutSessionId: raw.stripeCheckoutSessionId,
    stripePaymentIntentId: raw.stripePaymentIntentId,
    stripeChargeId: raw.stripeChargeId,
    stripeEventId: raw.stripeEventId,
    amountCents: raw.amountCents,
    currency: raw.currency,
    paidAt: raw.paidAt,
    dateEt: raw.dateEt,
    attribution: raw.attribution ?? unknownAttribution(),
    test: raw.test === true,
    livemode: raw.livemode,
    period: raw.period ?? classified.period,
    classification: raw.classification ?? classified.classification,
    status: raw.status,
  };
}

function normalizeDatabase(raw: Partial<MarketingKpiDatabase>): MarketingKpiDatabase {
  return {
    events: Array.isArray(raw.events)
      ? raw.events.map((entry) => normalizeEvent(entry))
      : [],
    socialDaily: Array.isArray(raw.socialDaily) ? raw.socialDaily : [],
    purchases: Array.isArray(raw.purchases)
      ? raw.purchases.map((entry) => normalizePurchase(entry))
      : [],
    lastUpdatedAt: raw.lastUpdatedAt ?? new Date().toISOString(),
  };
}

export type MarketingKpiStore = {
  backend: KpiDurabilityBackend;
  read(): Promise<MarketingKpiDatabase>;
  appendEvent(
    record: Omit<MarketingEventRecord, "id" | "createdAt" | "period" | "classification"> & {
      id?: string;
      createdAt?: string;
      period?: MarketingEventRecord["period"];
      classification?: MarketingEventRecord["classification"];
    },
  ): Promise<{ status: "created" | "duplicate"; record: MarketingEventRecord }>;
  upsertSocialDaily(
    record: Omit<SocialDailyRecord, "id" | "enteredAt"> & {
      id?: string;
      enteredAt?: string;
    },
  ): Promise<{ status: "created" | "updated"; record: SocialDailyRecord }>;
  upsertPurchase(
    record: Omit<MarketingPurchaseRecord, "id" | "period" | "classification"> & {
      id?: string;
      period?: MarketingPurchaseRecord["period"];
      classification?: MarketingPurchaseRecord["classification"];
    },
  ): Promise<{ status: "created" | "updated" | "duplicate"; record: MarketingPurchaseRecord }>;
};

function matchPurchase(
  existing: MarketingPurchaseRecord,
  input: Partial<MarketingPurchaseRecord>,
): boolean {
  if (input.id && existing.id === input.id) return true;
  if (
    input.stripeCheckoutSessionId &&
    existing.stripeCheckoutSessionId === input.stripeCheckoutSessionId
  ) {
    return true;
  }
  if (
    input.stripePaymentIntentId &&
    existing.stripePaymentIntentId === input.stripePaymentIntentId
  ) {
    return true;
  }
  if (
    input.billingPurchaseId &&
    existing.billingPurchaseId === input.billingPurchaseId
  ) {
    return true;
  }
  return false;
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

async function readFileDatabase(): Promise<MarketingKpiDatabase> {
  try {
    const override = process.env.MARKETING_KPI_DB_FILE;
    const raw = override
      ? await readFile(/* turbopackIgnore: true */ override, "utf8")
      : await readFile(DEFAULT_DB_FILE, "utf8");
    const parsed = parseJsonObject<MarketingKpiDatabase>(raw);
    const database = normalizeDatabase(parsed.value);
    if (parsed.recovered) {
      await writeFileDatabase(database);
    }
    return database;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

function parseJsonObject<T>(raw: string): { value: T; recovered: boolean } {
  try {
    return { value: JSON.parse(raw) as T, recovered: false };
  } catch {
    const slice = firstCompleteJsonObject(raw);
    if (!slice) {
      throw new SyntaxError("marketing_kpi_json_unrecoverable");
    }
    return { value: JSON.parse(slice) as T, recovered: true };
  }
}

function firstCompleteJsonObject(raw: string): string | undefined {
  const start = raw.indexOf("{");
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return undefined;
}

async function writeFileDatabase(database: MarketingKpiDatabase): Promise<void> {
  const override = process.env.MARKETING_KPI_DB_FILE;
  database.lastUpdatedAt = new Date().toISOString();
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

export function createFileMarketingKpiStore(): MarketingKpiStore {
  return {
    backend: "file_test_override",
    read() {
      return enqueueWrite(async () => readFileDatabase());
    },

    appendEvent(input) {
      return enqueueWrite(async () => {
        const database = await readFileDatabase();
        const existing = database.events.find(
          (entry) => entry.idempotencyKey === input.idempotencyKey,
        );
        if (existing) {
          return { status: "duplicate" as const, record: existing };
        }
        const createdAt = input.createdAt ?? new Date().toISOString();
        const record = normalizeEvent({
          ...input,
          createdAt,
        });
        database.events.push(record);
        await writeFileDatabase(database);
        return { status: "created" as const, record };
      });
    },

    upsertSocialDaily(input) {
      return enqueueWrite(async () => {
        const database = await readFileDatabase();
        const existingIndex = database.socialDaily.findIndex(
          (entry) =>
            entry.dateEt === input.dateEt && entry.channel === input.channel,
        );
        const record: SocialDailyRecord = {
          id:
            input.id ??
            (existingIndex >= 0
              ? database.socialDaily[existingIndex]!.id
              : crypto.randomUUID()),
          dateEt: input.dateEt,
          channel: input.channel,
          reach: input.reach,
          impressions: input.impressions,
          engagements: input.engagements,
          followers: input.followers,
          followerGrowth: input.followerGrowth,
          linkClicks: input.linkClicks,
          enteredBy: input.enteredBy,
          enteredAt: input.enteredAt ?? new Date().toISOString(),
          sourceSystem: input.sourceSystem,
          verifiedBy: input.verifiedBy,
          notes: input.notes,
        };
        if (existingIndex >= 0) {
          database.socialDaily[existingIndex] = record;
          await writeFileDatabase(database);
          return { status: "updated" as const, record };
        }
        database.socialDaily.push(record);
        await writeFileDatabase(database);
        return { status: "created" as const, record };
      });
    },

    upsertPurchase(input) {
      return enqueueWrite(async () => {
        const database = await readFileDatabase();
        const existingIndex = database.purchases.findIndex((entry) =>
          matchPurchase(entry, input),
        );
        const paidAt = input.paidAt;
        const record = normalizePurchase({
          ...input,
          id:
            input.id ??
            (existingIndex >= 0
              ? database.purchases[existingIndex]!.id
              : crypto.randomUUID()),
          paidAt,
        });
        if (existingIndex >= 0) {
          const previous = database.purchases[existingIndex]!;
          const merged = normalizePurchase({
            ...previous,
            ...record,
            id: previous.id,
          });
          database.purchases[existingIndex] = merged;
          await writeFileDatabase(database);
          return { status: "updated" as const, record: merged };
        }
        database.purchases.push(record);
        await writeFileDatabase(database);
        return { status: "created" as const, record };
      });
    },
  };
}

type EventRow = {
  id: string;
  name: MarketingEventRecord["name"];
  created_at: Date | string;
  date_et: string;
  attribution: MarketingEventRecord["attribution"];
  path: string | null;
  idempotency_key: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_event_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  test: boolean;
  period: MarketingEventRecord["period"];
  classification: MarketingEventRecord["classification"];
};

type SocialRow = {
  id: string;
  date_et: string;
  channel: SocialDailyRecord["channel"];
  reach: number | null;
  impressions: number | null;
  engagements: number | null;
  followers: number | null;
  follower_growth: number | null;
  link_clicks: number | null;
  entered_by: string;
  entered_at: Date | string;
  source_system: SocialDailyRecord["sourceSystem"];
  verified_by: string | null;
  notes: string | null;
};

type PurchaseRow = {
  id: string;
  billing_purchase_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_event_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  paid_at: Date | string;
  date_et: string;
  attribution: MarketingPurchaseRecord["attribution"];
  test: boolean;
  livemode: boolean | null;
  period: MarketingPurchaseRecord["period"];
  classification: MarketingPurchaseRecord["classification"];
  status: MarketingPurchaseRecord["status"];
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function eventFromRow(row: EventRow): MarketingEventRecord {
  return normalizeEvent({
    id: row.id,
    name: row.name,
    createdAt: iso(row.created_at),
    dateEt: row.date_et,
    attribution: row.attribution,
    path: row.path ?? undefined,
    idempotencyKey: row.idempotency_key,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    stripeEventId: row.stripe_event_id ?? undefined,
    amountCents: row.amount_cents ?? undefined,
    currency: row.currency ?? undefined,
    test: row.test,
    period: row.period,
    classification: row.classification,
  });
}

function socialFromRow(row: SocialRow): SocialDailyRecord {
  return {
    id: row.id,
    dateEt: row.date_et,
    channel: row.channel,
    reach: row.reach,
    impressions: row.impressions,
    engagements: row.engagements,
    followers: row.followers,
    followerGrowth: row.follower_growth,
    linkClicks: row.link_clicks,
    enteredBy: row.entered_by,
    enteredAt: iso(row.entered_at),
    sourceSystem: row.source_system,
    verifiedBy: row.verified_by ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function purchaseFromRow(row: PurchaseRow): MarketingPurchaseRecord {
  return normalizePurchase({
    id: row.id,
    billingPurchaseId: row.billing_purchase_id ?? undefined,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    stripeChargeId: row.stripe_charge_id ?? undefined,
    stripeEventId: row.stripe_event_id ?? undefined,
    amountCents: row.amount_cents ?? undefined,
    currency: row.currency ?? undefined,
    paidAt: iso(row.paid_at),
    dateEt: row.date_et,
    attribution: row.attribution,
    test: row.test,
    livemode: row.livemode ?? undefined,
    period: row.period,
    classification: row.classification,
    status: row.status,
  });
}

export function createPostgresMarketingKpiStore(): MarketingKpiStore {
  return {
    backend: "supabase_postgres",
    async read() {
      const sql = getMarketingKpiSql();
      if (!sql) throw new Error("marketing_kpi_postgres_unconfigured");
      await ensureMarketingKpiSchema(sql);
      const [events, socialDaily, purchases, meta] = await Promise.all([
        sql<EventRow[]>`SELECT * FROM marketing_kpi_events ORDER BY created_at ASC`,
        sql<SocialRow[]>`SELECT * FROM marketing_kpi_social_daily ORDER BY date_et ASC, channel ASC`,
        sql<PurchaseRow[]>`SELECT * FROM marketing_kpi_purchases ORDER BY paid_at ASC`,
        sql<{ value: { lastUpdatedAt?: string } }[]>`
          SELECT value FROM marketing_kpi_meta WHERE key = 'lastUpdatedAt'
        `,
      ]);
      return {
        events: events.map(eventFromRow),
        socialDaily: socialDaily.map(socialFromRow),
        purchases: purchases.map(purchaseFromRow),
        lastUpdatedAt:
          meta[0]?.value?.lastUpdatedAt ?? new Date().toISOString(),
      };
    },

    async appendEvent(input) {
      const sql = getMarketingKpiSql();
      if (!sql) throw new Error("marketing_kpi_postgres_unconfigured");
      await ensureMarketingKpiSchema(sql);
      const createdAt = input.createdAt ?? new Date().toISOString();
      const record = normalizeEvent({ ...input, createdAt });
      const inserted = await sql<EventRow[]>`
        INSERT INTO marketing_kpi_events (
          id, name, created_at, date_et, attribution, path, idempotency_key,
          stripe_checkout_session_id, stripe_payment_intent_id, stripe_event_id,
          amount_cents, currency, test, period, classification
        ) VALUES (
          ${record.id}, ${record.name}, ${record.createdAt}, ${record.dateEt},
          ${sql.json(record.attribution)}, ${record.path ?? null}, ${record.idempotencyKey},
          ${record.stripeCheckoutSessionId ?? null}, ${record.stripePaymentIntentId ?? null},
          ${record.stripeEventId ?? null}, ${record.amountCents ?? null},
          ${record.currency ?? null}, ${record.test === true}, ${record.period},
          ${record.classification}
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *
      `;
      await sql`
        INSERT INTO marketing_kpi_meta (key, value, updated_at)
        VALUES ('lastUpdatedAt', ${sql.json({ lastUpdatedAt: new Date().toISOString() })}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
      if (inserted[0]) {
        return { status: "created" as const, record: eventFromRow(inserted[0]) };
      }
      const existing = await sql<EventRow[]>`
        SELECT * FROM marketing_kpi_events WHERE idempotency_key = ${record.idempotencyKey}
      `;
      return { status: "duplicate" as const, record: eventFromRow(existing[0]!) };
    },

    async upsertSocialDaily(input) {
      const sql = getMarketingKpiSql();
      if (!sql) throw new Error("marketing_kpi_postgres_unconfigured");
      await ensureMarketingKpiSchema(sql);
      const existing = await sql<SocialRow[]>`
        SELECT * FROM marketing_kpi_social_daily
        WHERE date_et = ${input.dateEt} AND channel = ${input.channel}
      `;
      const record: SocialDailyRecord = {
        id: input.id ?? existing[0]?.id ?? crypto.randomUUID(),
        dateEt: input.dateEt,
        channel: input.channel,
        reach: input.reach,
        impressions: input.impressions,
        engagements: input.engagements,
        followers: input.followers,
        followerGrowth: input.followerGrowth,
        linkClicks: input.linkClicks,
        enteredBy: input.enteredBy,
        enteredAt: input.enteredAt ?? new Date().toISOString(),
        sourceSystem: input.sourceSystem,
        verifiedBy: input.verifiedBy,
        notes: input.notes,
      };
      await sql`
        INSERT INTO marketing_kpi_social_daily (
          id, date_et, channel, reach, impressions, engagements, followers,
          follower_growth, link_clicks, entered_by, entered_at, source_system,
          verified_by, notes
        ) VALUES (
          ${record.id}, ${record.dateEt}, ${record.channel}, ${record.reach},
          ${record.impressions}, ${record.engagements}, ${record.followers},
          ${record.followerGrowth}, ${record.linkClicks}, ${record.enteredBy},
          ${record.enteredAt}, ${record.sourceSystem}, ${record.verifiedBy ?? null},
          ${record.notes ?? null}
        )
        ON CONFLICT (date_et, channel) DO UPDATE SET
          reach = EXCLUDED.reach,
          impressions = EXCLUDED.impressions,
          engagements = EXCLUDED.engagements,
          followers = EXCLUDED.followers,
          follower_growth = EXCLUDED.follower_growth,
          link_clicks = EXCLUDED.link_clicks,
          entered_by = EXCLUDED.entered_by,
          entered_at = EXCLUDED.entered_at,
          source_system = EXCLUDED.source_system,
          verified_by = EXCLUDED.verified_by,
          notes = EXCLUDED.notes
      `;
      return {
        status: existing[0] ? ("updated" as const) : ("created" as const),
        record,
      };
    },

    async upsertPurchase(input) {
      const sql = getMarketingKpiSql();
      if (!sql) throw new Error("marketing_kpi_postgres_unconfigured");
      await ensureMarketingKpiSchema(sql);
      const record = normalizePurchase({
        ...input,
        id: input.id ?? crypto.randomUUID(),
      });
      const existing = await sql<PurchaseRow[]>`
        SELECT * FROM marketing_kpi_purchases
        WHERE id = ${record.id}
           OR (
             ${record.stripeCheckoutSessionId ?? null}::text IS NOT NULL
             AND stripe_checkout_session_id = ${record.stripeCheckoutSessionId ?? null}
           )
           OR (
             ${record.stripePaymentIntentId ?? null}::text IS NOT NULL
             AND stripe_payment_intent_id = ${record.stripePaymentIntentId ?? null}
           )
           OR (
             ${record.billingPurchaseId ?? null}::text IS NOT NULL
             AND billing_purchase_id = ${record.billingPurchaseId ?? null}
           )
        LIMIT 1
      `;
      const id = existing[0]?.id ?? record.id;
      const merged = normalizePurchase({
        ...(existing[0] ? purchaseFromRow(existing[0]) : record),
        ...record,
        id,
      });
      await sql`
        INSERT INTO marketing_kpi_purchases (
          id, billing_purchase_id, stripe_checkout_session_id, stripe_payment_intent_id,
          stripe_charge_id, stripe_event_id, amount_cents, currency, paid_at, date_et,
          attribution, test, livemode, period, classification, status
        ) VALUES (
          ${merged.id}, ${merged.billingPurchaseId ?? null},
          ${merged.stripeCheckoutSessionId ?? null}, ${merged.stripePaymentIntentId ?? null},
          ${merged.stripeChargeId ?? null}, ${merged.stripeEventId ?? null},
          ${merged.amountCents ?? null}, ${merged.currency ?? null}, ${merged.paidAt},
          ${merged.dateEt}, ${sql.json(merged.attribution)}, ${merged.test},
          ${merged.livemode ?? null}, ${merged.period}, ${merged.classification},
          ${merged.status}
        )
        ON CONFLICT (id) DO UPDATE SET
          billing_purchase_id = COALESCE(EXCLUDED.billing_purchase_id, marketing_kpi_purchases.billing_purchase_id),
          stripe_checkout_session_id = COALESCE(EXCLUDED.stripe_checkout_session_id, marketing_kpi_purchases.stripe_checkout_session_id),
          stripe_payment_intent_id = COALESCE(EXCLUDED.stripe_payment_intent_id, marketing_kpi_purchases.stripe_payment_intent_id),
          stripe_charge_id = COALESCE(EXCLUDED.stripe_charge_id, marketing_kpi_purchases.stripe_charge_id),
          stripe_event_id = COALESCE(EXCLUDED.stripe_event_id, marketing_kpi_purchases.stripe_event_id),
          amount_cents = COALESCE(EXCLUDED.amount_cents, marketing_kpi_purchases.amount_cents),
          currency = COALESCE(EXCLUDED.currency, marketing_kpi_purchases.currency),
          paid_at = EXCLUDED.paid_at,
          date_et = EXCLUDED.date_et,
          attribution = EXCLUDED.attribution,
          test = EXCLUDED.test,
          livemode = COALESCE(EXCLUDED.livemode, marketing_kpi_purchases.livemode),
          period = EXCLUDED.period,
          classification = EXCLUDED.classification,
          status = EXCLUDED.status
      `;
      await sql`
        INSERT INTO marketing_kpi_meta (key, value, updated_at)
        VALUES ('lastUpdatedAt', ${sql.json({ lastUpdatedAt: new Date().toISOString() })}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
      return {
        status: existing[0] ? ("updated" as const) : ("created" as const),
        record: merged,
      };
    },
  };
}

function createUnconfiguredProductionStore(): MarketingKpiStore {
  const error = () =>
    Promise.reject(new Error("marketing_kpi_postgres_unconfigured"));
  return {
    backend: "unconfigured_production",
    read: error,
    appendEvent: error,
    upsertSocialDaily: error,
    upsertPurchase: error,
  };
}

let store: MarketingKpiStore | undefined;

export function getMarketingKpiDurability(): {
  backend: KpiDurabilityBackend;
  productionSourceOfTruth: string;
  dataDirIsSourceOfTruth: boolean;
} {
  if (usesFileOverride()) {
    return {
      backend: "file_test_override",
      productionSourceOfTruth:
        "Isolated test file override (MARKETING_KPI_DB_FILE). Not production.",
      dataDirIsSourceOfTruth: false,
    };
  }
  if (marketingKpiPostgresConfigured()) {
    return {
      backend: "supabase_postgres",
      productionSourceOfTruth:
        "Supabase Postgres via POSTGRES_URL / POSTGRES_URL_NON_POOLING (existing production database)",
      dataDirIsSourceOfTruth: false,
    };
  }
  if (isHostedMarketingKpiRuntime()) {
    return {
      backend: "unconfigured_production",
      productionSourceOfTruth:
        "Postgres required in Vercel production/preview; filesystem fallback is disabled",
      dataDirIsSourceOfTruth: false,
    };
  }
  return {
    backend: "file_test_override",
    productionSourceOfTruth:
      "Local development file fallback. Not the production system of record.",
    dataDirIsSourceOfTruth: false,
  };
}

export function getMarketingKpiStore(): MarketingKpiStore {
  if (!store) {
    if (usesFileOverride()) {
      store = createFileMarketingKpiStore();
    } else if (marketingKpiPostgresConfigured()) {
      store = createPostgresMarketingKpiStore();
    } else if (isHostedMarketingKpiRuntime()) {
      store = createUnconfiguredProductionStore();
    } else {
      store = createFileMarketingKpiStore();
    }
  }
  return store;
}

export function resetMarketingKpiStoreForTests(): void {
  store = undefined;
}
