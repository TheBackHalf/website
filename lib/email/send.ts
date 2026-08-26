import { randomUUID } from "node:crypto";
import { sendSmtpEmail, type OutboundEmail } from "@/lib/auth/email/smtp";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { classifyDeliveryError } from "@/lib/email/classify";
import {
  DEFAULT_TRANSACTIONAL_FROM_NAME,
  DEFAULT_TRANSACTIONAL_REPLY_TO,
  resolveFromAddress,
  TRANSACTIONAL_EMAIL_PROVIDER_ID,
} from "@/lib/email/config";
import { getEmailStore } from "@/lib/email/store";
import { unsubscribeApiUrl } from "@/lib/email/tokens";
import type {
  EmailDeliveryEvent,
  TransactionalEmailCategory,
  TransactionalSendInput,
  TransactionalSendResult,
} from "@/lib/email/types";

type Transport = typeof sendSmtpEmail;

let transport: Transport = sendSmtpEmail;

export function setTransactionalTransportForTests(next: Transport): void {
  transport = next;
}

export function resetTransactionalTransportForTests(): void {
  transport = sendSmtpEmail;
}

function categoriesBlockedByUnsubscribe(): TransactionalEmailCategory[] {
  return ["lifecycle"];
}

export async function isRecipientSuppressed(
  email: string,
  category: TransactionalEmailCategory,
): Promise<{ suppressed: boolean; reason?: string }> {
  const record = await getEmailStore().getSuppression(email);
  if (!record) return { suppressed: false };
  if (record.reason === "hard_bounce" || record.reason === "complaint") {
    return { suppressed: true, reason: record.reason };
  }
  if (
    record.reason === "unsubscribe" &&
    categoriesBlockedByUnsubscribe().includes(category)
  ) {
    return { suppressed: true, reason: "unsubscribe" };
  }
  return { suppressed: false };
}

function shouldAttachUnsubscribe(
  category: TransactionalEmailCategory,
): boolean {
  return category === "billing" || category === "support" || category === "lifecycle";
}

async function record(
  event: Omit<EmailDeliveryEvent, "id" | "createdAt" | "provider"> & {
    id?: string;
    createdAt?: string;
  },
): Promise<EmailDeliveryEvent> {
  const stored: EmailDeliveryEvent = {
    id: event.id ?? `eml-${randomUUID()}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
    provider: TRANSACTIONAL_EMAIL_PROVIDER_ID,
    type: event.type,
    status: event.status,
    category: event.category,
    email: normalizeEmail(event.email),
    messageId: event.messageId,
    error: event.error,
    test: event.test,
  };
  await getEmailStore().recordEvent(stored);
  return stored;
}

export async function sendTransactionalEmail(
  input: TransactionalSendInput,
): Promise<TransactionalSendResult> {
  const to = normalizeEmail(input.to);
  const eventId = `eml-${randomUUID()}`;
  const from = resolveFromAddress(input.fromAddress);

  if (!from.allowed) {
    await record({
      id: eventId,
      type: "skipped_invalid_sender",
      status: "skipped_invalid_sender",
      category: input.category,
      email: to,
      error: from.reason ?? "invalid_sender",
      test: input.test,
    });
    return {
      status: "skipped_invalid_sender",
      error: from.reason ?? "invalid_sender",
      eventId,
    };
  }

  const suppressed = await isRecipientSuppressed(to, input.category);
  if (suppressed.suppressed) {
    await record({
      id: eventId,
      type: "skipped_suppressed",
      status: "skipped_suppressed",
      category: input.category,
      email: to,
      error: suppressed.reason,
      test: input.test,
    });
    return {
      status: "skipped_suppressed",
      error: suppressed.reason ?? "suppressed",
      eventId,
    };
  }

  const headers: Record<string, string> = {
    "X-BH-Email-Category": input.category,
    "X-BH-Email-Id": eventId,
  };
  if (shouldAttachUnsubscribe(input.category)) {
    const url = unsubscribeApiUrl(to);
    if (url) {
      headers["List-Unsubscribe"] = `<${url}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }
  }

  const message: OutboundEmail = {
    to,
    subject: input.subject,
    text: input.text,
    fromName: input.fromName ?? DEFAULT_TRANSACTIONAL_FROM_NAME,
    fromAddress: from.address,
    replyTo: input.replyTo ?? DEFAULT_TRANSACTIONAL_REPLY_TO,
    messageId: input.messageId,
    inReplyTo: input.inReplyTo,
    references: input.references,
    headers,
  };

  const result = await transport(message);

  if (result.status === "sent") {
    await record({
      id: eventId,
      type: "sent",
      status: "sent",
      category: input.category,
      email: to,
      messageId: result.response,
      test: input.test,
    });
    return { status: "sent", response: result.response, eventId };
  }

  if (result.status === "not_configured") {
    await record({
      id: eventId,
      type: "skipped_not_configured",
      status: "skipped_not_configured",
      category: input.category,
      email: to,
      error: result.error,
      test: input.test,
    });
    return { status: "not_configured", error: result.error, eventId };
  }

  const bounceClass = classifyDeliveryError(result.error);
  if (bounceClass === "hard" || bounceClass === "complaint") {
    const now = new Date().toISOString();
    await getEmailStore().upsertSuppression({
      email: to,
      reason: bounceClass === "complaint" ? "complaint" : "hard_bounce",
      source: "smtp_error",
      detail: bounceClass,
      createdAt: now,
      updatedAt: now,
      test: input.test,
    });
    await record({
      id: eventId,
      type: bounceClass === "complaint" ? "complaint" : "bounce",
      status: bounceClass === "complaint" ? "complaint" : "bounce",
      category: input.category,
      email: to,
      error: result.error,
      test: input.test,
    });
  } else {
    await record({
      id: eventId,
      type: "failed",
      status: "failed",
      category: input.category,
      email: to,
      error: result.error,
      test: input.test,
    });
  }

  return { status: "failed", error: result.error, eventId };
}
