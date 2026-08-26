import { sendClassifiedEmail } from "@/lib/email/send";
import {
  PUBLISHED_RESPONSE_HOURS,
  SUPPORT_FROM_NAME,
  SUPPORT_MAILBOX,
  type SupportPriority,
} from "@/lib/support/catalog";
import type { SupportAcknowledgment } from "@/lib/support/ticket-types";

export function supportFromAddress(): string {
  const configured = process.env.SMTP_FROM?.trim();
  if (configured?.toLowerCase() === SUPPORT_MAILBOX) return SUPPORT_MAILBOX;
  if (process.env.SMTP_USER?.trim().toLowerCase() === SUPPORT_MAILBOX) {
    return SUPPORT_MAILBOX;
  }
  return configured || SUPPORT_MAILBOX;
}

export function buildAcknowledgmentText(input: {
  ticketId: string;
  requesterName: string;
  priority: SupportPriority;
}): { subject: string; text: string } {
  const subject = `We received your request [${input.ticketId}]`;
  const greeting = input.requesterName.trim()
    ? `Hello ${input.requesterName.trim()},`
    : "Hello,";
  const timing =
    input.priority === "P1"
      ? "This has been marked urgent and prioritized. We will not treat it as an ordinary three-day queue item."
      : `We typically respond within 3 days, with a goal of ${PUBLISHED_RESPONSE_HOURS} hours or less. Urgent security and privacy concerns are prioritized.`;

  const text = [
    greeting,
    "",
    "Thank you for writing to The Back Half Support.",
    "",
    `We received your request and created ticket ${input.ticketId}.`,
    "",
    timing,
    "",
    "Please do not send passwords, payment-card information, or other sensitive account information in reply.",
    "",
    "This is an automated acknowledgment. A member of The Back Half Support will follow up.",
    "",
    "The Back Half Support",
    SUPPORT_MAILBOX,
  ].join("\n");

  return { subject, text };
}

export async function sendSupportAcknowledgment(input: {
  ticketId: string;
  requesterName: string;
  requesterEmail: string;
  priority: SupportPriority;
  inReplyTo?: string;
}): Promise<SupportAcknowledgment> {
  const now = new Date().toISOString();
  const copy = buildAcknowledgmentText(input);
  const messageId = `<${input.ticketId.toLowerCase()}@thebackhalf.org>`;
  const result = await sendClassifiedEmail({
    templateId: "support.acknowledgment",
    to: input.requesterEmail,
    subject: copy.subject,
    text: copy.text,
    fromName: SUPPORT_FROM_NAME,
    fromAddress: supportFromAddress(),
    replyTo: SUPPORT_MAILBOX,
    messageId,
    inReplyTo: input.inReplyTo,
    references: input.inReplyTo,
  });

  if (result.status === "sent") {
    return { status: "sent", at: now, messageId: result.smtpResponse };
  }
  if (result.status === "not_configured") {
    return { status: "not_configured", at: now, error: result.error };
  }
  return {
    status: "failed",
    at: now,
    error: result.status === "failed" ? result.error : result.status,
  };
}
