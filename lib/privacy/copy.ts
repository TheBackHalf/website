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
    mailboxNote: english
      ? `This in-product form is the operational intake. A Support ticket is opened for routing. You may also write ${PRIVACY_MAILBOX_ADDRESS}; live mailbox connection is a Founder Workspace action if that inbox is not yet connected.`
      : `Este formulario en el producto es la vía operativa de ingreso. Se abre un ticket de Support para el enrutamiento. También puedes escribir a ${PRIVACY_MAILBOX_ADDRESS}; la conexión en vivo del buzón es una acción de Founder en Workspace si ese buzón aún no está conectado.`,
    sensitive:
      english
        ? "Please do not include passwords, payment-card information, one-time codes, or government identification numbers."
        : "No incluyas contraseñas, información de tarjetas de pago, códigos de un solo uso ni números de identificación gubernamentales.",
    identityNote: english
      ? "If you are signed in with the same email, identity is verified from your session. Otherwise we send a confirmation link to the email you provide. We will not ask for your password."
      : "Si iniciaste sesión con el mismo correo, la identidad se verifica con tu sesión. Si no, enviamos un enlace de confirmación al correo que indiques. No pediremos tu contraseña.",
    retentionNote: english
      ? "Verified deletion removes account access and participant Journey/Lumina content. Financial/transaction records, consent-audit history, correspondence, backups, vendor records, and records under a legal hold are retained. Deletion is not complete erasure."
      : "Una eliminación verificada quita el acceso a la cuenta y el contenido de participante del Journey y de Lumina. Se conservan registros financieros y de transacción, historial de auditoría de consentimiento, correspondencia, respaldos, registros de proveedores y registros bajo retención legal. La eliminación no es un borrado total.",
    deletionConfirm: english
      ? "I understand that a verified deletion request removes account access and participant content, and that financial, consent-audit, correspondence, backup, vendor, and legal-hold records may be retained. This is not complete erasure."
      : "Entiendo que una eliminación verificada quita el acceso a la cuenta y el contenido de participante, y que pueden conservarse registros financieros, de auditoría de consentimiento, correspondencia, respaldos, proveedores y retención legal. Esto no es un borrado total.",
    fulfillmentNote: english
      ? `After identity verification, fulfillment is tracked against an internal operating target of ${PRIVACY_FULFILLMENT_DAYS} days. That target is operational tracking, not a legal conclusion.`
      : `Después de verificar la identidad, el cumplimiento se rastrea con un objetivo operativo interno de ${PRIVACY_FULFILLMENT_DAYS} días. Ese objetivo es seguimiento operativo, no una conclusión legal.`,
    nameLabel: english ? "Name" : "Nombre",
    emailLabel: english ? "Email" : "Correo",
    typeLabel: english ? "Request type" : "Tipo de solicitud",
    typePlaceholder: english ? "Select a request type" : "Selecciona un tipo de solicitud",
    firstNameLabel: english ? "Corrected first name" : "Nombre corregido",
    lastNameLabel: english ? "Corrected last name" : "Apellido corregido",
    subjectLabel: english ? "Subject" : "Asunto",
    messageLabel: english ? "Message" : "Mensaje",
    submit: english ? "Submit privacy request" : "Enviar solicitud de privacidad",
    submitError: english
      ? `We could not send your request. Use this form again or write to Support. ${PRIVACY_MAILBOX_ADDRESS} is listed for privacy correspondence.`
      : `No pudimos enviar tu solicitud. Vuelve a usar este formulario o escribe a Support. ${PRIVACY_MAILBOX_ADDRESS} está indicado para correspondencia de privacidad.`,
    received: english ? "We received your privacy request." : "Recibimos tu solicitud de privacidad.",
    receivedDetail: english
      ? "Your request ID is {requestId}. A Support ticket was opened for routing. Check your email if identity confirmation is still required."
      : "El ID de tu solicitud es {requestId}. Se abrió un ticket de Support para el enrutamiento. Revisa tu correo si todavía falta confirmar la identidad.",
    verifyTitle: english ? "Confirm your privacy request" : "Confirma tu solicitud de privacidad",
    verifySuccess: english
      ? "Identity confirmed. We can now process this request."
      : "Identidad confirmada. Ya podemos procesar esta solicitud.",
    verifyFailure: english
      ? "This confirmation link is invalid or expired. Submit a new privacy request."
      : "Este enlace de confirmación no es válido o expiró. Envía una nueva solicitud de privacidad.",
    verifyRetention: english
      ? "If this was a deletion request, financial, consent-audit, correspondence, backup, vendor, and legal-hold records may be retained. Deletion is not complete erasure."
      : "Si esta fue una solicitud de eliminación, pueden conservarse registros financieros, de auditoría de consentimiento, correspondencia, respaldos, proveedores y retención legal. La eliminación no es un borrado total.",
  };
}
