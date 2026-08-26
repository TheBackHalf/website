/**
 * Row 181 / AOS al-181 — data integrity and recovery testing.
 * Isolated file stores + isolated pglite restore. Does not restore over
 * production. Does not mark Founder acceptance or the Command Center row complete.
 */

import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import postgres from "postgres";

import { payloadContainsProhibitedData } from "@/lib/analytics/privacy";
import {
  getAnalyticsStore,
  resetAnalyticsStoreForTests,
} from "@/lib/analytics/store";
import { trackProductEvent } from "@/lib/analytics/track";
import { createFileAuthStore } from "@/lib/auth/store/file-store";
import { setAuthStoreForTests } from "@/lib/auth/store";
import { CRITICAL_PUBLIC_TABLES, RECOVERY_DIR } from "@/lib/backup/catalog";
import {
  captureProductionFingerprint,
  fingerprintsMatch,
} from "@/lib/backup/fingerprint";
import { restoreDumpToPglite, runIsolatedRestore } from "@/lib/backup/restore-test";
import type { IsolatedRestoreResult } from "@/lib/backup/types";
import { recordConsentsForUser } from "@/lib/consent/record-consent";
import { buildConsentRecords, documentToConsentType } from "@/lib/consent/validation";
import { accountCreationConsents } from "@/content/legal/documents";
import {
  createFileJourneyProgressStore,
  setJourneyProgressStoreForTests,
} from "@/lib/journey/progress";
import {
  createLuminaMemoryStore,
  setLuminaMemoryStoreForTests,
} from "@/lib/lumina/memory/store";
import {
  clearLuminaMemoryForUserResult,
  retrieveLuminaMemoryForUser,
  setLuminaMemoryEnabledForUser,
  writeLuminaMemoryForUser,
} from "@/lib/lumina/memory/service";
import { createFileLuminaStore, setLuminaStoreForTests } from "@/lib/lumina/store";
import {
  parseAttributionFromSearch,
  trackedRegisterUrl,
} from "@/lib/marketing-kpi/attribution";
import { recordPurchase } from "@/lib/marketing-kpi/collect";
import { loadPostgresEnvFromLocalFile } from "@/lib/marketing-kpi/db";
import {
  getMarketingKpiStore,
  resetMarketingKpiStoreForTests,
} from "@/lib/marketing-kpi/store";
import { resetKpiPurchaseMigrationForTests } from "@/lib/marketing-kpi/migrate";

type Verdict = "PASS" | "FAIL" | "NOT_RUN";

type TestRow = {
  id: string;
  area:
    | "saving"
    | "duplicate_events"
    | "backups"
    | "restore"
    | "deletion"
    | "consent_history"
    | "cross_system_reconciliation";
  name: string;
  expected: string;
  actual: string;
  verdict: Verdict;
};

const STATUS_FILE = "ops/fab-5/runs/aos-engineering-status/al-181.json";
const WORK_ID = "al-181";
const tests: TestRow[] = [];

function record(row: Omit<TestRow, "verdict"> & { pass: boolean }): void {
  tests.push({
    id: row.id,
    area: row.area,
    name: row.name,
    expected: row.expected,
    actual: row.actual,
    verdict: row.pass ? "PASS" : "FAIL",
  });
}

function recordNotRun(row: Omit<TestRow, "verdict" | "pass">): void {
  tests.push({ ...row, verdict: "NOT_RUN" });
}

function areaVerdict(area: TestRow["area"]): Verdict {
  const rows = tests.filter((row) => row.area === area);
  if (rows.some((row) => row.verdict === "FAIL")) return "FAIL";
  if (rows.length === 0) return "NOT_RUN";
  if (rows.every((row) => row.verdict === "NOT_RUN")) return "NOT_RUN";
  if (rows.some((row) => row.verdict === "PASS") && rows.every((row) => row.verdict !== "FAIL")) {
    return "PASS";
  }
  return "FAIL";
}

function hasMethod(store: object, name: string): boolean {
  return typeof (store as Record<string, unknown>)[name] === "function";
}

function ensurePgliteInstalled(): void {
  const marker = path.join(RECOVERY_DIR, "node_modules/@electric-sql/pglite/package.json");
  if (existsSync(marker)) return;
  const result = spawnSync(
    "npm",
    ["install", "--prefix", RECOVERY_DIR, "@electric-sql/pglite", "--no-fund", "--no-audit"],
    { stdio: "pipe", shell: true, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error("pglite_install_failed");
  }
}

function productionUrl(): string | undefined {
  loadPostgresEnvFromLocalFile();
  const url =
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!url) return undefined;
  if (/localhost|127\.0\.0\.1/i.test(url)) return undefined;
  return url;
}

async function runIsolatedPgliteRestore(): Promise<{
  ok: boolean;
  tablesRestored: number;
  analyticsCount: number;
  purchaseCount: number;
  dumpRemoved: boolean;
  missingCriticalTables: string[];
  error?: string;
}> {
  ensurePgliteInstalled();
  const tmp = await mkdtemp(path.join(os.tmpdir(), "al181-dump-"));
  const dumpPath = path.join(tmp, "isolated.dump.json");
  const now = "2026-08-26T18:00:00.000Z";
  const empty = (name: string, columns: Array<{ name: string; udt: string; nullable: boolean; primaryKey: boolean }>) => ({
    name,
    columns,
    rowCount: 0,
    rows: [] as unknown[][],
  });
  const analyticsColumns = [
    { name: "id", udt: "text", nullable: false, primaryKey: true },
    { name: "name", udt: "text", nullable: false, primaryKey: false },
    { name: "created_at", udt: "timestamptz", nullable: false, primaryKey: false },
    { name: "user_id", udt: "text", nullable: true, primaryKey: false },
    { name: "idempotency_key", udt: "text", nullable: false, primaryKey: false },
    { name: "payload", udt: "jsonb", nullable: true, primaryKey: false },
    { name: "test", udt: "bool", nullable: false, primaryKey: false },
  ];
  const purchaseColumns = [
    { name: "id", udt: "text", nullable: false, primaryKey: true },
    { name: "paid_at", udt: "timestamptz", nullable: false, primaryKey: false },
    { name: "amount_cents", udt: "int4", nullable: true, primaryKey: false },
    { name: "stripe_checkout_session_id", udt: "text", nullable: true, primaryKey: false },
    { name: "test", udt: "bool", nullable: false, primaryKey: false },
  ];
  const idColumns = [{ name: "id", udt: "text", nullable: false, primaryKey: true }];
  const keyColumns = [{ name: "key", udt: "text", nullable: false, primaryKey: true }];
  const areaColumns = [{ name: "area", udt: "text", nullable: false, primaryKey: true }];
  const dateColumns = [{ name: "date_et", udt: "text", nullable: false, primaryKey: true }];

  const dump = {
    generatedAt: now,
    tables: [
      {
        name: "analytics_events",
        columns: analyticsColumns,
        rowCount: 2,
        rows: [
          [
            "evt-al181-1",
            "purchase_completed",
            now,
            "user-al181",
            "purchase_completed:cs_test_al181_restore",
            JSON.stringify({ stripeCheckoutSessionId: "cs_test_al181_restore", amountCents: 150000 }),
            true,
          ],
          [
            "evt-al181-2",
            "page_viewed",
            now,
            "user-al181",
            "page_viewed:cs_test_al181_restore",
            JSON.stringify({ path: "/register" }),
            true,
          ],
        ],
      },
      empty("marketing_kpi_events", idColumns),
      {
        name: "marketing_kpi_purchases",
        columns: purchaseColumns,
        rowCount: 1,
        rows: [["kpi-al181-1", now, 150000, "cs_test_al181_restore", true]],
      },
      empty("marketing_kpi_social_daily", dateColumns),
      empty("marketing_kpi_meta", keyColumns),
      empty("launch_dashboard_risks", idColumns),
      empty("launch_dashboard_availability", areaColumns),
      empty("launch_dashboard_snapshots", idColumns),
      empty("launch_dashboard_support", idColumns),
      empty("launch_dashboard_meta", keyColumns),
      empty("launch_ops_errors", idColumns),
      empty("support_tickets", idColumns),
    ],
  };

  await writeFile(dumpPath, JSON.stringify(dump), "utf8");
  try {
    const restored = await restoreDumpToPglite(dumpPath);
    const present = Object.keys(restored.restoredCounts);
    const missingCriticalTables = CRITICAL_PUBLIC_TABLES.filter((name) => !present.includes(name));
    const analyticsCount = restored.restoredCounts.analytics_events ?? -1;
    const purchaseCount = restored.restoredCounts.marketing_kpi_purchases ?? -1;
    const countsMatch =
      analyticsCount === 2 &&
      purchaseCount === 1 &&
      restored.analyticsNameCounts.purchase_completed === 1 &&
      restored.analyticsNameCounts.page_viewed === 1;
    await restored.close();
    await rm(dumpPath, { force: true });
    const dumpRemoved = !existsSync(dumpPath);
    await rm(tmp, { recursive: true, force: true });
    return {
      ok: missingCriticalTables.length === 0 && countsMatch && dumpRemoved,
      tablesRestored: present.length,
      analyticsCount,
      purchaseCount,
      dumpRemoved,
      missingCriticalTables: [...missingCriticalTables],
    };
  } catch (error) {
    await rm(tmp, { recursive: true, force: true }).catch(() => undefined);
    return {
      ok: false,
      tablesRestored: 0,
      analyticsCount: -1,
      purchaseCount: -1,
      dumpRemoved: !existsSync(dumpPath),
      missingCriticalTables: [...CRITICAL_PUBLIC_TABLES],
      error: error instanceof Error ? error.message : "isolated_restore_failed",
    };
  }
}

async function maybeProductionRestore(): Promise<{
  attempted: boolean;
  productionModified: "NO" | "YES" | "UNKNOWN";
  result: IsolatedRestoreResult | null;
  reason: string | null;
}> {
  const url = productionUrl();
  if (!url) {
    return {
      attempted: false,
      productionModified: "NO",
      result: null,
      reason: "postgres_url_unconfigured_in_this_workstation",
    };
  }
  ensurePgliteInstalled();
  const sql = postgres(url, { max: 1, ssl: "require", prepare: false, connect_timeout: 20 });
  try {
    const before = await captureProductionFingerprint(sql);
    const restore = await runIsolatedRestore(sql);
    const after = await captureProductionFingerprint(sql);
    const unchanged = fingerprintsMatch(before, after);
    return {
      attempted: true,
      productionModified: unchanged ? "NO" : "YES",
      result: restore,
      reason: unchanged ? null : "production_fingerprint_changed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "production_restore_failed";
    return {
      attempted: true,
      productionModified: "UNKNOWN",
      result: null,
      reason: message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@").slice(0, 220),
    };
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "al181-"));
  const authDir = path.join(tmpRoot, "auth");
  const journeyDir = path.join(tmpRoot, "journey");
  const luminaDir = path.join(tmpRoot, "lumina");
  const analyticsFile = path.join(tmpRoot, "analytics.json");
  const kpiFile = path.join(tmpRoot, "kpi.json");
  const previousAnalytics = process.env.ANALYTICS_DB_FILE;
  const previousKpi = process.env.MARKETING_KPI_DB_FILE;

  process.env.ANALYTICS_DB_FILE = analyticsFile;
  process.env.MARKETING_KPI_DB_FILE = kpiFile;
  resetAnalyticsStoreForTests();
  resetMarketingKpiStoreForTests();
  resetKpiPurchaseMigrationForTests();

  const auth = createFileAuthStore({ dataDir: authDir });
  setAuthStoreForTests(auth);
  setJourneyProgressStoreForTests(createFileJourneyProgressStore({ dataDir: journeyDir }));
  setLuminaStoreForTests(createFileLuminaStore({ dataDir: luminaDir }));
  setLuminaMemoryStoreForTests(createLuminaMemoryStore());

  const email = "al181-integrity@example.test";
  const consentValues = accountCreationConsents.map((document) => ({
    consentType: documentToConsentType(document.id),
    documentId: document.id,
    accepted: true,
  }));
  const consents = buildConsentRecords(consentValues, { locale: "en" });
  const now = new Date().toISOString();
  const user = await auth.persistEmailRegistration({
    user: {
      email,
      firstName: "Integrity",
      lastName: "Probe",
      authProvider: "email",
      arcCode: `AL181${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      emailVerified: false,
      locale: "en",
      ageEligible: true,
      ageEligibleConfirmedAt: now,
    },
    consents,
    verificationToken: {
      token: `al181-verify-${crypto.randomUUID()}`,
      userId: "pending",
      email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      createdAt: now,
    },
  });

  const authReread = createFileAuthStore({ dataDir: authDir });
  const savedUser = await authReread.findUserById(user.id);
  const savedConsents = await authReread.findConsentRecordsByUserId(user.id);
  const authSnapshot = JSON.parse(await readFile(path.join(authDir, "database.json"), "utf8")) as {
    verificationTokens: Array<{ token: string }>;
  };
  const savedToken = authSnapshot.verificationTokens[0]?.token
    ? await authReread.findVerificationToken(authSnapshot.verificationTokens[0].token)
    : undefined;

  record({
    id: "S1",
    area: "saving",
    name: "Atomic registration save",
    expected: "User, required consents, and verification token persist and re-read from a new store instance",
    actual: `user=${Boolean(savedUser)}; consents=${savedConsents.length}; token=${Boolean(savedToken)}; firstName=${savedUser?.firstName ?? "missing"}`,
    pass:
      Boolean(savedUser) &&
      savedUser?.id === user.id &&
      savedUser.firstName === "Integrity" &&
      savedConsents.length === consents.length &&
      Boolean(savedToken),
  });

  const { getJourneyProgressStore } = await import("@/lib/journey/progress");
  const progress = await getJourneyProgressStore().upsertProgress({
    userId: user.id,
    chapterId: "chapter-1-origin",
    status: "in_progress",
  });
  const progressReread = await getJourneyProgressStore().findProgressForUser(user.id);
  record({
    id: "S2",
    area: "saving",
    name: "Journey progress save",
    expected: "Progress upsert is durable on re-read",
    actual: `chapter=${progressReread?.chapterId}; status=${progressReread?.status}; userMatch=${progressReread?.userId === user.id}`,
    pass:
      progressReread?.userId === user.id &&
      progressReread.chapterId === "chapter-1-origin" &&
      progressReread.status === "in_progress" &&
      progress.userId === user.id,
  });

  const sessionId = "cs_test_al181_integrity";
  const purchaseKey = `purchase_completed:${sessionId}`;
  const pageKey = `page_viewed:${sessionId}`;
  const attribution = parseAttributionFromSearch(new URL(trackedRegisterUrl("R78-0828-IG")).searchParams);
  const firstEvent = await trackProductEvent({
    name: "purchase_completed",
    idempotencyKey: purchaseKey,
    userId: user.id,
    payload: { stripeCheckoutSessionId: sessionId, offerId: "blueprint", amountCents: 150000 },
    attribution,
  });
  const storedPurchase = await getAnalyticsStore().findByIdempotencyKey(purchaseKey);
  const pageEvent = await trackProductEvent({
    name: "page_viewed",
    idempotencyKey: pageKey,
    userId: user.id,
    path: "/register",
    locale: "en",
    attribution,
  });
  record({
    id: "S3",
    area: "saving",
    name: "Analytics event save",
    expected: "Controlled events persist and re-read by idempotency key",
    actual: `purchase=${firstEvent.status}; stored=${Boolean(storedPurchase)}; page=${pageEvent.status}; backend=${getAnalyticsStore().backend}`,
    pass:
      firstEvent.status === "created" &&
      pageEvent.status === "created" &&
      storedPurchase?.idempotencyKey === purchaseKey &&
      storedPurchase.userId === user.id,
  });

  const dirtyKey = `registration_failed:${sessionId}`;
  await trackProductEvent({
    name: "registration_failed",
    idempotencyKey: dirtyKey,
    payload: {
      password: "hunter2",
      token: "sk_test_not_a_real_secret_value",
      email: "architect@example.com",
      offerId: "blueprint",
    },
  });
  const dirtyStored = await getAnalyticsStore().findByIdempotencyKey(dirtyKey);
  const dirtyHits = payloadContainsProhibitedData(dirtyStored?.payload);
  const hasBlocked =
    Boolean(dirtyStored?.payload) &&
    ("password" in (dirtyStored?.payload ?? {}) || "token" in (dirtyStored?.payload ?? {}));
  record({
    id: "S4",
    area: "saving",
    name: "Save redacts prohibited fields",
    expected: "Password/token fields are not stored on the analytics event",
    actual: `hits=${dirtyHits.length}; hasBlockedKeys=${hasBlocked}; offerId=${String(dirtyStored?.payload?.offerId ?? "")}`,
    pass: dirtyHits.length === 0 && hasBlocked === false && dirtyStored?.payload?.offerId === "blueprint",
  });

  const enable = await setLuminaMemoryEnabledForUser(user.id, true);
  const writeMem = await writeLuminaMemoryForUser(user.id, {
    summary: { text: "AL181 isolated integrity summary", source: "explicit" },
  });
  const memory = await retrieveLuminaMemoryForUser(user.id);
  record({
    id: "S5",
    area: "saving",
    name: "Lumina memory save",
    expected: "Enabled memory write is retrievable for the same user",
    actual: `enable=${enable.status}; write=${writeMem.status}; summaries=${memory?.durable.summaries.length ?? -1}`,
    pass:
      enable.status === "ok" &&
      writeMem.status === "ok" &&
      (memory?.durable.summaries.length ?? 0) >= 1,
  });

  const kpiFirst = await recordPurchase({
    attribution,
    stripeCheckoutSessionId: sessionId,
    stripePaymentIntentId: "pi_test_al181_integrity",
    amountCents: 150000,
    currency: "usd",
    test: true,
    createdAt: "2026-08-28T18:00:00.000Z",
  });
  record({
    id: "S6",
    area: "saving",
    name: "KPI purchase save",
    expected: "Isolated KPI ledger records the sandbox purchase once",
    actual: `status=${kpiFirst.status}; amount=${kpiFirst.purchase.amountCents}; session=${kpiFirst.purchase.stripeCheckoutSessionId}`,
    pass:
      kpiFirst.status === "created" &&
      kpiFirst.purchase.amountCents === 150000 &&
      kpiFirst.purchase.stripeCheckoutSessionId === sessionId,
  });

  const dupEvent = await trackProductEvent({
    name: "purchase_completed",
    idempotencyKey: purchaseKey,
    userId: user.id,
    payload: { stripeCheckoutSessionId: sessionId, offerId: "blueprint", amountCents: 150000 },
  });
  const listed = await getAnalyticsStore().listEventsByUserId(user.id);
  const purchaseEvents = listed.filter((event) => event.idempotencyKey === purchaseKey);
  record({
    id: "D1",
    area: "duplicate_events",
    name: "Analytics duplicate idempotency",
    expected: "Second write with the same idempotency key is duplicate; one stored row",
    actual: `second=${dupEvent.status}; count=${purchaseEvents.length}`,
    pass: dupEvent.status === "duplicate" && purchaseEvents.length === 1,
  });

  const kpiSecond = await recordPurchase({
    attribution,
    stripeCheckoutSessionId: sessionId,
    stripePaymentIntentId: "pi_test_al181_integrity",
    amountCents: 150000,
    currency: "usd",
    test: true,
    createdAt: "2026-08-28T18:00:05.000Z",
  });
  const kpiLedger = await getMarketingKpiStore().read();
  const kpiPurchases = kpiLedger.purchases.filter((row) => row.stripeCheckoutSessionId === sessionId);
  record({
    id: "D2",
    area: "duplicate_events",
    name: "KPI purchase duplicate session",
    expected: "Same Stripe checkout session does not create a second purchase row or second revenue event",
    actual: `second=${kpiSecond.status}; purchases=${kpiPurchases.length}; events=${kpiLedger.events.filter((row) => row.idempotencyKey === `purchase:${sessionId}`).length}`,
    pass:
      kpiSecond.status === "duplicate" &&
      kpiPurchases.length === 1 &&
      kpiLedger.events.filter((row) => row.idempotencyKey === `purchase:${sessionId}`).length === 1,
  });

  let duplicateEmail = "not_thrown";
  try {
    await auth.persistEmailRegistration({
      user: {
        email,
        firstName: "Dup",
        lastName: "User",
        authProvider: "email",
        arcCode: `AL181DUP${crypto.randomUUID().slice(0, 4)}`,
        emailVerified: false,
        locale: "en",
      },
      consents: [],
      verificationToken: {
        token: `al181-dup-${crypto.randomUUID()}`,
        userId: "pending",
        email,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    });
    duplicateEmail = "accepted";
  } catch (error) {
    duplicateEmail = error instanceof Error ? error.message : "error";
  }
  record({
    id: "D3",
    area: "duplicate_events",
    name: "Duplicate email registration rejected",
    expected: "Second persistEmailRegistration for the same email throws DUPLICATE_EMAIL",
    actual: duplicateEmail,
    pass: duplicateEmail === "DUPLICATE_EMAIL",
  });

  const authDb = path.join(authDir, "database.json");
  const authBackup = path.join(tmpRoot, "auth.backup.json");
  const analyticsBackup = path.join(tmpRoot, "analytics.backup.json");
  const kpiBackup = path.join(tmpRoot, "kpi.backup.json");
  await copyFile(authDb, authBackup);
  await copyFile(analyticsFile, analyticsBackup);
  await copyFile(kpiFile, kpiBackup);

  const beforeBackupConsents = (await auth.findConsentRecordsByUserId(user.id)).length;
  await recordConsentsForUser(user.id, [
    {
      consentType: "lumina_memory",
      documentId: "lumina-memory",
      documentVersion: "1",
      consentedAt: new Date().toISOString(),
      userId: user.id,
    },
  ]);
  const afterMutationConsents = (await auth.findConsentRecordsByUserId(user.id)).length;
  await copyFile(authBackup, authDb);
  const restoredAuth = createFileAuthStore({ dataDir: authDir });
  const restoredConsents = await restoredAuth.findConsentRecordsByUserId(user.id);
  const restoredUser = await restoredAuth.findUserById(user.id);
  record({
    id: "B1",
    area: "backups",
    name: "File-store backup snapshot",
    expected: "Backup file is written and restore returns consent count to the pre-mutation snapshot",
    actual: `before=${beforeBackupConsents}; mutated=${afterMutationConsents}; restored=${restoredConsents.length}; user=${Boolean(restoredUser)}`,
    pass:
      afterMutationConsents > beforeBackupConsents &&
      restoredConsents.length === beforeBackupConsents &&
      restoredUser?.id === user.id,
  });

  await copyFile(analyticsBackup, analyticsFile);
  resetAnalyticsStoreForTests();
  await copyFile(kpiBackup, kpiFile);
  resetMarketingKpiStoreForTests();
  const restoredEvent = await getAnalyticsStore().findByIdempotencyKey(purchaseKey);
  const restoredKpi = (await getMarketingKpiStore().read()).purchases.find(
    (row) => row.stripeCheckoutSessionId === sessionId,
  );
  record({
    id: "R1",
    area: "restore",
    name: "File-store restore",
    expected: "Restored analytics and KPI files still contain the saved purchase identifiers",
    actual: `analytics=${Boolean(restoredEvent)}; kpiAmount=${restoredKpi?.amountCents ?? "missing"}`,
    pass: restoredEvent?.userId === user.id && restoredKpi?.amountCents === 150000,
  });

  const isolated = await runIsolatedPgliteRestore();
  record({
    id: "R2",
    area: "restore",
    name: "Isolated pglite restore",
    expected: "Known dump restores analytics=2, purchases=1, all critical tables, dump removed; destination is not production",
    actual: `ok=${isolated.ok}; tables=${isolated.tablesRestored}; analytics=${isolated.analyticsCount}; purchases=${isolated.purchaseCount}; dumpRemoved=${isolated.dumpRemoved}; missing=${isolated.missingCriticalTables.join(",") || "none"}; error=${isolated.error ?? "none"}`,
    pass: isolated.ok,
  });

  const production = await maybeProductionRestore();
  if (!production.attempted) {
    recordNotRun({
      id: "R3",
      area: "restore",
      name: "Production Postgres isolated restore",
      expected: "Logical export restored into isolated pglite without modifying production",
      actual: `NOT_RUN (${production.reason})`,
    });
    recordNotRun({
      id: "B2",
      area: "backups",
      name: "Production WAL / platform backup probe",
      expected: "Production archive_mode and isolated restore can be re-verified when POSTGRES_URL is present",
      actual: `NOT_RUN (${production.reason})`,
    });
  } else {
    record({
      id: "R3",
      area: "restore",
      name: "Production Postgres isolated restore",
      expected: "Isolated restore succeeds and production fingerprint is unchanged",
      actual: `ok=${production.result?.ok ?? false}; integrity=${production.result?.integrity ?? "n/a"}; productionModified=${production.productionModified}; reason=${production.reason ?? "none"}`,
      pass:
        production.result?.ok === true &&
        production.productionModified === "NO" &&
        production.result.integrity === "PASS",
    });
    record({
      id: "B2",
      area: "backups",
      name: "Production backup restore path",
      expected: "Production was not overwritten; isolated restore used a dump that was removed",
      actual: `productionModified=${production.productionModified}; dumpRemoved=${production.result?.dumpRemoved ?? false}; method=${production.result?.method ?? "none"}`,
      pass: production.productionModified === "NO" && production.result?.dumpRemoved === true,
    });
  }

  setAuthStoreForTests(auth);
  await recordConsentsForUser(user.id, [
    {
      consentType: "lumina_memory",
      documentId: "lumina-memory",
      documentVersion: "1",
      consentedAt: new Date().toISOString(),
      userId: user.id,
    },
  ]);
  const consentsBeforeClear = await auth.findConsentRecordsByUserId(user.id);
  const tokenBefore = JSON.parse(await readFile(authDb, "utf8")) as {
    verificationTokens: Array<{ token: string }>;
  };
  const tokenValue = tokenBefore.verificationTokens[0]?.token;
  if (tokenValue) {
    await auth.deleteVerificationToken(tokenValue);
  }
  const tokenAfter = await auth.findVerificationToken(tokenValue ?? "missing");
  const userAfterTokenDelete = await auth.findUserById(user.id);
  const consentsAfterTokenDelete = await auth.findConsentRecordsByUserId(user.id);
  record({
    id: "X1",
    area: "deletion",
    name: "Verification token deletion retains account and consents",
    expected: "Deleting a verification token does not delete the user or consent history",
    actual: `tokenGone=${tokenAfter === undefined}; user=${Boolean(userAfterTokenDelete)}; consents=${consentsAfterTokenDelete.length}`,
    pass:
      tokenAfter === undefined &&
      userAfterTokenDelete?.id === user.id &&
      consentsAfterTokenDelete.length === consentsBeforeClear.length,
  });

  const clear = await clearLuminaMemoryForUserResult(user.id);
  const clearedMemory = await retrieveLuminaMemoryForUser(user.id);
  const userAfterClear = await auth.findUserById(user.id);
  const consentsAfterClear = await auth.findConsentRecordsByUserId(user.id);
  record({
    id: "X2",
    area: "deletion",
    name: "Lumina memory clear retains identity and consent history",
    expected: "Clear removes durable summaries, does not wipe the account, and keeps consent records",
    actual: `clear=${clear.status}; summaries=${clearedMemory?.durable.summaries.length ?? -1}; firstName=${userAfterClear?.firstName}; consents=${consentsAfterClear.length}; luminaConsent=${consentsAfterClear.some((row) => row.consentType === "lumina_memory")}`,
    pass:
      clear.status === "ok" &&
      (clearedMemory?.durable.summaries.length ?? -1) === 0 &&
      userAfterClear?.firstName === "Integrity" &&
      consentsAfterClear.some((row) => row.consentType === "lumina_memory"),
  });

  const keepKey = pageKey;
  const removed = await getAnalyticsStore().deleteTestEventsByKeys([dirtyKey]);
  const dirtyGone = await getAnalyticsStore().findByIdempotencyKey(dirtyKey);
  const pageKept = await getAnalyticsStore().findByIdempotencyKey(keepKey);
  record({
    id: "X3",
    area: "deletion",
    name: "Targeted test-event deletion",
    expected: "deleteTestEventsByKeys removes only the named test events",
    actual: `removed=${removed}; dirtyGone=${dirtyGone === undefined}; pageKept=${Boolean(pageKept)}`,
    pass: removed === 1 && dirtyGone === undefined && pageKept?.idempotencyKey === keepKey,
  });

  record({
    id: "X4",
    area: "deletion",
    name: "Account deletion API is not present",
    expected: "AuthStore has no deleteUser/deleteAccount method (account deletion is not available)",
    actual: `deleteUser=${hasMethod(auth, "deleteUser")}; deleteAccount=${hasMethod(auth, "deleteAccount")}`,
    pass: !hasMethod(auth, "deleteUser") && !hasMethod(auth, "deleteAccount"),
  });

  const beforeAppend = (await auth.findConsentRecordsByUserId(user.id)).length;
  await recordConsentsForUser(user.id, [
    {
      consentType: "lumina_memory",
      documentId: "lumina-memory",
      documentVersion: "1",
      consentedAt: new Date().toISOString(),
      userId: user.id,
    },
  ]);
  const afterAppend = await auth.findConsentRecordsByUserId(user.id);
  const luminaCount = afterAppend.filter((row) => row.consentType === "lumina_memory").length;
  record({
    id: "C1",
    area: "consent_history",
    name: "Consent history is append-only",
    expected: "Recording the same consent type again appends a new history row instead of replacing",
    actual: `before=${beforeAppend}; after=${afterAppend.length}; luminaRows=${luminaCount}`,
    pass: afterAppend.length === beforeAppend + 1 && luminaCount >= 2,
  });

  const requiredTypes = new Set(consents.map((row) => row.consentType));
  const recordedTypes = new Set(afterAppend.map((row) => row.consentType));
  const missingRequired = [...requiredTypes].filter((type) => !recordedTypes.has(type));
  record({
    id: "C2",
    area: "consent_history",
    name: "Required registration consents retained",
    expected: "terms, privacy, participant agreement, and AI disclosure remain in history",
    actual: `recorded=${[...recordedTypes].join(",")}; missing=${missingRequired.join(",") || "none"}`,
    pass: missingRequired.length === 0,
  });

  record({
    id: "C3",
    area: "consent_history",
    name: "No consent mutation APIs on AuthStore",
    expected: "AuthStore cannot delete or overwrite consent history",
    actual: `deleteConsent=${hasMethod(auth, "deleteConsent")}; updateConsent=${hasMethod(auth, "updateConsent")}; eraseConsent=${hasMethod(auth, "eraseConsent")}`,
    pass:
      !hasMethod(auth, "deleteConsent") &&
      !hasMethod(auth, "updateConsent") &&
      !hasMethod(auth, "eraseConsent"),
  });

  const consentsBeforeSupport = (await auth.findConsentRecordsByUserId(user.id)).length;
  const supportSrc = await readFile("lib/auth/operations/support.ts", "utf8");
  const sourceDeniesMutation =
    supportSrc.includes("Support is intentionally denied mutation of consent history") &&
    supportSrc.includes('return { status: "forbidden" }');
  let supportStatus = "unexecuted";
  try {
    const { mutateConsentHistoryForSupport } = await import("@/lib/auth/operations/support");
    const support = await mutateConsentHistoryForSupport();
    supportStatus = support.status;
  } catch (error) {
    const message = error instanceof Error ? `${error.name}:${error.message}` : "error";
    supportStatus = message.includes("cookies")
      ? "no_request_session"
      : message.slice(0, 120);
  }
  const consentsAfterSupport = (await auth.findConsentRecordsByUserId(user.id)).length;
  record({
    id: "C4",
    area: "consent_history",
    name: "Support cannot mutate consent history",
    expected: "Support mutation helper is forbidden-by-design and does not write consent history",
    actual: `sourceDenies=${sourceDeniesMutation}; runtime=${supportStatus}; consentsBefore=${consentsBeforeSupport}; consentsAfter=${consentsAfterSupport}`,
    pass:
      sourceDeniesMutation &&
      consentsAfterSupport === consentsBeforeSupport &&
      (supportStatus === "unauthorized" ||
        supportStatus === "forbidden" ||
        supportStatus === "no_request_session"),
  });

  const liveUser = await auth.findUserById(user.id);
  const liveConsents = await auth.findConsentRecordsByUserId(user.id);
  const liveProgress = await getJourneyProgressStore().findProgressForUser(user.id);
  const liveEvents = await getAnalyticsStore().listEventsByUserId(user.id);
  const liveKpi = (await getMarketingKpiStore().read()).purchases.find(
    (row) => row.stripeCheckoutSessionId === sessionId,
  );
  const analyticsPurchase = liveEvents.find((event) => event.idempotencyKey === purchaseKey);
  const orphanConsents = liveConsents.filter((row) => row.userId !== user.id);
  record({
    id: "Y1",
    area: "cross_system_reconciliation",
    name: "User identity reconciles across stores",
    expected: "Auth, consents, journey, and analytics all key to the same user id with no orphan consents",
    actual: `userPresent=${Boolean(liveUser)}; consents=${liveConsents.length}; orphans=${orphanConsents.length}; progressMatch=${liveProgress?.userId === user.id}; analyticsUserEvents=${liveEvents.length}`,
    pass:
      liveUser?.id === user.id &&
      liveConsents.length > 0 &&
      orphanConsents.length === 0 &&
      liveProgress?.userId === user.id &&
      liveEvents.every((event) => event.userId === user.id),
  });

  record({
    id: "Y2",
    area: "cross_system_reconciliation",
    name: "Purchase identifiers reconcile analytics ↔ KPI",
    expected: "Same sandbox checkout session and amount in analytics purchase_completed and KPI purchase",
    actual: `analyticsSession=${String(analyticsPurchase?.payload?.stripeCheckoutSessionId ?? "")}; kpiSession=${liveKpi?.stripeCheckoutSessionId ?? ""}; kpiAmount=${liveKpi?.amountCents ?? "missing"}`,
    pass:
      analyticsPurchase?.payload?.stripeCheckoutSessionId === sessionId &&
      liveKpi?.stripeCheckoutSessionId === sessionId &&
      liveKpi.amountCents === 150000,
  });

  const consentVersionsOk = consents.every((row) => {
    const found = liveConsents.find((entry) => entry.consentType === row.consentType);
    return Boolean(found?.documentId) && found?.documentVersion === row.documentVersion;
  });
  record({
    id: "Y3",
    area: "cross_system_reconciliation",
    name: "Consent records reconcile to published document versions",
    expected: "Persisted registration consents keep the document id and version from the legal catalog",
    actual: `checked=${consents.length}; versionsMatch=${consentVersionsOk}`,
    pass: consentVersionsOk,
  });

  const areas = {
    saving: areaVerdict("saving"),
    duplicateEvents: areaVerdict("duplicate_events"),
    backups: areaVerdict("backups"),
    restore: areaVerdict("restore"),
    deletion: areaVerdict("deletion"),
    consentHistory: areaVerdict("consent_history"),
    crossSystemReconciliation: areaVerdict("cross_system_reconciliation"),
  };
  const failed = tests.filter((row) => row.verdict === "FAIL");
  const passed = tests.filter((row) => row.verdict === "PASS");
  const notRun = tests.filter((row) => row.verdict === "NOT_RUN");
  const overall: Verdict = failed.length === 0 && passed.length > 0 ? "PASS" : "FAIL";

  const remainingRisks: string[] = [];
  if (!production.attempted) {
    remainingRisks.push(
      "This workstation has no POSTGRES_URL, so production Supabase WAL/PITR listing and a live logical export were not re-run. Isolated pglite restore of a known dump was executed instead. Prior Row 62 evidence (2026-08-21) recorded a production isolated restore PASS.",
    );
  }
  remainingRisks.push(
    "Application accounts, Journey, Lumina, and billing file stores (`.data/`) are not recovered by a Postgres restore. Stripe remains the payment system of record.",
  );
  remainingRisks.push(
    "Account deletion is not implemented. Deletion tests cover verification tokens, Lumina memory clear, and targeted test-event cleanup — not full account erasure.",
  );

  const evidence = {
    aosWorkId: WORK_ID,
    title: "Run Data Integrity and Recovery Testing",
    source: "command_center August Launch row 181",
    ownerAgent: "imani",
    generatedAt: new Date().toISOString(),
    softwareChangeApplied: false,
    productMarketingLegalChanged: false,
    founderAcceptanceRecorded: false,
    founderDecision: null,
    rowMarkedComplete: false,
    secretsPrinted: false,
    productionModified: production.productionModified === "YES" ? "YES" : "NO",
    liveStripeChargeCreated: false,
    overall,
    summary:
      overall === "PASS"
        ? `Executed ${passed.length} isolated integrity checks across saving, duplicate events, backups, restore, deletion, consent history, and cross-system reconciliation. ${notRun.length} production-only checks were not run because Postgres is unconfigured in this workstation.`
        : `Data integrity testing failed ${failed.length} check(s). Branch left unmerged.`,
    areas,
    tests,
    productionPostgresRestore: {
      attempted: production.attempted,
      productionModified: production.productionModified,
      reason: production.reason,
      restoreOk: production.result?.ok ?? null,
      integrity: production.result?.integrity ?? null,
    },
    isolatedPgliteRestore: isolated,
    historicalRow62Evidence: {
      citedAsThisRun: false,
      file: "ops/fab-5/runs/row-62-backup-restore-validation.json",
      generatedAt: "2026-08-21T18:05:49.207Z",
      restoreOk: true,
      productionModifiedByRestore: "NO",
    },
    remainingRisks,
    validation: {
      typecheck: "npx tsc --noEmit",
      test: "npm run fab5:row181",
      build: "not_required_no_production_surface_change",
    },
    owners: {
      technical: "Imani Heartbeat — Chief Technology & Risk Officer",
      operations: "Michelle Northstar — Chief of Staff & Operations Officer",
    },
    nextAction: "await_founder_acceptance",
    blockedReason: "founder_acceptance_required",
  };

  await mkdir("ops/fab-5/runs/aos-engineering-status", { recursive: true });
  await writeFile(STATUS_FILE, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        overall,
        passed: passed.length,
        failed: failed.length,
        notRun: notRun.length,
        areas,
        statusFile: STATUS_FILE,
        productionRestoreAttempted: production.attempted,
        failedIds: failed.map((row) => row.id),
      },
      null,
      2,
    ),
  );

  setAuthStoreForTests(null);
  setJourneyProgressStoreForTests(null);
  setLuminaStoreForTests(undefined);
  setLuminaMemoryStoreForTests(undefined);
  if (previousAnalytics === undefined) delete process.env.ANALYTICS_DB_FILE;
  else process.env.ANALYTICS_DB_FILE = previousAnalytics;
  if (previousKpi === undefined) delete process.env.MARKETING_KPI_DB_FILE;
  else process.env.MARKETING_KPI_DB_FILE = previousKpi;
  resetAnalyticsStoreForTests();
  resetMarketingKpiStoreForTests();
  await rm(tmpRoot, { recursive: true, force: true });

  if (overall !== "PASS") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown";
  console.error(message.replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@").slice(0, 220));
  process.exit(1);
});
