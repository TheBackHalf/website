import { approvedLaunchEmail } from "@/content/launch/row199-communications";
import { EMAIL_BRAND } from "@/lib/email/templates/brand";
import type {
  ParticipantEmailCategory,
  ParticipantEmailTemplateId,
  ParticipantEmailVars,
} from "@/lib/email/templates/types";
import type { Locale } from "@/lib/i18n/config";
import { SUPPORT_MAILBOX } from "@/lib/support/catalog";
import { PUBLISHED_RESPONSE_HOURS } from "@/lib/support/catalog";

export type EmailCopyBody = {
  category: ParticipantEmailCategory;
  fromName: string;
  transactional: boolean;
  /** Launch announcement is templated but not authorized to send from this row. */
  sendAuthorized: boolean;
  subject: string;
  preheader: string;
  heading: string;
  greeting: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

function architectName(locale: Locale, firstName?: string): string {
  const trimmed = firstName?.trim();
  if (trimmed) return trimmed;
  return "Architect";
}

function hello(locale: Locale, firstName?: string): string {
  const name = architectName(locale, firstName);
  return locale === "es" ? `Hola ${name},` : `Hello ${name},`;
}

const LAUNCH_ES = {
  subject: "THE BACK HALF YA ESTÁ AQUÍ.",
  preheader: "Pasaste años convirtiéndote en quien se suponía que debías ser.",
  heading: "THE BACK HALF YA ESTÁ AQUÍ.",
  cta: "Conviértete en Architect",
  paragraphs: [
    "Pasaste años convirtiéndote en quien se suponía que debías ser.",
    "Ahora llega una pregunta distinta:",
    "¿Quién eliges convertirte a continuación?",
    "Hay más vida dentro de tu vida.",
    "El giro es de la expectativa a la intención.",
    "The Back Half es una Global Life Design Company para ese giro.",
    "MAGICAL IS POSSIBLE.",
    "Hoy puedes Convertirte en Architect.",
    "Y tu Back Half puede comenzar hoy.",
  ],
  signOff: [
    "Con gratitud,",
    "Kimberly M. Walker",
    "Founder",
    "The Back Half",
  ],
} as const;

export function buildEmailCopy(
  id: ParticipantEmailTemplateId,
  locale: Locale,
  vars: ParticipantEmailVars,
): EmailCopyBody {
  const es = locale === "es";
  const supportMailbox = vars.supportMailbox ?? SUPPORT_MAILBOX;

  switch (id) {
    case "verify_account":
      return {
        category: "account_access",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? "Verifica tu cuenta de The Back Half"
          : "Verify your Back Half account",
        preheader: es
          ? "Este enlace expira en 24 horas."
          : "This link expires in 24 hours.",
        heading: es ? "Verifica tu cuenta" : "Verify your account",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              "Verifica tu cuenta de The Back Half para continuar.",
              "Este enlace expira en 24 horas.",
              "Si no creaste esta cuenta, puedes ignorar este mensaje.",
            ]
          : [
              "Verify your Back Half account to continue.",
              "This link expires in 24 hours.",
              "If you did not create this account, you can ignore this message.",
            ],
        ctaLabel: es ? "Verificar cuenta" : "Verify account",
        ctaUrl: vars.verifyUrl,
      };
    case "password_reset":
      return {
        category: "account_access",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? "Restablece tu contraseña de The Back Half"
          : "Reset your Back Half password",
        preheader: es
          ? "Este enlace expira en 24 horas."
          : "This link expires in 24 hours.",
        heading: es ? "Restablecer contraseña" : "Reset your password",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              "Recibimos una solicitud para restablecer la contraseña de tu cuenta de The Back Half.",
              "Este enlace expira en 24 horas.",
              "Si no solicitaste este cambio, no es necesario hacer nada. Tu contraseña actual seguirá siendo válida.",
            ]
          : [
              "We received a request to reset the password for your Back Half account.",
              "This link expires in 24 hours.",
              "If you did not request this change, no action is needed. Your current password will remain valid.",
            ],
        ctaLabel: es ? "Restablecer contraseña" : "Reset password",
        ctaUrl: vars.resetUrl,
      };
    case "purchase_confirmed":
      return {
        category: "purchase",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? "Pago confirmado — The Back Half"
          : "Payment confirmed — The Back Half",
        preheader: es
          ? "Tu acceso se actualiza automáticamente en tu cuenta."
          : "Your account access updates automatically.",
        heading: es ? "Pago confirmado" : "Payment confirmed",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              `Tu pago de ${vars.offerName ?? "The Back Half"} se confirmó correctamente.`,
              "Tu acceso se actualiza automáticamente en tu cuenta.",
            ]
          : [
              `Your payment for ${vars.offerName ?? "The Back Half"} was confirmed.`,
              "Your account access updates automatically.",
            ],
        ctaLabel: es ? "Abrir tu cuenta" : "Open your account",
        ctaUrl: vars.dashboardUrl,
      };
    case "payment_failed":
      return {
        category: "billing",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? "No se pudo completar el pago — The Back Half"
          : "Payment could not be completed — The Back Half",
        preheader: es
          ? "No se otorgó acceso de pago."
          : "No paid access was granted.",
        heading: es ? "Pago no completado" : "Payment not completed",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              `No pudimos completar el pago de ${vars.offerName ?? "The Back Half"}.`,
              "No se otorgó acceso de pago. Puedes intentar de nuevo cuando estés listo/a.",
            ]
          : [
              `We could not complete payment for ${vars.offerName ?? "The Back Half"}.`,
              "No paid access was granted. You can try again when ready.",
            ],
        ctaLabel: es ? "Revisar facturación" : "Review billing",
        ctaUrl: vars.billingUrl,
      };
    case "community_activated":
      return {
        category: "community",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? "Membresía Community activada — The Back Half"
          : "Community membership activated — The Back Half",
        preheader: es
          ? "Tu membresía Community de The Back Half está activa."
          : "Your The Back Half Community membership is active.",
        heading: es ? "Membresía Community activada" : "Community membership activated",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              "Tu membresía Community de The Back Half está activa.",
              "Bienvenido/a al espacio.",
            ]
          : [
              "Your The Back Half Community membership is active.",
              "Welcome in.",
            ],
        ctaLabel: es ? "Abrir tu cuenta" : "Open your account",
        ctaUrl: vars.dashboardUrl,
      };
    case "community_canceled":
      return {
        category: "community",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? "Membresía Community cancelada — The Back Half"
          : "Community membership canceled — The Back Half",
        preheader: es
          ? "Si aún tienes tiempo pagado restante, el acceso continúa hasta esa fecha."
          : "If paid time remains, access continues through that date.",
        heading: es ? "Membresía Community cancelada" : "Community membership canceled",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              "Tu membresía Community de The Back Half fue cancelada.",
              "Si aún tienes tiempo pagado restante, el acceso continúa hasta esa fecha.",
            ]
          : [
              "Your The Back Half Community membership was canceled.",
              "If paid time remains, access continues through that date.",
            ],
        ctaLabel: es ? "Revisar facturación" : "Review billing",
        ctaUrl: vars.billingUrl,
      };
    case "refund_notice":
      return {
        category: "billing",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? "Reembolso procesado — The Back Half"
          : "Refund processed — The Back Half",
        preheader: es
          ? "El acceso asociado se ha actualizado en tu cuenta."
          : "Associated access has been updated on your account.",
        heading: es ? "Reembolso procesado" : "Refund processed",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              `Se procesó un reembolso relacionado con ${vars.offerName ?? "The Back Half"}.`,
              "El acceso asociado se ha actualizado en tu cuenta.",
            ]
          : [
              `A refund related to ${vars.offerName ?? "The Back Half"} was processed.`,
              "Associated access has been updated on your account.",
            ],
        ctaLabel: es ? "Revisar facturación" : "Review billing",
        ctaUrl: vars.billingUrl,
      };
    case "journey_chapter_complete":
      return {
        category: "journey_progress",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? `Capítulo guardado — ${vars.chapterTitle ?? "Journey"}`
          : `Chapter saved — ${vars.chapterTitle ?? "Journey"}`,
        preheader: es
          ? "Tu trabajo queda guardado en tu cuenta de Architect."
          : "Your work remains saved with this Architect account.",
        heading: es ? "Capítulo guardado" : "Chapter saved",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              `${vars.chapterTitle ?? "Tu capítulo"} está marcado como completo.`,
              "Tus respuestas quedan guardadas en esta cuenta de Architect.",
            ]
          : [
              `${vars.chapterTitle ?? "Your chapter"} is marked complete.`,
              "Your answers remain saved with this Architect account.",
            ],
        ctaLabel: es ? "Continuar el Journey" : "Continue the Journey",
        ctaUrl: vars.journeyUrl,
      };
    case "journey_weekly_commitment":
      return {
        category: "journey_progress",
        fromName: EMAIL_BRAND.fromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? "Tu compromiso semanal está guardado"
          : "Your weekly commitment is saved",
        preheader: es
          ? "El compromiso de esta semana queda en tu cuenta."
          : "This week's commitment remains in your account.",
        heading: es ? "Compromiso semanal" : "Weekly commitment",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              "Tu compromiso semanal está guardado.",
              vars.weeklyCommitment
                ? vars.weeklyCommitment
                : "Puedes volver a él en tu Journey.",
            ]
          : [
              "Your weekly commitment is saved.",
              vars.weeklyCommitment
                ? vars.weeklyCommitment
                : "You can return to it in your Journey.",
            ],
        ctaLabel: es ? "Abrir el Journey" : "Open the Journey",
        ctaUrl: vars.journeyUrl,
      };
    case "support_acknowledgment": {
      const urgent = Boolean(vars.priorityUrgent);
      const timing = es
        ? urgent
          ? "Esto se marcó como urgente y se priorizó. No se tratará como un asunto ordinario de la cola de tres días."
          : `Suele haber respuesta en 3 días, con el objetivo de ${PUBLISHED_RESPONSE_HOURS} horas o menos. Los asuntos urgentes de seguridad y privacidad se priorizan.`
        : urgent
          ? "This has been marked urgent and prioritized. We will not treat it as an ordinary three-day queue item."
          : `We typically respond within 3 days, with a goal of ${PUBLISHED_RESPONSE_HOURS} hours or less. Urgent security and privacy concerns are prioritized.`;
      return {
        category: "support",
        fromName: EMAIL_BRAND.supportFromName,
        transactional: true,
        sendAuthorized: true,
        subject: es
          ? `Recibimos tu solicitud [${vars.ticketId ?? ""}]`
          : `We received your request [${vars.ticketId ?? ""}]`,
        preheader: es
          ? `Creamos el ticket ${vars.ticketId ?? ""}.`
          : `We created ticket ${vars.ticketId ?? ""}.`,
        heading: es ? "Recibimos tu solicitud" : "We received your request",
        greeting: hello(locale, vars.firstName),
        paragraphs: es
          ? [
              "Gracias por escribir a The Back Half Support.",
              `Recibimos tu solicitud y creamos el ticket ${vars.ticketId ?? ""}.`,
              timing,
              "No envíes contraseñas, información de tarjetas de pago ni otros datos sensibles de la cuenta en tu respuesta.",
              "Este es un acuse de recibo automático. Un miembro de The Back Half Support hará seguimiento.",
            ]
          : [
              "Thank you for writing to The Back Half Support.",
              `We received your request and created ticket ${vars.ticketId ?? ""}.`,
              timing,
              "Please do not send passwords, payment-card information, or other sensitive account information in reply.",
              "This is an automated acknowledgment. A member of The Back Half Support will follow up.",
            ],
        footerNote: `${EMAIL_BRAND.supportFromName} · ${supportMailbox}`,
      };
    }
    case "launch_announcement": {
      const destination =
        vars.registerUrl ?? approvedLaunchEmail.destination;
      if (es) {
        return {
          category: "launch",
          fromName: approvedLaunchEmail.fromName,
          transactional: false,
          sendAuthorized: false,
          subject: LAUNCH_ES.subject,
          preheader: LAUNCH_ES.preheader,
          heading: LAUNCH_ES.heading,
          greeting: "",
          paragraphs: [...LAUNCH_ES.paragraphs, ...LAUNCH_ES.signOff],
          ctaLabel: LAUNCH_ES.cta,
          ctaUrl: destination,
          footerNote:
            "Plantilla de anuncio de lanzamiento. No enviada. No programada.",
        };
      }
      return {
        category: "launch",
        fromName: approvedLaunchEmail.fromName,
        transactional: false,
        sendAuthorized: false,
        subject: approvedLaunchEmail.subject,
        preheader: approvedLaunchEmail.preheader,
        heading: approvedLaunchEmail.bodyParagraphs[0] ?? approvedLaunchEmail.subject,
        greeting: "",
        paragraphs: [
          ...approvedLaunchEmail.bodyParagraphs.slice(1),
          ...approvedLaunchEmail.signOff,
        ],
        ctaLabel: approvedLaunchEmail.cta,
        ctaUrl: destination,
        footerNote: "Launch announcement template. Not sent. Not scheduled.",
      };
    }
  }
}
