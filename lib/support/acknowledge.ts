import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import {
  PUBLISHED_RESPONSE_HOURS,
  SUPPORT_FROM_NAME,
  SUPPORT_MAILBOX,
  type SupportPriority,
} from "@/lib/support/catalog";
import { renderParticipantEmail } from "@/lib/email/templates";
import type { Locale } from "@/lib/i18n/config";
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
  locale?: Locale;
}): { subject: string; text: string; html: string } {
  const locale: Locale = input.locale === "es" ? "es" : "en";
  const rendered = renderParticipantEmail("support_acknowledgment", locale, {
    firstName: input.requesterName,
    ticketId: input.ticketId,
    supportMailbox: SUPPORT_MAILBOX,
    priorityUrgent: input.priority === "P1",
  });
  return {
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  };
}

export async function sendSupportAcknowledgment(input: {
  ticketId: string;
  requesterName: string;
  requesterEmail: string;
  priority: SupportPriority;
  locale?: Locale;
  inReplyTo?: string;
}): Promise<SupportAcknowledgment> {
  const now = new Date().toISOString();
  const copy = buildAcknowledgmentText(input);
  const messageId = `<${input.ticketId.toLowerCase()}@thebackhalf.org>`;
  const result = await sendSmtpEmail({
    to: input.requesterEmail,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
    fromName: SUPPORT_FROM_NAME,
    fromAddress: supportFromAddress(),
    replyTo: SUPPORT_MAILBOX,
    messageId,
    inReplyTo: input.inReplyTo,
    references: input.inReplyTo,
  });

  if (result.status === "sent") {
    return { status: "sent", at: now, messageId: result.response };
  }
  if (result.status === "not_configured") {
    return { status: "not_configured", at: now, error: result.error };
  }
  return { status: "failed", at: now, error: result.error };
}

/** Published timing remains the Row 153 SLA copy; kept for validators. */
export function publishedSupportResponseHours(): number {
  return PUBLISHED_RESPONSE_HOURS;
}
