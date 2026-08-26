import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import {
  PRIVACY_FROM_NAME,
  PRIVACY_MAILBOX_ADDRESS,
  PRIVACY_REPLY_TO,
  type PrivacyRequestType,
} from "@/lib/privacy/catalog";
import { privacyTypeLabel } from "@/lib/privacy/copy";
import type { PrivacyAcknowledgment } from "@/lib/privacy/types";
import type { Locale } from "@/lib/i18n/config";

export function buildPrivacyAcknowledgmentText(input: {
  requestId: string;
  requesterName: string;
  type: PrivacyRequestType;
  identityPending: boolean;
  verifyUrl?: string;
  locale: Locale;
}): { subject: string; text: string } {
  const subject = `We received your privacy request [${input.requestId}]`;
  const greeting = input.requesterName.trim()
    ? `Hello ${input.requesterName.trim()},`
    : "Hello,";
  const typeLabel = privacyTypeLabel(input.type, input.locale);
  const identity = input.identityPending
    ? [
        "Please confirm your identity by opening the confirmation link we sent for this request. We will not ask for your password.",
        input.verifyUrl ? `Confirmation link: ${input.verifyUrl}` : "",
      ]
    : ["Your identity was verified from your signed-in session."];

  const text = [
    greeting,
    "",
    "Thank you for writing to The Back Half about a privacy request.",
    "",
    `We received your ${typeLabel} request and created ${input.requestId}.`,
    "",
    ...identity.filter(Boolean),
    "",
    "Please do not send passwords, payment-card information, or other sensitive account information in reply.",
    "",
    "This is an automated acknowledgment. The Back Half will follow up.",
    "",
    PRIVACY_FROM_NAME,
    PRIVACY_MAILBOX_ADDRESS,
  ].join("\n");

  return { subject, text };
}

export async function sendPrivacyAcknowledgment(input: {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  type: PrivacyRequestType;
  identityPending: boolean;
  verifyUrl?: string;
  locale: Locale;
}): Promise<PrivacyAcknowledgment> {
  const now = new Date().toISOString();
  const copy = buildPrivacyAcknowledgmentText(input);
  const result = await sendSmtpEmail({
    to: input.requesterEmail,
    subject: copy.subject,
    text: copy.text,
    fromName: PRIVACY_FROM_NAME,
    fromAddress: process.env.SMTP_FROM?.trim() || PRIVACY_REPLY_TO,
    replyTo: PRIVACY_MAILBOX_ADDRESS,
    messageId: `<${input.requestId.toLowerCase()}@thebackhalf.org>`,
  });
  if (result.status === "sent") {
    return { status: "sent", at: now };
  }
  if (result.status === "not_configured") {
    return { status: "not_configured", at: now, error: result.error };
  }
  return { status: "failed", at: now, error: result.error };
}
