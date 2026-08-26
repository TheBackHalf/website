/**
 * Mechanical Row 176 / AOS al-176 validation.
 * Seeds disposable English/Spanish, new/returning, paid/installment,
 * incomplete/complete, support, and admin test accounts into isolated file stores.
 * Does not mark the row Complete. Does not record Founder acceptance.
 * Does not print passwords. Does not write production data.
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { INSTALLMENTS_OFFERED_AT_LAUNCH } from "@/lib/billing/installments";
import { createFileBillingStore } from "@/lib/billing/store";
import { createFileAuthStore } from "@/lib/auth/store";
import { roleHasPermission } from "@/lib/auth/permissions";
import { createFileChapter1Store } from "@/lib/journey/chapters/store";
import { createFileJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import { createFileJourneyProgressStore } from "@/lib/journey/progress/store";
import { createFileSupportStore } from "@/lib/support/store";
import {
  LAUNCH_TEST_ACCOUNTS,
  launchTestAccountCoverage,
  seedLaunchTestAccounts,
} from "@/lib/qa/launch-test-accounts";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

function mark(ok: boolean): Verdict {
  return ok ? "PASS" : "FAIL";
}

async function main() {
  const tests: TestRow[] = [];
  const push = (id: string, name: string, ok: boolean, detail: string) => {
    tests.push({ id, name, result: mark(ok), detail });
  };

  const coverage = launchTestAccountCoverage();
  push(
    "coverage",
    "Catalog covers English/Spanish, new/returning, paid/installment, incomplete/complete, support, and admin",
    coverage.ok,
    coverage.ok
      ? `covered=${coverage.covered.join(",")}`
      : `missing=${coverage.missing.join(",")}`,
  );

  push(
    "installment-policy",
    "Launch policy does not offer installments",
    INSTALLMENTS_OFFERED_AT_LAUNCH === false,
    `INSTALLMENTS_OFFERED_AT_LAUNCH=${INSTALLMENTS_OFFERED_AT_LAUNCH}`,
  );

  const exampleEmails = LAUNCH_TEST_ACCOUNTS.every((account) =>
    account.email.endsWith("@example.com"),
  );
  push(
    "example-emails",
    "All test accounts use example.com mailboxes",
    exampleEmails,
    exampleEmails ? "all @example.com" : "non-example mailbox present",
  );

  const tmp = await mkdtemp(path.join(os.tmpdir(), "qa176-"));
  const auth = createFileAuthStore({ dataDir: path.join(tmp, "auth") });
  const billing = createFileBillingStore({
    dataDir: path.join(tmp, "billing"),
    skipKpiMirror: true,
  });
  const onboarding = createFileJourneyOnboardingStore({
    dataDir: path.join(tmp, "journey"),
  });
  const progress = createFileJourneyProgressStore({
    dataDir: path.join(tmp, "journey"),
  });
  const chapter1 = createFileChapter1Store({ dataDir: path.join(tmp, "journey") });
  process.env.SUPPORT_DB_FILE = path.join(tmp, "support", "tickets.json");
  const support = createFileSupportStore("file_test_override");

  const password = `Qa176!${randomBytes(8).toString("hex")}`;
  let seedError: string | null = null;
  let seeded:
    | Awaited<ReturnType<typeof seedLaunchTestAccounts>>
    | null = null;
  try {
    seeded = await seedLaunchTestAccounts({
      password,
      allowPostgres: false,
      auth,
      billing,
      onboarding,
      progress,
      chapter1,
      support,
    });
  } catch (error) {
    seedError = error instanceof Error ? error.message : "seed_failed";
  }

  push(
    "isolated-seed",
    "Seed succeeds against isolated file stores",
    Boolean(seeded) && !seedError,
    seedError ?? `accounts=${seeded?.accounts.length ?? 0} tmp=${tmp}`,
  );

  push(
    "no-production-write",
    "Seed reports productionWrite=false",
    seeded?.productionWrite === false,
    `productionWrite=${String(seeded?.productionWrite)}`,
  );

  const byId = new Map((seeded?.accounts ?? []).map((account) => [account.id, account]));

  const expectAccount = (
    id: string,
    check: (account: NonNullable<typeof seeded>["accounts"][number]) => boolean,
    name: string,
    detail: (account: NonNullable<typeof seeded>["accounts"][number] | undefined) => string,
  ) => {
    const account = byId.get(id);
    push(id, name, Boolean(account) && check(account!), detail(account));
  };

  expectAccount(
    "qa176-en-new-unpaid",
    (account) =>
      account.locale === "en" &&
      account.lifecycle === "new" &&
      account.payment === "none" &&
      account.progress === "incomplete" &&
      !account.emailVerified &&
      !account.journeyAccess &&
      account.onboardingStatus === "in_progress",
    "English new unpaid incomplete architect",
    (account) =>
      `locale=${account?.locale} verified=${account?.emailVerified} access=${account?.journeyAccess} onboarding=${account?.onboardingStatus}`,
  );

  expectAccount(
    "qa176-es-new-unpaid",
    (account) =>
      account.locale === "es" &&
      account.lifecycle === "new" &&
      !account.emailVerified &&
      !account.journeyAccess,
    "Spanish new unpaid incomplete architect",
    (account) =>
      `locale=${account?.locale} verified=${account?.emailVerified} access=${account?.journeyAccess}`,
  );

  expectAccount(
    "qa176-en-returning-paid-incomplete",
    (account) =>
      account.locale === "en" &&
      account.lifecycle === "returning" &&
      account.payment === "paid" &&
      account.progress === "incomplete" &&
      account.emailVerified &&
      account.journeyAccess &&
      account.chapter1Status === "in_progress",
    "English returning paid incomplete",
    (account) =>
      `paid=${account?.payment} chapter1=${account?.chapter1Status} access=${account?.journeyAccess}`,
  );

  expectAccount(
    "qa176-es-returning-paid-incomplete",
    (account) =>
      account.locale === "es" &&
      account.payment === "paid" &&
      account.progress === "incomplete" &&
      account.journeyAccess &&
      account.chapter1Status === "in_progress",
    "Spanish returning paid incomplete",
    (account) =>
      `locale=${account?.locale} chapter1=${account?.chapter1Status} access=${account?.journeyAccess}`,
  );

  expectAccount(
    "qa176-en-returning-paid-complete",
    (account) =>
      account.locale === "en" &&
      account.payment === "paid" &&
      account.progress === "complete" &&
      account.journeyAccess &&
      account.chapter1Status === "completed" &&
      account.onboardingStatus === "completed",
    "English returning paid complete",
    (account) =>
      `chapter1=${account?.chapter1Status} onboarding=${account?.onboardingStatus}`,
  );

  expectAccount(
    "qa176-es-returning-paid-complete",
    (account) =>
      account.locale === "es" &&
      account.payment === "paid" &&
      account.progress === "complete" &&
      account.journeyAccess &&
      account.chapter1Status === "completed",
    "Spanish returning paid complete",
    (account) =>
      `locale=${account?.locale} chapter1=${account?.chapter1Status}`,
  );

  expectAccount(
    "qa176-en-installment-not-offered",
    (account) =>
      account.payment === "installment_not_offered" &&
      !account.journeyAccess &&
      !account.installmentEntitlementPresent,
    "English installment case has no installment entitlement",
    (account) =>
      `payment=${account?.payment} access=${account?.journeyAccess} installmentPresent=${account?.installmentEntitlementPresent}`,
  );

  expectAccount(
    "qa176-es-installment-not-offered",
    (account) =>
      account.locale === "es" &&
      account.payment === "installment_not_offered" &&
      !account.installmentEntitlementPresent,
    "Spanish installment case has no installment entitlement",
    (account) =>
      `locale=${account?.locale} installmentPresent=${account?.installmentEntitlementPresent}`,
  );

  expectAccount(
    "qa176-en-support",
    (account) =>
      account.role === "support" &&
      roleHasPermission("support", "support:ops:access") &&
      !roleHasPermission("support", "admin:ops:access"),
    "English support operator role",
    (account) => `role=${account?.role}`,
  );

  expectAccount(
    "qa176-es-support",
    (account) => account.role === "support" && account.locale === "es",
    "Spanish support operator role",
    (account) => `role=${account?.role} locale=${account?.locale}`,
  );

  expectAccount(
    "qa176-en-admin",
    (account) =>
      account.role === "admin" &&
      roleHasPermission("admin", "admin:ops:access") &&
      roleHasPermission("admin", "admin:roles:assign"),
    "Admin operator role",
    (account) => `role=${account?.role}`,
  );

  const tickets = seeded ? await support.list({ includeTest: true }) : [];
  push(
    "support-tickets",
    "Disposable EN/ES support tickets seeded as test records",
    tickets.length === 2 && tickets.every((ticket) => ticket.test === true),
    `tickets=${tickets.map((ticket) => ticket.id).join(",") || "none"}`,
  );

  const hostedBlocked = process.env.VERCEL !== "1";
  push(
    "hosted-guard",
    "This validation run is not a Vercel hosted production write",
    hostedBlocked,
    `VERCEL=${process.env.VERCEL ?? ""} VERCEL_ENV=${process.env.VERCEL_ENV ?? ""}`,
  );

  const failed = tests.filter((test) => test.result === "FAIL").length;
  const report = {
    generatedAt: new Date().toISOString(),
    aosWorkId: "al-176",
    source: "command_center",
    sourceReference: "August Launch row 176",
    excelRow: 177,
    deliverable: "Create Test Accounts and Data",
    operatingAgent: "imani",
    founderAcceptanceRecorded: false,
    rowMarkedComplete: false,
    secretsPrinted: false,
    productionWrite: false,
    installmentsOfferedAtLaunch: INSTALLMENTS_OFFERED_AT_LAUNCH,
    catalog: LAUNCH_TEST_ACCOUNTS.map((account) => ({
      id: account.id,
      email: account.email,
      locale: account.locale,
      lifecycle: account.lifecycle,
      payment: account.payment,
      progress: account.progress,
      role: account.role,
    })),
    coverage,
    tests,
    summary: {
      pass: tests.filter((test) => test.result === "PASS").length,
      fail: failed,
      total: tests.length,
    },
    overall: failed === 0 ? "PASS" : "FAIL",
    nextAction:
      failed === 0
        ? "await_founder_acceptance"
        : "fix_launch_test_account_seed",
    blockedReason:
      failed === 0 ? "founder_acceptance_required" : "validation_failed",
    notes: [
      "Installment cases exist so testers can confirm installments are not offered at launch.",
      "Passwords are not stored in git. Local seed requires LAUNCH_QA_PASSWORD.",
      "Hosted Vercel seed is blocked. Isolated file stores were used for this validation.",
      "Do not merge as silent completion. Founder acceptance stays with Kimberly Walker (human).",
    ],
  };

  const statusDir = path.join("ops/fab-5/runs/aos-engineering-status");
  await mkdir(statusDir, { recursive: true });
  const statusPath = path.join(statusDir, "al-176.json");
  await writeFile(statusPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`wrote ${statusPath}`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
