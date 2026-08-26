import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

import { hashPassword } from "@/lib/auth/password";
import {
  createFileAuthStore,
  setAuthStoreForTests,
} from "@/lib/auth/store";
import { loginWithEmailAction } from "@/lib/auth/actions/login-email";
import { recordConsentsForUser } from "@/lib/consent/record-consent";
import { createFileLuminaStore, setLuminaStoreForTests } from "@/lib/lumina/store";
import { createLuminaMemoryStore, setLuminaMemoryStoreForTests } from "@/lib/lumina/memory/store";
import {
  createFileJourneyProgressStore,
  setJourneyProgressStoreForTests,
} from "@/lib/journey/progress/store";
import {
  createFileJourneyOnboardingStore,
  setJourneyOnboardingStoreForTests,
} from "@/lib/journey/onboarding/store";
import {
  createFileChapter1Store,
  setChapter1StoreForTests,
} from "@/lib/journey/chapters/store";
import { classifyPrivacyText } from "@/lib/privacy/classify";
import { createPrivacyRequest } from "@/lib/privacy/create-request";
import { listPrivacySystems } from "@/lib/privacy/data-map";
import { fulfillPrivacyRequest } from "@/lib/privacy/fulfill";
import { getPrivacyStore, resetPrivacyStoreForTests } from "@/lib/privacy/store";
import { submitPrivacyRequest } from "@/lib/privacy/submit-request";
import { verifyPrivacyRequestIdentity } from "@/lib/privacy/verify";
import { createSupportTicket } from "@/lib/support/create-ticket";
import { resetSupportStoreForTests } from "@/lib/support/store";
import { resetAnalyticsStoreForTests } from "@/lib/analytics/store";
import { PRIVACY_MAILBOX_ADDRESS, PRIVACY_OWNER_TITLES } from "@/lib/privacy/catalog";

type TestResult = {
  id: string;
  name: string;
  result: "PASS" | "FAIL";
  detail: string;
};

function mark(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

async function main() {
  if (!process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = "row167-validation-auth-secret";
  }
  const tests: TestResult[] = [];
  const root = await mkdtemp(path.join(os.tmpdir(), "row167-privacy-"));
  const stamp = Date.now();
  process.env.PRIVACY_DB_FILE = path.join(root, "privacy.json");
  process.env.SUPPORT_DB_FILE = path.join(root, "support.json");
  process.env.ANALYTICS_DB_FILE = path.join(root, "analytics.json");
  const holdsFile = path.join(root, "holds.json");
  process.env.PRIVACY_LEGAL_HOLDS_FILE = holdsFile;
  writeFileSync(holdsFile, JSON.stringify({ holds: [] }));

  resetPrivacyStoreForTests();
  resetSupportStoreForTests();
  resetAnalyticsStoreForTests();
  setAuthStoreForTests(createFileAuthStore({ dataDir: path.join(root, "auth") }));
  setLuminaStoreForTests(createFileLuminaStore({ dataDir: path.join(root, "lumina") }));
  setLuminaMemoryStoreForTests(createLuminaMemoryStore());
  setJourneyProgressStoreForTests(
    createFileJourneyProgressStore({ dataDir: path.join(root, "journey") }),
  );
  setJourneyOnboardingStoreForTests(
    createFileJourneyOnboardingStore({ dataDir: path.join(root, "journey") }),
  );
  setChapter1StoreForTests(
    createFileChapter1Store({ dataDir: path.join(root, "journey") }),
  );

  const password = "Row167-test-passphrase!";
  const passwordHash = await hashPassword(password);
  const { getAuthStore } = await import("@/lib/auth/store");
  const user = await getAuthStore().createUser({
    email: `row167.architect.${stamp}@example.com`,
    firstName: "Row",
    lastName: "Privacy",
    authProvider: "email",
    arcCode: "ARC-167TST",
    emailVerified: true,
    locale: "en",
    passwordHash,
    ageEligible: true,
    ageEligibleConfirmedAt: new Date().toISOString(),
  });
  await recordConsentsForUser(user.id, [
    {
      consentType: "privacy_policy",
      documentId: "privacy-policy",
      documentVersion: "1.0",
      consentedAt: new Date().toISOString(),
      userId: user.id,
    },
  ]);
  await (await import("@/lib/journey/progress/store"))
    .getJourneyProgressStore()
    .upsertProgress({ userId: user.id, chapterId: "chapter-1", status: "in_progress" });

  const systems = listPrivacySystems();
  tests.push({
    id: "T1",
    name: "Data map has systems, owners, and escalation",
    result: mark(
      systems.length >= 10 &&
        systems.every((system) => system.owner && system.escalation && system.retentionClass) &&
        systems.some((system) => system.id === "auth_accounts" && system.owner === "imani") &&
        systems.some((system) => system.retainOnDeletionRequest),
    ),
    detail: `systems=${systems.length} owners=${[...new Set(systems.map((s) => s.owner))].join(",")}`,
  });

  tests.push({
    id: "T2",
    name: "Incident vs rights classification",
    result: mark(
      classifyPrivacyText(undefined, "breach", "possible data breach exposed accounts").kind ===
        "incident" &&
        classifyPrivacyText(undefined, "delete my account", "please delete my data").kind ===
          "rights",
    ),
    detail: "incident vs deletion classified",
  });

  const created = await createPrivacyRequest({
    requesterName: "Row Privacy",
    requesterEmail: user.email,
    type: "ACCESS",
    subject: "Access my personal information",
    message: "Please send a copy of the information you hold about me.",
    source: "privacy_form",
    test: true,
    acknowledge: false,
  });
  tests.push({
    id: "T3",
    name: "Access request tracks identity pending",
    result: mark(
      created.request.id.startsWith("BH-PR-") &&
        created.request.status === "IDENTITY_PENDING" &&
        created.request.identity.status === "pending" &&
        Boolean(created.verifyToken) &&
        !JSON.stringify(created.request).includes(created.verifyToken ?? "no-token"),
    ),
    detail: `id=${created.request.id} status=${created.request.status}`,
  });

  const verified = await verifyPrivacyRequestIdentity({
    requestId: created.request.id,
    token: created.verifyToken ?? "",
  });
  const accessRequest = verified.request;
  const exportBlob = JSON.stringify(accessRequest);
  tests.push({
    id: "T4",
    name: "Verified access fulfills without secrets",
    result: mark(
      verified.status === "verified" &&
        accessRequest?.status === "FULFILLED" &&
        accessRequest.fulfillment.exportGenerated === true &&
        !exportBlob.includes(passwordHash) &&
        !exportBlob.includes("passwordHash") &&
        accessRequest.assignedOwner === "imani",
    ),
    detail: `status=${accessRequest?.status} owner=${accessRequest?.assignedOwner}`,
  });

  const exportResult = await fulfillPrivacyRequest(created.request.id);
  const pack = JSON.stringify(exportResult.exportPackage ?? {});
  tests.push({
    id: "T5",
    name: "Export package includes account and omits password hash",
    result: mark(
      Boolean(exportResult.exportPackage?.account) &&
        pack.includes(user.email) &&
        !pack.includes(passwordHash) &&
        !("passwordHash" in (exportResult.exportPackage?.account ?? {})) &&
        (exportResult.exportPackage?.omitted ?? []).includes("passwordHash"),
    ),
    detail: `systems=${exportResult.exportPackage?.systems.length ?? 0} omitted=${(exportResult.exportPackage?.omitted ?? []).join(",")}`,
  });

  const correction = await createPrivacyRequest({
    requesterName: "Row Privacy",
    requesterEmail: user.email,
    type: "CORRECTION",
    subject: "Correct my name",
    message: "Please correct my last name.",
    source: "privacy_form",
    correction: { lastName: "Corrected" },
    test: true,
    acknowledge: false,
  });
  await verifyPrivacyRequestIdentity({
    requestId: correction.request.id,
    token: correction.verifyToken ?? "",
  });
  const afterCorrection = await getAuthStore().findUserById(user.id);
  tests.push({
    id: "T6",
    name: "Verified correction updates profile",
    result: mark(afterCorrection?.lastName === "Corrected"),
    detail: `lastName=${afterCorrection?.lastName}`,
  });

  const support = await createSupportTicket({
    requesterName: "Row Privacy",
    requesterEmail: `row167.support.${stamp}@example.com`,
    category: "PRIVACY",
    subject: "Export my data",
    message: "Please export my data. I will not send a password.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  const linked = support.history.some((entry) => entry.type === "privacy_request");
  tests.push({
    id: "T7",
    name: "Support Privacy rights ticket opens tracker request",
    result: mark(support.category === "PRIVACY" && linked),
    detail: `ticket=${support.id} linked=${linked}`,
  });

  const form = await submitPrivacyRequest({
    name: "Inquiry Architect",
    email: `row167.inquiry.${stamp}@example.com`,
    type: "INQUIRY",
    subject: "Privacy question",
    message: "I have a privacy question about retention.",
    locale: "en",
  });
  tests.push({
    id: "T8",
    name: "Public form creates tracked inquiry",
    result: mark(form.status === "received" && Boolean(form.status === "received" && form.requestId.startsWith("BH-PR-"))),
    detail: form.status === "received" ? form.requestId : form.status,
  });

  writeFileSync(
    holdsFile,
    JSON.stringify({
      holds: [{ id: "hold-167", userId: user.id, email: user.email, active: true }],
    }),
  );
  const deletionHeld = await createPrivacyRequest({
    requesterName: "Row Privacy",
    requesterEmail: user.email,
    type: "DELETION",
    subject: "Delete my information",
    message: "Please delete my account and participant content.",
    source: "privacy_form",
    confirmDeletion: true,
    test: true,
    acknowledge: false,
  });
  await verifyPrivacyRequestIdentity({
    requestId: deletionHeld.request.id,
    token: deletionHeld.verifyToken ?? "",
    confirmDeletion: true,
  });
  const held = await getPrivacyStore().get(deletionHeld.request.id);
  const stillPresent = await getAuthStore().findUserByEmail(user.email);
  tests.push({
    id: "T9",
    name: "Legal hold pauses deletion",
    result: mark(
      held?.fulfillment.legalHoldBlocked === true &&
        stillPresent?.id === user.id &&
        !stillPresent.deletedAt,
    ),
    detail: `status=${held?.status} hold=${held?.fulfillment.legalHoldBlocked}`,
  });

  writeFileSync(holdsFile, JSON.stringify({ holds: [] }));
  const deletionResult = await fulfillPrivacyRequest(deletionHeld.request.id, {
    confirmDeletion: true,
  });
  const deletedUser = await getAuthStore().findUserById(user.id);
  const byEmail = await getAuthStore().findUserByEmail(user.email);
  const progress = await (
    await import("@/lib/journey/progress/store")
  )
    .getJourneyProgressStore()
    .findProgressForUser(user.id);
  const consents = await getAuthStore().findConsentRecordsByUserId(user.id);
  const login = await loginWithEmailAction({
    email: user.email,
    password,
    locale: "en",
  });
  tests.push({
    id: "T10",
    name: "Verified deletion anonymizes account and keeps consent audit",
    result: mark(
      Boolean(deletedUser?.deletedAt) &&
        !byEmail &&
        !progress &&
        consents.length > 0 &&
        login.status === "invalid_credentials" &&
        !deletedUser?.passwordHash &&
        (deletionResult.request.status === "PARTIALLY_FULFILLED" ||
          deletionResult.request.status === "FULFILLED"),
    ),
    detail: `deletedAt=${deletedUser?.deletedAt} consents=${consents.length} login=${login.status} status=${deletionResult.request.status}`,
  });

  tests.push({
    id: "T11",
    name: "Mailbox and owners are established",
    result: mark(
      PRIVACY_MAILBOX_ADDRESS === "privacy@thebackhalf.org" &&
        PRIVACY_OWNER_TITLES.imani.includes("Imani") &&
        PRIVACY_OWNER_TITLES.michelle.includes("Michelle") &&
        PRIVACY_OWNER_TITLES.founder === "Founder",
    ),
    detail: PRIVACY_MAILBOX_ADDRESS,
  });

  const failed = tests.filter((test) => test.result === "FAIL");
  const summary = {
    row: 167,
    aosWorkId: "al-167",
    deliverable: "Operationalize Privacy Rights and Data Governance",
    generatedAt: new Date().toISOString(),
    result: failed.length === 0 ? "PASS" : "FAIL",
    tests,
    founderAcceptance: null,
    note: "Operational process implemented. Founder acceptance remains with Kimberly Walker (human).",
  };
  mkdirSync("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-167-privacy-rights-validation.json",
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(summary, null, 2));
  setAuthStoreForTests(null);
  setLuminaStoreForTests(undefined);
  resetPrivacyStoreForTests();
  resetSupportStoreForTests();
  resetAnalyticsStoreForTests();
  await rm(root, { recursive: true, force: true });
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
