import { randomUUID } from "node:crypto";

import { isSmtpReady } from "@/lib/auth/email/smtp";
import { sendTransactionalEmail } from "@/lib/email/send";
import { loadServerEnvAllowlist } from "@/lib/fab-5/access";
import type { FounderDecision, NotificationRecord } from "@/lib/fab-5/aos/types";
import { recordNotification } from "@/lib/fab-5/aos/store";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function founderEmailDestination(): string {
  return readEnv("FOUNDER_NOTIFY_EMAIL") || "kimberly@thebackhalf.org";
}

export function smsConfigured(): boolean {
  return Boolean(
    readEnv("TWILIO_ACCOUNT_SID") &&
      readEnv("TWILIO_AUTH_TOKEN") &&
      readEnv("TWILIO_FROM_NUMBER") &&
      readEnv("FOUNDER_NOTIFY_SMS"),
  );
}

export function redactDestination(kind: "email" | "sms", value: string): string {
  if (kind === "email") {
    const [local, domain] = value.split("@");
    if (!domain) return "[redacted-email]";
    return `${(local ?? "").slice(0, 1)}***@${domain}`;
  }
  const digits = value.replace(/\D/g, "");
  return `***${digits.slice(-4)}`;
}

function decisionEmailBody(decision: FounderDecision): string {
  return [
    "FOUNDER DECISION REQUIRED",
    "",
    `AGENT: ${decision.requestingAgent}`,
    `WORK: ${decision.workId}`,
    `DECISION: ${decision.decisionRequired}`,
    `RECOMMENDATION: ${decision.agentRecommendation}`,
    `WHY: ${decision.reason}`,
    `RISK IF DELAYED: ${decision.riskIfDelayed}`,
    decision.deadline ? `DEADLINE: ${decision.deadline}` : "DEADLINE: none",
    "",
    "Respond in Agent Operations: /ops/admin/agent-operations",
    "Allowed: APPROVE | REJECT | REVIEW",
    "",
    "This message does not contain passwords, tokens, MFA codes, or recovery credentials.",
  ].join("\n");
}

async function sendTwilioSms(body: string): Promise<{ status: NotificationRecord["status"]; error: string | null }> {
  const sid = readEnv("TWILIO_ACCOUNT_SID");
  const token = readEnv("TWILIO_AUTH_TOKEN");
  const to = readEnv("FOUNDER_NOTIFY_SMS");
  const from = readEnv("TWILIO_FROM_NUMBER");
  if (!sid || !token || !to || !from) {
    return { status: "not_configured", error: "twilio_env_incomplete" };
  }
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    return { status: "failed", error: `twilio_http_${res.status}` };
  }
  return { status: "sent", error: null };
}

export async function notifyFounderDecision(input: {
  decision: FounderDecision;
  holdSend?: boolean;
}): Promise<NotificationRecord[]> {
  loadServerEnvAllowlist();
  const records: NotificationRecord[] = [];
  const hold = input.holdSend === true || input.decision.controlledTest;

  const dashId = `ntf-${randomUUID()}`;
  const dash: NotificationRecord = {
    notificationId: dashId,
    decisionId: input.decision.decisionId,
    channel: "dashboard",
    severity: input.decision.severity,
    destinationKind: "dashboard",
    status: "sent",
    error: null,
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
  };
  await recordNotification(dash);
  records.push(dash);

  const emailId = `ntf-${randomUUID()}`;
  let emailStatus: NotificationRecord["status"] = "queued";
  let emailError: string | null = null;
  let emailSentAt: string | null = null;
  if (hold) {
    emailStatus = "controlled_test_held";
  } else if (!isSmtpReady()) {
    emailStatus = "not_configured";
    emailError = "smtp_not_configured";
  } else {
    const sent = await sendTransactionalEmail({
      to: founderEmailDestination(),
      subject: `Founder decision required — ${input.decision.decisionRequired.slice(0, 80)}`,
      text: decisionEmailBody(input.decision),
      category: "operations",
      fromName: "The Back Half Operations",
    });
    if (sent.status === "sent") {
      emailStatus = "sent";
      emailSentAt = new Date().toISOString();
    } else if (sent.status === "not_configured") {
      emailStatus = "not_configured";
      emailError = sent.error;
    } else {
      emailStatus = "failed";
      emailError = sent.error;
    }
  }
  const email: NotificationRecord = {
    notificationId: emailId,
    decisionId: input.decision.decisionId,
    channel: "email",
    severity: input.decision.severity,
    destinationKind: "founder_email",
    status: emailStatus,
    error: emailError,
    createdAt: new Date().toISOString(),
    sentAt: emailSentAt,
  };
  await recordNotification(email);
  records.push(email);

  if (input.decision.severity === "urgent") {
    const smsId = `ntf-${randomUUID()}`;
    let smsStatus: NotificationRecord["status"] = "queued";
    let smsError: string | null = null;
    let smsSentAt: string | null = null;
    if (hold) {
      smsStatus = "controlled_test_held";
    } else if (!smsConfigured()) {
      smsStatus = "not_configured";
      smsError = "twilio_not_configured";
    } else {
      const sms = await sendTwilioSms(
        `The Back Half: Founder decision required. Open Agent Operations. ${input.decision.decisionRequired.slice(0, 80)}`,
      );
      smsStatus = sms.status;
      smsError = sms.error;
      smsSentAt = sms.status === "sent" ? new Date().toISOString() : null;
    }
    const smsRecord: NotificationRecord = {
      notificationId: smsId,
      decisionId: input.decision.decisionId,
      channel: "sms",
      severity: "urgent",
      destinationKind: "founder_sms",
      status: smsStatus,
      error: smsError,
      createdAt: new Date().toISOString(),
      sentAt: smsSentAt,
    };
    await recordNotification(smsRecord);
    records.push(smsRecord);
  }

  return records;
}
