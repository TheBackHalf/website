import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { classifyDeliveryError, classifyInboundMessage } from "@/lib/email/classify";
import {
  isAllowedSenderDomain,
  resolveFromAddress,
  TRANSACTIONAL_EMAIL_SENDER_DOMAIN,
} from "@/lib/email/config";
import { ingestBounce } from "@/lib/email/bounce";
import {
  resetEmailStoreForTests,
  getEmailStore,
} from "@/lib/email/store";
import {
  resetTransactionalTransportForTests,
  sendTransactionalEmail,
  setTransactionalTransportForTests,
} from "@/lib/email/send";
import { honorUnsubscribe } from "@/lib/email/unsubscribe";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/email/tokens";
import { ingestInboundEmail } from "@/lib/support/inbound";
import { getDeliverabilitySnapshot } from "@/lib/email/monitor";
import { existsSync, readFileSync } from "node:fs";

type TestResult = {
  id: string;
  name: string;
  result: "PASS" | "FAIL";
  detail: string;
};

function mark(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

function loadLocalEnvNames(names: string[]): void {
  if (!existsSync(".env.local")) return;
  const wanted = new Set(names);
  for (const rawLine of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!wanted.has(key) || process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) process.env[key] = value;
  }
}

async function main() {
  const tests: TestResult[] = [];
  const dir = await mkdtemp(path.join(tmpdir(), "bh-row146-"));
  const dbFile = path.join(dir, "email.json");
  process.env.EMAIL_DB_FILE = dbFile;
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "row146-test-auth-secret";
  process.env.SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
  process.env.SMTP_PORT = process.env.SMTP_PORT || "587";
  process.env.SMTP_USER = process.env.SMTP_USER || "support@thebackhalf.org";
  process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD || "not-a-real-password";
  process.env.SMTP_FROM = process.env.SMTP_FROM || "support@thebackhalf.org";
  process.env.NEXT_PUBLIC_SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://thebackhalf.org";
  resetEmailStoreForTests();
  resetTransactionalTransportForTests();

  loadLocalEnvNames([]);

  tests.push({
    id: "T1",
    name: "SENDER DOMAIN LOCK",
    result: mark(
      TRANSACTIONAL_EMAIL_SENDER_DOMAIN === "thebackhalf.org" &&
        isAllowedSenderDomain("support@thebackhalf.org") &&
        !isAllowedSenderDomain("noreply@gmail.com") &&
        resolveFromAddress("hello@example.com").allowed === false,
    ),
    detail: `domain=${TRANSACTIONAL_EMAIL_SENDER_DOMAIN}`,
  });

  setTransactionalTransportForTests(async () => ({
    status: "sent",
    response: "250 queued",
  }));

  const sent = await sendTransactionalEmail({
    to: "architect@example.com",
    subject: "Verify",
    text: "Auth message",
    category: "auth",
    test: true,
  });
  tests.push({
    id: "T2",
    name: "TRANSACTIONAL SEND RECORDED",
    result: mark(sent.status === "sent"),
    detail: `status=${sent.status}`,
  });

  const bounce = await ingestBounce({
    fromEmail: "mailer-daemon@google.com",
    subject: "Delivery Status Notification (Failure)",
    text: "Final-Recipient: rfc822; bounce.me@example.com\nStatus: 5.1.1",
    source: "row146_test",
    test: true,
  });
  tests.push({
    id: "T3",
    name: "HARD BOUNCE SUPPRESSION",
    result: mark(
      bounce.handled &&
        bounce.kind === "hard_bounce" &&
        bounce.email === "bounce.me@example.com" &&
        bounce.suppressed,
    ),
    detail: `kind=${bounce.kind} email=${bounce.email}`,
  });

  const blocked = await sendTransactionalEmail({
    to: "bounce.me@example.com",
    subject: "Verify",
    text: "Should not send",
    category: "auth",
    test: true,
  });
  tests.push({
    id: "T4",
    name: "SUPPRESSION BLOCKS AUTH AFTER HARD BOUNCE",
    result: mark(blocked.status === "skipped_suppressed"),
    detail: `status=${blocked.status}`,
  });

  const token = createUnsubscribeToken("optout@example.com");
  const verified = verifyUnsubscribeToken(token);
  const unsub = await honorUnsubscribe({
    token,
    source: "row146_test",
    test: true,
  });
  const lifecycle = await sendTransactionalEmail({
    to: "optout@example.com",
    subject: "Lifecycle",
    text: "Should skip",
    category: "lifecycle",
    test: true,
  });
  const authStill = await sendTransactionalEmail({
    to: "optout@example.com",
    subject: "Reset",
    text: "Auth still allowed",
    category: "auth",
    test: true,
  });
  tests.push({
    id: "T5",
    name: "UNSUBSCRIBE BLOCKS LIFECYCLE NOT AUTH",
    result: mark(
      Boolean(token) &&
        verified?.email === "optout@example.com" &&
        unsub.status === "unsubscribed" &&
        lifecycle.status === "skipped_suppressed" &&
        authStill.status === "sent",
    ),
    detail: `lifecycle=${lifecycle.status} auth=${authStill.status}`,
  });

  tests.push({
    id: "T6",
    name: "SMTP ERROR CLASSIFICATION",
    result: mark(
      classifyDeliveryError("550 5.1.1 The email account does not exist") ===
        "hard" &&
        classifyDeliveryError("452 4.2.2 Mailbox full") === "soft" &&
        classifyDeliveryError("Feedback-Type: abuse") === "complaint",
    ),
    detail: "hard/soft/complaint",
  });

  const inbound = await ingestInboundEmail({
    messageId: "<bounce-row146@local>",
    fromName: "Mail Delivery Subsystem",
    fromEmail: "mailer-daemon@googlemail.com",
    to: "support@thebackhalf.org",
    subject: "Undelivered Mail Returned to Sender",
    text: "X-Failed-Recipients: dead.letter@example.com",
    test: true,
  });
  tests.push({
    id: "T7",
    name: "INBOUND BOUNCE DOES NOT CREATE TICKET",
    result: mark(
      inbound.kind === "bounce" &&
        inbound.ticket === null &&
        inbound.bounce.email === "dead.letter@example.com",
    ),
    detail: `kind=${inbound.kind} email=${inbound.kind === "ticket" ? inbound.ticket.id : inbound.bounce.email}`,
  });

  const classified = classifyInboundMessage({
    fromEmail: "architect@example.com",
    subject: "I cannot log in",
    text: "Please help",
  });
  tests.push({
    id: "T8",
    name: "NORMAL INBOUND IS NOT A BOUNCE",
    result: mark(classified.class === "none"),
    detail: `class=${classified.class}`,
  });

  const snapshot = await getDeliverabilitySnapshot({ includeTest: true });
  tests.push({
    id: "T9",
    name: "DELIVERABILITY MONITORING",
    result: mark(
      snapshot.provider === "google_workspace_smtp" &&
        snapshot.senderDomain === "thebackhalf.org" &&
        snapshot.totals.sent >= 2 &&
        snapshot.totals.hardBounces >= 1 &&
        snapshot.totals.unsubscribes >= 1,
    ),
    detail: `sent=${snapshot.totals.sent} bounces=${snapshot.totals.hardBounces} unsub=${snapshot.totals.unsubscribes}`,
  });

  const invalidSender = await sendTransactionalEmail({
    to: "architect@example.com",
    subject: "Nope",
    text: "Foreign domain",
    category: "billing",
    fromAddress: "alerts@not-the-back-half.com",
    test: true,
  });
  tests.push({
    id: "T10",
    name: "FOREIGN FROM REJECTED",
    result: mark(invalidSender.status === "skipped_invalid_sender"),
    detail: `status=${invalidSender.status}`,
  });

  const store = getEmailStore();
  const suppression = await store.getSuppression("bounce.me@example.com");
  tests.push({
    id: "T11",
    name: "SUPPRESSION STORE DURABLE",
    result: mark(suppression?.reason === "hard_bounce"),
    detail: `reason=${suppression?.reason ?? "none"} backend=${store.backend}`,
  });

  resetTransactionalTransportForTests();
  resetEmailStoreForTests();

  const failed = tests.filter((test) => test.result === "FAIL");
  const payload = {
    row: 146,
    deliverable: "Configure Transactional Email",
    generatedAt: new Date().toISOString(),
    result: failed.length === 0 ? "PASS" : "FAIL",
    passed: `${tests.filter((test) => test.result === "PASS").length}/${tests.length}`,
    founderAcceptance: null,
    rowMarkedComplete: false,
    secretsPrinted: false,
    dnsMutated: false,
    tests,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-146-transactional-email-validation.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );

  await rm(dir, { recursive: true, force: true });

  console.log(
    JSON.stringify(
      {
        result: payload.result,
        passed: payload.passed,
        founderAcceptance: null,
      },
      null,
      2,
    ),
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
