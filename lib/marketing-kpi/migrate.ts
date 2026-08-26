import { mkdir, readFile, writeFile } from "node:fs/promises";
import { getBillingStore } from "@/lib/billing/store";
import type { PurchaseRecord } from "@/lib/billing/types";
import { unknownAttribution } from "@/lib/marketing-kpi/attribution";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import {
  HISTORICAL_EXCLUSION_LABEL,
  classifyRecord,
  isLikelyTestPayment,
} from "@/lib/marketing-kpi/period";
import { getMarketingKpiStore } from "@/lib/marketing-kpi/store";
import type { MarketingPurchaseRecord } from "@/lib/marketing-kpi/types";

export const HISTORICAL_PURCHASES_PATH =
  "ops/fab-5/marketing-kpi/historical-paid-purchases.json";

export type HistoricalPurchaseSnapshotRecord = {
  id: string;
  billingPurchaseId: string;
  paidAt: string;
  dateEt: string;
  amountCents?: number;
  currency?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  test: boolean;
  status: "paid";
  period: "pre_launch_historical";
  classification: "historical";
  label: typeof HISTORICAL_EXCLUSION_LABEL;
};

export type HistoricalPurchaseSnapshot = {
  capturedAt: string;
  baselineDate: "2026-08-19";
  timezone: "America/New_York";
  label: typeof HISTORICAL_EXCLUSION_LABEL;
  paidCount: number;
  records: HistoricalPurchaseSnapshotRecord[];
  notes: string[];
};

function toSnapshotRecord(purchase: PurchaseRecord): HistoricalPurchaseSnapshotRecord {
  const paidAt = purchase.createdAt;
  return {
    id: `hist-${purchase.id}`,
    billingPurchaseId: purchase.id,
    paidAt,
    dateEt: dateEt(paidAt),
    amountCents: purchase.amountCents,
    currency: purchase.currency,
    stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
    stripePaymentIntentId: purchase.stripePaymentIntentId,
    test: isLikelyTestPayment({
      stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
      stripePaymentIntentId: purchase.stripePaymentIntentId,
    }),
    status: "paid",
    period: "pre_launch_historical",
    classification: "historical",
    label: HISTORICAL_EXCLUSION_LABEL,
  };
}

export async function buildHistoricalPurchaseSnapshot(
  purchases: PurchaseRecord[],
): Promise<HistoricalPurchaseSnapshot> {
  const paid = purchases.filter((purchase) => {
    if (purchase.status !== "paid") return false;
    return (
      classifyRecord({
        createdAt: purchase.createdAt,
        stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
        stripePaymentIntentId: purchase.stripePaymentIntentId,
      }).period === "pre_launch_historical"
    );
  });
  const records = paid
    .map(toSnapshotRecord)
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  return {
    capturedAt: new Date().toISOString(),
    baselineDate: "2026-08-19",
    timezone: "America/New_York",
    label: HISTORICAL_EXCLUSION_LABEL,
    paidCount: records.length,
    records,
    notes: [
      "Captured from the local billing ledger before the August 28–31, 2026 campaign.",
      "These records are preserved for audit. They are never launch purchases, launch revenue, or launch conversion.",
      "No user identifiers, emails, or Stripe customer IDs are stored in this snapshot.",
      "Sandbox Stripe IDs remain identifiable via cs_test_/pi_test_ prefixes and classification=historical.",
    ],
  };
}

async function loadSnapshotFile(): Promise<HistoricalPurchaseSnapshot | null> {
  try {
    const raw = await readFile(HISTORICAL_PURCHASES_PATH, "utf8");
    return JSON.parse(raw) as HistoricalPurchaseSnapshot;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") return null;
    throw error;
  }
}

function snapshotToLedger(
  record: HistoricalPurchaseSnapshotRecord,
): Omit<MarketingPurchaseRecord, "period" | "classification"> & {
  period: MarketingPurchaseRecord["period"];
  classification: MarketingPurchaseRecord["classification"];
} {
  return {
    id: record.id,
    billingPurchaseId: record.billingPurchaseId,
    stripeCheckoutSessionId: record.stripeCheckoutSessionId,
    stripePaymentIntentId: record.stripePaymentIntentId,
    amountCents: record.amountCents,
    currency: record.currency,
    paidAt: record.paidAt,
    dateEt: record.dateEt,
    attribution: unknownAttribution(),
    test: record.test,
    period: "pre_launch_historical",
    classification: "historical",
    status: "paid",
  };
}

export async function persistHistoricalPurchaseSnapshot(
  snapshot: HistoricalPurchaseSnapshot,
): Promise<void> {
  await mkdir("ops/fab-5/marketing-kpi", { recursive: true });
  await writeFile(
    HISTORICAL_PURCHASES_PATH,
    JSON.stringify(snapshot, null, 2) + "\n",
    "utf8",
  );
}

export async function mirrorBillingPurchase(
  purchase: PurchaseRecord,
): Promise<MarketingPurchaseRecord> {
  const classified = classifyRecord({
    createdAt: purchase.createdAt,
    test: isLikelyTestPayment({
      stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
      stripePaymentIntentId: purchase.stripePaymentIntentId,
    }),
    stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
    stripePaymentIntentId: purchase.stripePaymentIntentId,
  });
  const result = await getMarketingKpiStore().upsertPurchase({
    billingPurchaseId: purchase.id,
    stripeCheckoutSessionId: purchase.stripeCheckoutSessionId,
    stripePaymentIntentId: purchase.stripePaymentIntentId,
    stripeChargeId: purchase.stripeChargeId,
    stripeEventId: purchase.sourceEventId,
    amountCents: purchase.amountCents,
    currency: purchase.currency,
    paidAt: purchase.createdAt,
    dateEt: dateEt(purchase.createdAt),
    attribution: unknownAttribution(),
    test: classified.classification === "test",
    period: classified.period,
    classification:
      classified.period === "pre_launch_historical"
        ? "historical"
        : classified.classification,
    status: purchase.status,
  });
  return result.record;
}

let migrationStarted: Promise<void> | undefined;

export async function ensureKpiPurchaseMigration(): Promise<void> {
  if (process.env.MARKETING_KPI_SKIP_MIGRATION === "1") return;
  if (process.env.MARKETING_KPI_DB_FILE) return;
  if (!migrationStarted) {
    migrationStarted = runKpiPurchaseMigration().catch((error) => {
      migrationStarted = undefined;
      throw error;
    });
  }
  return migrationStarted;
}

export function resetKpiPurchaseMigrationForTests(): void {
  migrationStarted = undefined;
}

export async function migrateKpiPurchasesNow(): Promise<void> {
  migrationStarted = undefined;
  await runKpiPurchaseMigration();
}

async function runKpiPurchaseMigration(): Promise<void> {
  let snapshot = await loadSnapshotFile();
  try {
    const billingPurchases = await getBillingStore().listPurchases();
    const paid = billingPurchases.filter((purchase) => purchase.status === "paid");
    if (paid.length > 0) {
      const fromBilling = await buildHistoricalPurchaseSnapshot(paid);
      if (!snapshot || snapshot.paidCount !== fromBilling.paidCount) {
        const historicalOnly = {
          ...fromBilling,
          records: fromBilling.records.filter(
            (record) => record.period === "pre_launch_historical",
          ),
        };
        historicalOnly.paidCount = historicalOnly.records.length;
        if (historicalOnly.paidCount > 0) {
          await persistHistoricalPurchaseSnapshot(historicalOnly);
          snapshot = historicalOnly;
        }
      }
      for (const purchase of billingPurchases) {
        await mirrorBillingPurchase(purchase);
      }
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      // Billing file may be absent on a fresh serverless instance; snapshot still seeds history.
    }
  }

  if (snapshot) {
    for (const record of snapshot.records) {
      await getMarketingKpiStore().upsertPurchase(snapshotToLedger(record));
    }
  }
}
