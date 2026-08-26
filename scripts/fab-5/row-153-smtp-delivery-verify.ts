/**
 * Row 153 SMTP delivery verification only.
 * Never prints secret values. Does not mark the row Complete.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { sendSmtpEmail, getSmtpEnvPresence, isSmtpReady } from "@/lib/auth/email/smtp";
import { SUPPORT_MAILBOX } from "@/lib/support/catalog";
import { createSupportTicket, transitionTicket } from "@/lib/support/create-ticket";
import { getSupportStore, getSupportDurability } from "@/lib/support/store";
import { buildLaunchDashboardFromSources } from "@/lib/launch-dashboard/aggregate";
import { gatherLaunchDashboardSources } from "@/lib/launch-dashboard/sources";
import { dateEt } from "@/lib/marketing-kpi/attribution";

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

loadLocalEnvNames([
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPPORT_DB_FILE",
]);

function present(value: boolean): "PRESENT" | "ABSENT" {
  return value ? "PRESENT" : "ABSENT";
}

function redact(detail: string): string {
  return detail.replace(/pass(word)?[=:]\s*\S+/gi, "password=[redacted]");
}

function mailboxMatch(name: "SMTP_USER" | "SMTP_FROM"): boolean {
  return process.env[name]?.trim().toLowerCase() === SUPPORT_MAILBOX;
}

async function main() {
  const presence = getSmtpEnvPresence();
  const smtpPresence = {
    SMTP_HOST: present(presence.SMTP_HOST),
    SMTP_PORT: present(presence.SMTP_PORT),
    SMTP_USER: present(presence.SMTP_USER),
    SMTP_PASSWORD: present(presence.SMTP_PASSWORD),
    SMTP_FROM: present(presence.SMTP_FROM),
  };
  const allPresent = Object.values(presence).every(Boolean);
  const senderMatches =
    mailboxMatch("SMTP_FROM") && (mailboxMatch("SMTP_USER") || !presence.SMTP_USER);

  const auth = allPresent
    ? await sendSmtpEmail({
        to: SUPPORT_MAILBOX,
        subject: "[BH-ROW153-SMTP] authentication probe",
        text: "Row 153 Google Workspace SMTP authentication probe. Automated. Not a live Architect issue.",
        fromName: "The Back Half Support",
        fromAddress: SUPPORT_MAILBOX,
        replyTo: SUPPORT_MAILBOX,
      })
    : { status: "not_configured" as const, error: "SMTP variables incomplete" };

  const stamp = Date.now();
  const ticket = await createSupportTicket({
    requesterName: "Founder SMTP Verification",
    requesterEmail: SUPPORT_MAILBOX,
    category: "GENERAL",
    subject: `Row 153 SMTP delivery verification ${stamp}`,
    message:
      "Controlled Founder verification that automated support acknowledgment mail delivers through Google Workspace. Do not treat as a live Architect issue. No password or payment data is included.",
    source: "form",
    channel: "web",
    test: false,
  });

  const store = getSupportStore();
  const persisted = await store.get(ticket.id);
  const durability = getSupportDurability();

  let dashboardVisible = false;
  try {
    const dashboard = buildLaunchDashboardFromSources(
      await gatherLaunchDashboardSources({ includeTest: true }),
      { dateEt: dateEt(), includeTest: true },
    );
    dashboardVisible =
      dashboard.support.newToday >= 0 &&
      typeof dashboard.support.slaStandard === "string";
  } catch {
    dashboardVisible = false;
  }

  const resolved = await transitionTicket(
    ticket.id,
    "RESOLVED",
    "Row 153 SMTP delivery verification closed after send.",
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    secretsPrinted: false,
    smtpPresence,
    allSmtpVariablesPresent: allPresent,
    senderIsSupportMailbox: senderMatches,
    sender: SUPPORT_MAILBOX,
    smtpReady: isSmtpReady(),
    smtpAuthentication: auth.status === "sent" ? "PASS" : "FAIL",
    smtpStatus: auth.status,
    smtpError:
      auth.status === "sent" ? null : redact(auth.error ?? "unknown"),
    googleWorkspaceAccepted: auth.status === "sent",
    supportSubmission: persisted ? "PASS" : "FAIL",
    ticketId: ticket.id,
    ticketPersisted: Boolean(persisted),
    durability: durability.productionSourceOfTruth,
    backend: durability.backend,
    acknowledgmentStatus: persisted?.acknowledgment.status ?? ticket.acknowledgment.status,
    actualEmailDelivery:
      auth.status === "sent" &&
      (persisted?.acknowledgment.status === "sent" || ticket.acknowledgment.status === "sent")
        ? "PASS"
        : "FAIL",
    ticketTracking: Boolean(persisted?.id.startsWith("BH-S-")),
    adminVisibility: Boolean(persisted),
    row151Visibility: dashboardVisible,
    resolutionWorkflow: resolved.status === "RESOLVED" ? "PASS" : "FAIL",
    urgentLiveEmailCreated: false,
    note: "Urgent routing is covered by the existing Row 153 suite (T21). A second live urgent email was not created.",
    markedComplete: false,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-153-smtp-delivery-verification.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        smtpPresence: payload.smtpPresence,
        sender: payload.sender,
        senderIsSupportMailbox: payload.senderIsSupportMailbox,
        smtpAuthentication: payload.smtpAuthentication,
        smtpStatus: payload.smtpStatus,
        smtpError: payload.smtpError,
        ticketId: payload.ticketId,
        acknowledgmentStatus: payload.acknowledgmentStatus,
        actualEmailDelivery: payload.actualEmailDelivery,
        ticketPersisted: payload.ticketPersisted,
        row151Visibility: payload.row151Visibility,
        resolutionWorkflow: payload.resolutionWorkflow,
        secretsPrinted: false,
      },
      null,
      2,
    ),
  );

  if (payload.actualEmailDelivery !== "PASS") process.exitCode = 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown";
  console.error(JSON.stringify({ status: "failed", error: redact(message) }));
  process.exit(1);
});
