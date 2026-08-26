import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import { getAuthStore } from "@/lib/auth/store";
import { getBillingStore } from "@/lib/billing/store";
import type { BillingNotificationTemplate } from "@/lib/billing/types";
import type { CheckoutOfferId } from "@/lib/checkout/offers";
import type { Locale } from "@/lib/i18n/config";

function offerLabel(offerId: CheckoutOfferId | undefined, locale: Locale): string {
  switch (offerId) {
    case "blueprint":
      return locale === "es"
        ? "The Back Half Blueprint"
        : "The Back Half Blueprint";
    case "bundle":
      return locale === "es"
        ? "The Back Half Journey + Community Bundle"
        : "The Back Half Journey + Community Bundle";
    case "community":
      return locale === "es"
        ? "The Back Half Community"
        : "The Back Half Community";
    default:
      return locale === "es" ? "The Back Half" : "The Back Half";
  }
}

function buildMessage(input: {
  template: BillingNotificationTemplate;
  locale: Locale;
  firstName: string;
  offerId?: CheckoutOfferId;
}): { subject: string; text: string } {
  const offer = offerLabel(input.offerId, input.locale);
  const name = input.firstName || (input.locale === "es" ? "Architect" : "Architect");

  if (input.locale === "es") {
    switch (input.template) {
      case "payment_success":
        return {
          subject: "Pago confirmado — The Back Half",
          text: [
            `Hola ${name},`,
            "",
            `Tu pago de ${offer} se confirmó correctamente.`,
            "Tu acceso se actualiza automáticamente en tu cuenta.",
            "",
            "The Back Half",
          ].join("\n"),
        };
      case "payment_failed":
        return {
          subject: "No se pudo completar el pago — The Back Half",
          text: [
            `Hola ${name},`,
            "",
            `No pudimos completar el pago de ${offer}.`,
            "No se otorgó acceso de pago. Puedes intentar de nuevo cuando estés listo.",
            "",
            "The Back Half",
          ].join("\n"),
        };
      case "subscription_activated":
        return {
          subject: "Membresía Community activada — The Back Half",
          text: [
            `Hola ${name},`,
            "",
            "Tu membresía Community de The Back Half está activa.",
            "Bienvenido al espacio.",
            "",
            "The Back Half",
          ].join("\n"),
        };
      case "subscription_canceled":
        return {
          subject: "Membresía Community cancelada — The Back Half",
          text: [
            `Hola ${name},`,
            "",
            "Tu membresía Community de The Back Half fue cancelada.",
            "Si aún tienes tiempo pagado restante, el acceso continúa hasta esa fecha.",
            "",
            "The Back Half",
          ].join("\n"),
        };
      case "refund_notice":
        return {
          subject: "Reembolso procesado — The Back Half",
          text: [
            `Hola ${name},`,
            "",
            `Se procesó un reembolso relacionado con ${offer}.`,
            "El acceso asociado se ha actualizado en tu cuenta.",
            "",
            "The Back Half",
          ].join("\n"),
        };
    }
  }

  switch (input.template) {
    case "payment_success":
      return {
        subject: "Payment confirmed — The Back Half",
        text: [
          `Hello ${name},`,
          "",
          `Your payment for ${offer} was confirmed.`,
          "Your account access updates automatically.",
          "",
          "The Back Half",
        ].join("\n"),
      };
    case "payment_failed":
      return {
        subject: "Payment could not be completed — The Back Half",
        text: [
          `Hello ${name},`,
          "",
          `We could not complete payment for ${offer}.`,
          "No paid access was granted. You can try again when ready.",
          "",
          "The Back Half",
        ].join("\n"),
      };
    case "subscription_activated":
      return {
        subject: "Community membership activated — The Back Half",
        text: [
          `Hello ${name},`,
          "",
          "Your The Back Half Community membership is active.",
          "Welcome in.",
          "",
          "The Back Half",
        ].join("\n"),
      };
    case "subscription_canceled":
      return {
        subject: "Community membership canceled — The Back Half",
        text: [
          `Hello ${name},`,
          "",
          "Your The Back Half Community membership was canceled.",
          "If paid time remains, access continues through that date.",
          "",
          "The Back Half",
        ].join("\n"),
      };
    case "refund_notice":
      return {
        subject: "Refund processed — The Back Half",
        text: [
          `Hello ${name},`,
          "",
          `A refund related to ${offer} was processed.`,
          "Associated access has been updated on your account.",
          "",
          "The Back Half",
        ].join("\n"),
      };
  }
}

/**
 * Idempotent payment transactional email.
 * Never crashes webhook processing when SMTP is unavailable.
 */
export async function sendBillingNotification(input: {
  userId: string;
  template: BillingNotificationTemplate;
  idempotencyKey: string;
  offerId?: CheckoutOfferId;
}): Promise<{
  status: "sent" | "skipped_not_configured" | "failed" | "skipped_duplicate";
}> {
  const store = getBillingStore();
  const existing = await store.findNotificationByIdempotencyKey(
    input.idempotencyKey,
  );
  if (existing) {
    return { status: "skipped_duplicate" };
  }

  const user = await getAuthStore().findUserById(input.userId);
  if (!user) {
    await store.recordNotification({
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      template: input.template,
      status: "failed",
      locale: "en",
      offerId: input.offerId,
      detail: "user_not_found",
    });
    return { status: "failed" };
  }

  const locale: Locale = user.locale === "es" ? "es" : "en";
  const message = buildMessage({
    template: input.template,
    locale,
    firstName: user.firstName,
    offerId: input.offerId,
  });

  const result = await sendSmtpEmail({
    to: user.email,
    subject: message.subject,
    text: message.text,
  });

  if (result.status === "sent") {
    await store.recordNotification({
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      template: input.template,
      status: "sent",
      locale,
      offerId: input.offerId,
    });
    return { status: "sent" };
  }

  if (result.status === "not_configured") {
    await store.recordNotification({
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      template: input.template,
      status: "skipped_not_configured",
      locale,
      offerId: input.offerId,
      detail: "smtp_not_configured",
    });
    return { status: "skipped_not_configured" };
  }

  await store.recordNotification({
    idempotencyKey: input.idempotencyKey,
    userId: input.userId,
    template: input.template,
    status: "failed",
    locale,
    offerId: input.offerId,
    detail: "smtp_send_failed",
  });
  return { status: "failed" };
}
