import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type {
  AccountAccessRecord,
  BillingDatabase,
  BillingNotificationRecord,
  EntitlementKind,
  EntitlementRecord,
  PurchaseRecord,
  StripeEventLogRecord,
} from "@/lib/billing/types";

const DEFAULT_DATA_DIR = ".data/billing";
const DEFAULT_DB_FILE = ".data/billing/database.json";

const emptyDatabase = (): BillingDatabase => ({
  entitlements: [],
  purchases: [],
  stripeEvents: [],
  accountAccess: [],
  notifications: [],
});

function normalizeDatabase(raw: BillingDatabase): BillingDatabase {
  return {
    entitlements: Array.isArray(raw.entitlements) ? raw.entitlements : [],
    purchases: Array.isArray(raw.purchases) ? raw.purchases : [],
    stripeEvents: Array.isArray(raw.stripeEvents) ? raw.stripeEvents : [],
    accountAccess: Array.isArray(raw.accountAccess) ? raw.accountAccess : [],
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
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

async function readDatabase(dbFile: string): Promise<BillingDatabase> {
  try {
    const raw = await readFile(dbFile, "utf8");
    return normalizeDatabase(JSON.parse(raw) as BillingDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(
  dataDir: string,
  dbFile: string,
  database: BillingDatabase,
): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
  await rename(tempFile, dbFile);
}

function queueKpiMirror(record: PurchaseRecord, skip = false): void {
  if (skip || process.env.MARKETING_KPI_DB_FILE) return;
  void import("@/lib/marketing-kpi/migrate")
    .then((mod) => mod.mirrorBillingPurchase(record))
    .catch(() => undefined);
}

export type BillingStore = {
  findStripeEvent(eventId: string): Promise<StripeEventLogRecord | undefined>;
  deleteStripeEvent(eventId: string): Promise<boolean>;
  recordStripeEvent(record: StripeEventLogRecord): Promise<"created" | "duplicate">;
  upsertEntitlement(
    input: Omit<EntitlementRecord, "id" | "updatedAt"> & { id?: string },
  ): Promise<EntitlementRecord>;
  findEntitlementsByUserId(userId: string): Promise<EntitlementRecord[]>;
  findEntitlementByUserAndKind(
    userId: string,
    kind: EntitlementKind,
  ): Promise<EntitlementRecord | undefined>;
  findEntitlementsBySubscriptionId(
    subscriptionId: string,
  ): Promise<EntitlementRecord[]>;
  findEntitlementsByCheckoutSessionId(
    sessionId: string,
  ): Promise<EntitlementRecord[]>;
  findEntitlementsByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<EntitlementRecord[]>;
  upsertPurchase(
    input: Omit<PurchaseRecord, "id" | "updatedAt"> & { id?: string },
  ): Promise<PurchaseRecord>;
  findPurchasesByUserId(userId: string): Promise<PurchaseRecord[]>;
  findPurchaseByCheckoutSessionId(
    sessionId: string,
  ): Promise<PurchaseRecord | undefined>;
  findPurchaseByPaymentIntentId(
    paymentIntentId: string,
  ): Promise<PurchaseRecord | undefined>;
  findPurchaseByChargeId(chargeId: string): Promise<PurchaseRecord | undefined>;
  listPurchases(): Promise<PurchaseRecord[]>;
  listStripeEvents(): Promise<StripeEventLogRecord[]>;
  upsertAccountAccess(record: AccountAccessRecord): Promise<AccountAccessRecord>;
  findAccountAccessByUserId(
    userId: string,
  ): Promise<AccountAccessRecord | undefined>;
  findNotificationByIdempotencyKey(
    key: string,
  ): Promise<BillingNotificationRecord | undefined>;
  recordNotification(
    record: Omit<BillingNotificationRecord, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    },
  ): Promise<{ status: "created" | "duplicate"; record: BillingNotificationRecord }>;
  listNotificationsByUserId(userId: string): Promise<BillingNotificationRecord[]>;
};

export function createFileBillingStore(options?: {
  dataDir?: string;
  skipKpiMirror?: boolean;
}): BillingStore {
  const dataDir = options?.dataDir ?? DEFAULT_DATA_DIR;
  const dbFile = options?.dataDir
    ? `${options.dataDir.replace(/\\/g, "/")}/database.json`
    : DEFAULT_DB_FILE;
  const skipKpiMirror = options?.skipKpiMirror === true || Boolean(options?.dataDir);

  return {
    findStripeEvent(eventId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.stripeEvents.find((entry) => entry.id === eventId);
      });
    },

    deleteStripeEvent(eventId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const before = database.stripeEvents.length;
        database.stripeEvents = database.stripeEvents.filter(
          (entry) => entry.id !== eventId,
        );
        if (database.stripeEvents.length === before) {
          return false;
        }
        await writeDatabase(dataDir, dbFile, database);
        return true;
      });
    },

    recordStripeEvent(record) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        if (database.stripeEvents.some((entry) => entry.id === record.id)) {
          return "duplicate";
        }
        database.stripeEvents.push(record);
        await writeDatabase(dataDir, dbFile, database);
        return "created";
      });
    },

    upsertEntitlement(input) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const now = new Date().toISOString();
        const existingIndex = database.entitlements.findIndex((entry) => {
          if (input.id && entry.id === input.id) return true;
          if (
            input.stripeSubscriptionId &&
            entry.stripeSubscriptionId === input.stripeSubscriptionId &&
            entry.kind === input.kind
          ) {
            return true;
          }
          if (
            input.stripeCheckoutSessionId &&
            entry.stripeCheckoutSessionId === input.stripeCheckoutSessionId &&
            entry.kind === input.kind
          ) {
            return true;
          }
          // One logical entitlement row per user+kind for launch.
          return entry.userId === input.userId && entry.kind === input.kind;
        });

        if (existingIndex >= 0) {
          const current = database.entitlements[existingIndex]!;
          const updated: EntitlementRecord = {
            ...current,
            ...input,
            id: current.id,
            // Never extend a one-year bundle term on duplicate events.
            grantedAt: current.grantedAt,
            startsAt: current.startsAt,
            endsAt:
              input.endsAt !== undefined
                ? mergeEndsAt(current, input)
                : current.endsAt,
            updatedAt: now,
          };
          database.entitlements[existingIndex] = updated;
          await writeDatabase(dataDir, dbFile, database);
          return updated;
        }

        const created: EntitlementRecord = {
          ...input,
          id: input.id ?? crypto.randomUUID(),
          updatedAt: now,
        };
        database.entitlements.push(created);
        await writeDatabase(dataDir, dbFile, database);
        return created;
      });
    },

    findEntitlementsByUserId(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.entitlements.filter((entry) => entry.userId === userId);
      });
    },

    findEntitlementByUserAndKind(userId, kind) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.entitlements.find(
          (entry) => entry.userId === userId && entry.kind === kind,
        );
      });
    },

    findEntitlementsBySubscriptionId(subscriptionId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.entitlements.filter(
          (entry) => entry.stripeSubscriptionId === subscriptionId,
        );
      });
    },

    findEntitlementsByCheckoutSessionId(sessionId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.entitlements.filter(
          (entry) => entry.stripeCheckoutSessionId === sessionId,
        );
      });
    },

    findEntitlementsByPaymentIntentId(paymentIntentId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.entitlements.filter(
          (entry) => entry.stripePaymentIntentId === paymentIntentId,
        );
      });
    },

    upsertPurchase(input) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const now = new Date().toISOString();
        const existingIndex = database.purchases.findIndex((entry) => {
          if (input.id && entry.id === input.id) return true;
          if (
            input.stripeCheckoutSessionId &&
            entry.stripeCheckoutSessionId === input.stripeCheckoutSessionId
          ) {
            return true;
          }
          if (
            input.stripePaymentIntentId &&
            entry.stripePaymentIntentId === input.stripePaymentIntentId
          ) {
            return true;
          }
          if (
            input.stripeInvoiceId &&
            entry.stripeInvoiceId === input.stripeInvoiceId
          ) {
            return true;
          }
          return false;
        });

        if (existingIndex >= 0) {
          const current = database.purchases[existingIndex]!;
          const updated: PurchaseRecord = {
            ...current,
            ...input,
            id: current.id,
            createdAt: current.createdAt,
            updatedAt: now,
          };
          database.purchases[existingIndex] = updated;
          await writeDatabase(dataDir, dbFile, database);
          queueKpiMirror(updated, skipKpiMirror);
          return updated;
        }

        const created: PurchaseRecord = {
          ...input,
          id: input.id ?? crypto.randomUUID(),
          updatedAt: now,
        };
        database.purchases.push(created);
        await writeDatabase(dataDir, dbFile, database);
        queueKpiMirror(created, skipKpiMirror);
        return created;
      });
    },

    findPurchasesByUserId(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.purchases.filter((entry) => entry.userId === userId);
      });
    },

    findPurchaseByCheckoutSessionId(sessionId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.purchases.find(
          (entry) => entry.stripeCheckoutSessionId === sessionId,
        );
      });
    },

    findPurchaseByPaymentIntentId(paymentIntentId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.purchases.find(
          (entry) => entry.stripePaymentIntentId === paymentIntentId,
        );
      });
    },

    findPurchaseByChargeId(chargeId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.purchases.find(
          (entry) => entry.stripeChargeId === chargeId,
        );
      });
    },

    listPurchases() {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.purchases;
      });
    },

    listStripeEvents() {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.stripeEvents;
      });
    },

    upsertAccountAccess(record) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const index = database.accountAccess.findIndex(
          (entry) => entry.userId === record.userId,
        );
        if (index >= 0) {
          database.accountAccess[index] = record;
        } else {
          database.accountAccess.push(record);
        }
        await writeDatabase(dataDir, dbFile, database);
        return record;
      });
    },

    findAccountAccessByUserId(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.accountAccess.find((entry) => entry.userId === userId);
      });
    },

    findNotificationByIdempotencyKey(key) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.notifications.find(
          (entry) => entry.idempotencyKey === key,
        );
      });
    },

    recordNotification(input) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const existing = database.notifications.find(
          (entry) => entry.idempotencyKey === input.idempotencyKey,
        );
        if (existing) {
          return { status: "duplicate" as const, record: existing };
        }
        const record: BillingNotificationRecord = {
          id: input.id ?? crypto.randomUUID(),
          idempotencyKey: input.idempotencyKey,
          userId: input.userId,
          template: input.template,
          status: input.status,
          locale: input.locale,
          offerId: input.offerId,
          detail: input.detail,
          createdAt: input.createdAt ?? new Date().toISOString(),
        };
        database.notifications.push(record);
        await writeDatabase(dataDir, dbFile, database);
        return { status: "created" as const, record };
      });
    },

    listNotificationsByUserId(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.notifications.filter((entry) => entry.userId === userId);
      });
    },
  };
}

/**
 * Duplicate bundle events must not extend the included Community year.
 * Subscription renewals may move endsAt forward.
 */
function mergeEndsAt(
  current: EntitlementRecord,
  incoming: Omit<EntitlementRecord, "id" | "updatedAt"> & { id?: string },
): string | undefined {
  if (!incoming.endsAt) {
    return current.endsAt;
  }

  if (incoming.sourceOfferId === "bundle" && current.sourceOfferId === "bundle") {
    // Keep the earlier/original end for the included year.
    if (current.endsAt && incoming.endsAt) {
      return current.endsAt < incoming.endsAt ? current.endsAt : incoming.endsAt;
    }
    return current.endsAt ?? incoming.endsAt;
  }

  if (
    incoming.stripeSubscriptionId &&
    current.stripeSubscriptionId === incoming.stripeSubscriptionId
  ) {
    // Subscription renewals: take the later paid-through date.
    if (current.endsAt && incoming.endsAt) {
      return current.endsAt > incoming.endsAt ? current.endsAt : incoming.endsAt;
    }
  }

  return incoming.endsAt;
}

let billingStore: BillingStore | undefined;

export function getBillingStore(): BillingStore {
  if (!billingStore) {
    billingStore = createFileBillingStore();
  }
  return billingStore;
}

/** Test-only override — never use from production request paths. */
export function setBillingStoreForTests(store: BillingStore | null): void {
  billingStore = store ?? undefined;
}
