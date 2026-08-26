import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { AnalyticsDatabase, AnalyticsEventRecord } from "@/lib/analytics/types";
import { getAnalyticsStore } from "@/lib/analytics/store";

const LOCAL_ANALYTICS_FILE = ".data/analytics/database.json";

function isTestEvent(event: AnalyticsEventRecord): boolean {
  if (event.test === true) return true;
  const session = String(event.payload?.stripeCheckoutSessionId ?? "");
  const intent = String(event.payload?.stripePaymentIntentId ?? "");
  const userId = event.userId ?? "";
  return (
    session.startsWith("cs_test_") ||
    intent.startsWith("pi_test_") ||
    event.idempotencyKey.includes("cs_test_") ||
    userId.includes("row150") ||
    userId.includes("-test")
  );
}

export async function migrateLegitimateAnalyticsEvents(): Promise<{
  considered: number;
  migrated: number;
  skippedTest: number;
}> {
  if (process.env.ANALYTICS_DB_FILE) {
    return { considered: 0, migrated: 0, skippedTest: 0 };
  }
  if (!existsSync(LOCAL_ANALYTICS_FILE)) {
    return { considered: 0, migrated: 0, skippedTest: 0 };
  }
  const raw = await readFile(LOCAL_ANALYTICS_FILE, "utf8");
  const database = JSON.parse(raw) as AnalyticsDatabase;
  const events = Array.isArray(database.events) ? database.events : [];
  let migrated = 0;
  let skippedTest = 0;
  const store = getAnalyticsStore();
  if (store.backend !== "supabase_postgres") {
    return { considered: events.length, migrated: 0, skippedTest: 0 };
  }
  for (const event of events) {
    if (isTestEvent(event)) {
      skippedTest += 1;
      continue;
    }
    await store.appendEvent({
      id: event.id,
      name: event.name,
      userId: event.userId,
      idempotencyKey: event.idempotencyKey,
      payload: event.payload,
      createdAt: event.createdAt,
      test: false,
    });
    migrated += 1;
  }
  return { considered: events.length, migrated, skippedTest };
}
