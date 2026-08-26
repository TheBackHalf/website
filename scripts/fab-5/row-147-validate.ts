/**
 * Mechanical Row 147 validation. Does not mark the row Complete.
 * Does not mark Founder acceptance. Does not send live participant mail
 * when SMTP is unset; delivery is recorded as skipped_not_configured.
 */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { resetAnalyticsStoreForTests } from "@/lib/analytics/store";
import { createFileAuthStore } from "@/lib/auth/store/file-store";
import { setAuthStoreForTests } from "@/lib/auth/store/runtime";
import { createFileJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import { createEmptyOnboardingRecord } from "@/lib/journey/onboarding/types";
import {
  createFileJourneyProgressStore,
  setJourneyProgressStoreForTests,
} from "@/lib/journey/progress/store";
import {
  billingTemplateToAutomationId,
  catalogCoversAllFamilies,
  catalogIdsMatchType,
  LIFECYCLE_AUTOMATIONS,
  LIFECYCLE_AUTOMATION_IDS,
  LIFECYCLE_FAMILIES,
} from "@/lib/lifecycle";
import { dispatchLifecycleAutomation } from "@/lib/lifecycle/dispatch";
import { runInactivityScan } from "@/lib/lifecycle/inactivity";
import {
  buildLifecycleMessage,
  lifecycleMessageContainsPiiLeak,
} from "@/lib/lifecycle/messages";
import { sanitizeLifecyclePayload } from "@/lib/lifecycle/privacy";
import {
  getLifecycleStore,
  resetLifecycleStoreForTests,
} from "@/lib/lifecycle/store";
import { sendSupportAcknowledgment } from "@/lib/support/acknowledge";

type Verdict = "PASS" | "FAIL";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

async function main() {
  const tests: Array<{
    id: string;
    name: string;
    result: Verdict;
    detail: string;
  }> = [];

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "row147-"));
  const lifecycleDb = path.join(tmpDir, "lifecycle.json");
  process.env.LIFECYCLE_DB_FILE = lifecycleDb;
  process.env.ANALYTICS_DB_FILE = path.join(tmpDir, "analytics.json");
  process.env.NEXT_PUBLIC_SITE_URL = "https://thebackhalf.org";
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  delete process.env.SMTP_FROM;
  resetLifecycleStoreForTests();
  resetAnalyticsStoreForTests();

  const auth = createFileAuthStore({ dataDir: path.join(tmpDir, "auth") });
  setAuthStoreForTests(auth);
  const user = await auth.createUser({
    email: "architect.row147@example.com",
    firstName: "Jordan",
    lastName: "Architect",
    authProvider: "email",
    arcCode: "ARC147TEST",
    emailVerified: true,
    locale: "en",
    passwordHash: "not-a-real-hash",
  });

  const progressStore = createFileJourneyProgressStore({
    dataDir: path.join(tmpDir, "journey"),
    fileName: "progress.json",
  });
  setJourneyProgressStoreForTests(progressStore);

  tests.push({
    id: "T1",
    name: "CATALOG FAMILIES",
    result: mark(catalogCoversAllFamilies() && catalogIdsMatchType()),
    detail: `families=${LIFECYCLE_FAMILIES.join(",")} automations=${LIFECYCLE_AUTOMATION_IDS.length}`,
  });

  const familyCounts = Object.fromEntries(
    LIFECYCLE_FAMILIES.map((family) => [
      family,
      LIFECYCLE_AUTOMATIONS.filter((entry) => entry.family === family).length,
    ]),
  );
  tests.push({
    id: "T2",
    name: "EACH FAMILY CONNECTED",
    result: mark(LIFECYCLE_FAMILIES.every((family) => (familyCounts[family] ?? 0) > 0)),
    detail: JSON.stringify(familyCounts),
  });

  const dirty = sanitizeLifecyclePayload({
    chapterId: "chapter-1",
    email: "secret@example.com",
    token: "abc",
    password: "nope",
    offerId: "blueprint",
  });
  tests.push({
    id: "T3",
    name: "PAYLOAD PRIVACY",
    result: mark(
      dirty?.chapterId === "chapter-1" &&
        dirty?.offerId === "blueprint" &&
        dirty?.email === undefined &&
        dirty?.token === undefined &&
        dirty?.password === undefined,
    ),
    detail: JSON.stringify(dirty),
  });

  const chapterMsg = buildLifecycleMessage({
    automationId: "progress.chapter_completed",
    locale: "en",
    firstName: "Jordan",
    payload: { chapterId: "chapter-1" },
  });
  const inactivityMsg = buildLifecycleMessage({
    automationId: "inactivity.journey_nudge",
    locale: "es",
    firstName: "Jordan",
    payload: { chapterId: "chapter-2" },
  });
  const completionMsg = buildLifecycleMessage({
    automationId: "completion.journey_completed",
    locale: "en",
    firstName: "Jordan",
    payload: { chapterId: "chapter-7" },
  });
  tests.push({
    id: "T4",
    name: "NEW EMAIL COPY",
    result: mark(
      Boolean(chapterMsg?.text.includes("https://thebackhalf.org/architect/journey/chapter-2")) &&
        Boolean(inactivityMsg?.text.includes("/es/architect/journey/chapter-2")) &&
        Boolean(completionMsg?.text.includes("/architect/dashboard")) &&
        !lifecycleMessageContainsPiiLeak(chapterMsg?.text ?? "") &&
        !lifecycleMessageContainsPiiLeak(inactivityMsg?.text ?? ""),
    ),
    detail: `chapter=${chapterMsg?.subject} inactivity=${inactivityMsg?.subject}`,
  });

  const verified = await dispatchLifecycleAutomation({
    automationId: "account.verified",
    userId: user.id,
    idempotencyKey: `lifecycle:account.verified:${user.id}`,
    existingDelivery: { status: "recorded_existing", detail: "test" },
    payload: { method: "email", source: "test" },
    test: true,
  });
  tests.push({
    id: "T5",
    name: "ACCOUNT VERIFIED LEDGER",
    result: mark(verified.status === "recorded_existing"),
    detail: `status=${verified.status}`,
  });

  const payment = await dispatchLifecycleAutomation({
    automationId: "payment.confirmed",
    userId: user.id,
    idempotencyKey: `lifecycle:payment.confirmed:evt_test_147`,
    existingDelivery: { status: "sent" },
    payload: { offerId: "blueprint", source: "test" },
    test: true,
  });
  const paymentFailed = await dispatchLifecycleAutomation({
    automationId: "payment.failed",
    userId: user.id,
    idempotencyKey: `lifecycle:payment.failed:evt_test_147`,
    existingDelivery: { status: "sent" },
    payload: { offerId: "community", source: "test" },
    test: true,
  });
  tests.push({
    id: "T6",
    name: "PAYMENT TRIGGERS",
    result: mark(
      payment.status === "recorded_existing" &&
        paymentFailed.status === "recorded_existing" &&
        billingTemplateToAutomationId("payment_success") === "payment.confirmed" &&
        billingTemplateToAutomationId("refund_notice") === "payment.refunded",
    ),
    detail: `confirmed=${payment.status} failed=${paymentFailed.status}`,
  });

  const chapter = await progressStore.upsertProgress({
    userId: user.id,
    chapterId: "chapter-1",
    status: "chapter_completed",
  });
  const chapterRows = await getLifecycleStore().listByUserId(user.id);
  const chapterHit = chapterRows.find((row) => row.automationId === "progress.chapter_completed");
  tests.push({
    id: "T7",
    name: "PROGRESS CHAPTER COMPLETE",
    result: mark(
      chapter.status === "chapter_completed" &&
        chapterHit?.status === "skipped_not_configured",
    ),
    detail: `progress=${chapter.status} dispatch=${chapterHit?.status ?? "missing"}`,
  });

  const onboardingStore = createFileJourneyOnboardingStore({
    dataDir: path.join(tmpDir, "onboarding"),
  });
  const empty = createEmptyOnboardingRecord(user.id);
  const completed = {
    ...empty,
    status: "completed" as const,
    currentStep: "completed" as const,
    completedSteps: [...empty.completedSteps, "awakening" as const],
  };
  await onboardingStore.saveOnboarding(completed);
  const onboardingHit = (await getLifecycleStore().listByUserId(user.id)).find(
    (row) => row.automationId === "progress.onboarding_completed",
  );
  tests.push({
    id: "T8",
    name: "PROGRESS ONBOARDING COMPLETE",
    result: mark(onboardingHit?.status === "skipped_not_configured"),
    detail: `dispatch=${onboardingHit?.status ?? "missing"}`,
  });

  const stale = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const inactiveUser = await auth.createUser({
    email: "inactive.row147@example.com",
    firstName: "Riley",
    lastName: "Architect",
    authProvider: "email",
    arcCode: "ARC147INACT",
    emailVerified: true,
    locale: "en",
  });
  const inactiveProgress = createFileJourneyProgressStore({
    dataDir: path.join(tmpDir, "inactive"),
    fileName: "progress.json",
  });
  await inactiveProgress.upsertProgress({
    userId: inactiveUser.id,
    chapterId: "chapter-3",
    status: "in_progress",
  });
  const listed = await inactiveProgress.listProgress();
  const record = listed[0];
  if (record) {
    record.updatedAt = stale;
    const dbFile = path.join(tmpDir, "inactive", "progress.json");
    await writeFile(
      dbFile,
      JSON.stringify({ records: [record] }, null, 2),
      "utf8",
    );
  }
  setJourneyProgressStoreForTests(
    createFileJourneyProgressStore({
      dataDir: path.join(tmpDir, "inactive"),
      fileName: "progress.json",
    }),
  );
  const scan = await runInactivityScan();
  tests.push({
    id: "T9",
    name: "INACTIVITY SCAN",
    result: mark(scan.eligible >= 1 && scan.skippedNotConfigured + scan.dispatched >= 1),
    detail: JSON.stringify(scan),
  });

  setJourneyProgressStoreForTests(progressStore);
  await progressStore.upsertProgress({
    userId: user.id,
    chapterId: "chapter-7",
    status: "journey_completed",
  });
  const completionHit = (await getLifecycleStore().listByUserId(user.id)).find(
    (row) => row.automationId === "completion.journey_completed",
  );
  tests.push({
    id: "T10",
    name: "COMPLETION TRIGGER",
    result: mark(completionHit?.status === "skipped_not_configured"),
    detail: `dispatch=${completionHit?.status ?? "missing"}`,
  });

  const membership = await dispatchLifecycleAutomation({
    automationId: "membership.activated",
    userId: user.id,
    idempotencyKey: `lifecycle:membership.activated:sub_test_147`,
    existingDelivery: { status: "sent" },
    payload: { offerId: "community", source: "test" },
    test: true,
  });
  const renewed = await dispatchLifecycleAutomation({
    automationId: "membership.renewed",
    userId: user.id,
    idempotencyKey: `lifecycle:membership.renewed:in_test_147`,
    payload: { offerId: "community", stripeInvoiceId: "in_test_147", source: "test" },
    test: true,
  });
  tests.push({
    id: "T11",
    name: "MEMBERSHIP TRIGGERS",
    result: mark(
      membership.status === "recorded_existing" &&
        (renewed.status === "skipped_not_configured" || renewed.status === "sent") &&
        billingTemplateToAutomationId("subscription_canceled") === "membership.canceled",
    ),
    detail: `activated=${membership.status} renewed=${renewed.status}`,
  });

  const pastDue = await dispatchLifecycleAutomation({
    automationId: "billing.past_due",
    userId: user.id,
    idempotencyKey: `lifecycle:billing.past_due:sub_test_147`,
    payload: { offerId: "community", stripeSubscriptionId: "sub_test_147", source: "test" },
    test: true,
  });
  tests.push({
    id: "T12",
    name: "BILLING PAST DUE",
    result: mark(pastDue.status === "skipped_not_configured" || pastDue.status === "sent"),
    detail: `status=${pastDue.status}`,
  });

  const support = await sendSupportAcknowledgment({
    ticketId: "BH-S-20260826-R147",
    requesterName: "Jordan",
    requesterEmail: user.email,
    priority: "P3",
  });
  const supportHit = (await getLifecycleStore().listByUserId(user.id)).find(
    (row) => row.automationId === "support.acknowledged",
  );
  tests.push({
    id: "T13",
    name: "SUPPORT ACKNOWLEDGMENT",
    result: mark(
      (support.status === "not_configured" || support.status === "sent" || support.status === "failed") &&
        Boolean(supportHit),
    ),
    detail: `ack=${support.status} ledger=${supportHit?.status ?? "missing"}`,
  });

  const first = await dispatchLifecycleAutomation({
    automationId: "membership.renewed",
    userId: user.id,
    idempotencyKey: `lifecycle:membership.renewed:in_test_147`,
    payload: { offerId: "community", stripeInvoiceId: "in_test_147", source: "test" },
    test: true,
  });
  tests.push({
    id: "T14",
    name: "IDEMPOTENT RETRY",
    result: mark(first.status === "skipped_duplicate"),
    detail: `status=${first.status}`,
  });

  const cronSource = await readFile("vercel.json", "utf8");
  const cronDeclared = cronSource.includes('"/api/lifecycle/run"');
  const routeExists = existsSync("app/api/lifecycle/run/route.ts");
  tests.push({
    id: "T15",
    name: "CRON ROUTE",
    result: mark(cronDeclared && routeExists),
    detail: `vercel=${cronDeclared} route=${routeExists}`,
  });

  const billingSource = await readFile("lib/billing/notifications.ts", "utf8");
  const verifySource = await readFile("lib/auth/email/send-verification.ts", "utf8");
  const resetSource = await readFile("lib/auth/email/send-password-reset.ts", "utf8");
  const supportSource = await readFile("lib/support/acknowledge.ts", "utf8");
  const syncSource = await readFile("lib/billing/sync-effects.ts", "utf8");
  const progressSource = await readFile("lib/journey/progress/store.ts", "utf8");
  const verifyEmailSource = await readFile("lib/auth/actions/verify-email.ts", "utf8");
  tests.push({
    id: "T16",
    name: "EXISTING SENDERS CONNECTED",
    result: mark(
      billingSource.includes("recordBillingLifecycle") &&
        verifySource.includes("account.verification") &&
        resetSource.includes("account.password_reset") &&
        supportSource.includes("support.acknowledged") &&
        syncSource.includes("membership.renewed") &&
        syncSource.includes("billing.past_due") &&
        progressSource.includes("emitLifecycleFromJourneyProgress") &&
        verifyEmailSource.includes("account.verified"),
    ),
    detail: "verification, password reset, email verified, billing notifications, support ack, renewal, past_due, journey progress",
  });

  const delays = LIFECYCLE_AUTOMATIONS.filter((entry) => entry.delayMs > 0);
  tests.push({
    id: "T17",
    name: "DELAYED INACTIVITY ONLY",
    result: mark(delays.length === 1 && delays[0]?.id === "inactivity.journey_nudge"),
    detail: delays.map((entry) => `${entry.id}:${entry.delayMs}`).join(","),
  });

  const transactional = LIFECYCLE_AUTOMATIONS.every((entry) => entry.transactional);
  tests.push({
    id: "T18",
    name: "TRANSACTIONAL SEPARATION",
    result: mark(transactional),
    detail: "All Row 147 automations are transactional; marketing suppression is a later row",
  });

  const passed = tests.filter((test) => test.result === "PASS").length;
  const payload = {
    row: 147,
    aosWorkId: "al-147",
    runId: `r147-${new Date().toISOString()}`,
    deliverable: "Build Lifecycle Automations",
    founderAcceptance: null,
    founderAccepted: false,
    rowMarkedComplete: false,
    readyForFounderAcceptanceReview: passed === tests.length,
    spec: "ops/fab-5/ROW-147-LIFECYCLE-AUTOMATIONS.md",
    families: familyCounts,
    automations: LIFECYCLE_AUTOMATIONS.map((entry) => ({
      id: entry.id,
      family: entry.family,
      trigger: entry.trigger,
      delayMs: entry.delayMs,
      existingSender: entry.existingSender ?? "lifecycle.dispatch",
    })),
    tests: {
      tested: tests.length,
      passed,
      failed: tests.length - passed,
      result: passed === tests.length ? "PASS" : "FAIL",
    },
    results: tests,
    result: passed === tests.length ? "PASS" : "FAIL",
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-147-lifecycle-automations-validation.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  console.log(
    JSON.stringify(
      { result: payload.result, passed: `${passed}/${tests.length}` },
      null,
      2,
    ),
  );
  if (passed !== tests.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
