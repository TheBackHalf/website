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
  const english = input.locale !== "es";
  const subject = english
    ? `We received your privacy request [${input.requestId}]`
    : `Recibimos tu solicitud de privacidad [${input.requestId}]`;
  const greeting = input.requesterName.trim()
    ? english
      ? `Hello ${input.requesterName.trim()},`
      : `Hola ${input.requesterName.trim()},`
    : english
      ? "Hello,"
      : "Hola,";
  const typeLabel = privacyTypeLabel(input.type, input.locale);
  const identity = input.identityPending
    ? english
      ? [
          "Please confirm your identity by opening the confirmation link we sent for this request. We will not ask for your password.",
          input.verifyUrl ? `Confirmation link: ${input.verifyUrl}` : "",
        ]
      : [
          "Confirma tu identidad abriendo el enlace de confirmación de esta solicitud. No pediremos tu contraseña.",
          input.verifyUrl ? `Enlace de confirmación: ${input.verifyUrl}` : "",
        ]
    : [
        english
          ? "Your identity was verified from your signed-in session."
          : "Tu identidad se verificó con tu sesión iniciada.",
      ];

  const retention =
    input.type === "DELETION"
      ? english
        ? "Verified deletion removes account access and participant content. Financial, consent-audit, correspondence, backup, vendor, and legal-hold records may be retained. Deletion is not complete erasure."
        : "Una eliminación verificada quita el acceso a la cuenta y el contenido de participante. Pueden conservarse registros financieros, de auditoría de consentimiento, correspondencia, respaldos, proveedores y retención legal. La eliminación no es un borrado total."
      : "";

  const text = (
    english
      ? [
          greeting,
          "",
          "Thank you for writing to The Back Half about a privacy request.",
          "",
          `We received your ${typeLabel} request and created ${input.requestId}.`,
          "",
          ...identity.filter(Boolean),
          "",
          retention,
          retention ? "" : null,
          "A Support ticket was opened so Michelle can route the request.",
          "",
          "Please do not send passwords, payment-card information, or other sensitive account information in reply.",
          "",
          "This is an automated acknowledgment. The Back Half will follow up.",
          "",
          PRIVACY_FROM_NAME,
          PRIVACY_MAILBOX_ADDRESS,
        ]
      : [
          greeting,
          "",
          "Gracias por escribir a The Back Half sobre una solicitud de privacidad.",
          "",
          `Recibimos tu solicitud de ${typeLabel} y creamos ${input.requestId}.`,
          "",
          ...identity.filter(Boolean),
          "",
          retention,
          retention ? "" : null,
          "Se abrió un ticket de Support para que Michelle enrute la solicitud.",
          "",
          "No envíes contraseñas, información de tarjetas de pago u otros datos sensibles de la cuenta en la respuesta.",
          "",
          "Este es un acuse automático. The Back Half dará seguimiento.",
          "",
          PRIVACY_FROM_NAME,
          PRIVACY_MAILBOX_ADDRESS,
        ]
  )
    .filter((line) => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

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
