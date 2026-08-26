import type { Locale } from "@/lib/i18n/config";
import {
  PRIVACY_FULFILLMENT_DAYS,
  PRIVACY_MAILBOX_ADDRESS,
  PRIVACY_REQUEST_TYPE_LABELS,
  PRIVACY_REQUEST_TYPE_LABELS_ES,
  type PrivacyRequestType,
} from "@/lib/privacy/catalog";

export function privacyTypeLabel(type: PrivacyRequestType, locale: Locale): string {
  return locale === "es" ? PRIVACY_REQUEST_TYPE_LABELS_ES[type] : PRIVACY_REQUEST_TYPE_LABELS[type];
}

export function privacyRequestPageCopy(locale: Locale) {
  const english = locale !== "es";
  return {
    eyebrow: english ? "Privacy" : "Privacidad",
    title: english ? "Privacy rights requests" : "Solicitudes de derechos de privacidad",
    intro: english
      ? "Use this form to request access, correction, deletion, export, consent withdrawal where applicable, or to ask a privacy question. Identity is verified before personal information is released or deleted."
      : "Usa este formulario para solicitar acceso, corrección, eliminación, exportación, retiro de consentimiento cuando aplique, o para una consulta de privacidad. Verificamos la identidad antes de entregar o eliminar información personal.",
    mailbox: PRIVACY_MAILBOX_ADDRESS,
    sensitive:
      english
        ? "Please do not include passwords, payment-card information, one-time codes, or government identification numbers."
        : "No incluyas contraseñas, información de tarjetas de pago, códigos de un solo uso ni números de identificación gubernamentales.",
    identityNote: english
      ? "If you are signed in with the same email, identity is verified from your session. Otherwise we send a confirmation link to the email you provide. We will not ask for your password."
      : "Si iniciaste sesión con el mismo correo, la identidad se verifica con tu sesión. Si no, enviamos un enlace de confirmación al correo que indiques. No pediremos tu contraseña.",
    deletionConfirm: english
      ? "I understand that a verified deletion request removes account access and participant content, and that transaction, consent-audit, correspondence, backup, and vendor records may be retained as described in the operating process."
      : "Entiendo que una eliminación verificada quita el acceso a la cuenta y el contenido de participante, y que registros de transacción, auditoría de consentimiento, correspondencia, respaldos y proveedores pueden conservarse según el proceso operativo.",
    fulfillmentNote: english
      ? `After identity verification, fulfillment is tracked against an internal operating target of ${PRIVACY_FULFILLMENT_DAYS} days. That target is operational tracking, not a legal conclusion.`
      : `Después de verificar la identidad, el cumplimiento se rastrea con un objetivo operativo interno de ${PRIVACY_FULFILLMENT_DAYS} días. Ese objetivo es seguimiento operativo, no una conclusión legal.`,
    submit: english ? "Submit privacy request" : "Enviar solicitud de privacidad",
    received: english ? "We received your privacy request." : "Recibimos tu solicitud de privacidad.",
    receivedDetail: english
      ? "Your request ID is {requestId}. Check your email if identity confirmation is still required."
      : "El ID de tu solicitud es {requestId}. Revisa tu correo si todavía falta confirmar la identidad.",
    verifyTitle: english ? "Confirm your privacy request" : "Confirma tu solicitud de privacidad",
    verifySuccess: english
      ? "Identity confirmed. We can now process this request."
      : "Identidad confirmada. Ya podemos procesar esta solicitud.",
    verifyFailure: english
      ? "This confirmation link is invalid or expired. Submit a new privacy request."
      : "Este enlace de confirmación no es válido o expiró. Envía una nueva solicitud de privacidad.",
  };
}
