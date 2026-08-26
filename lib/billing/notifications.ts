import { getSiteUrl } from "@/lib/auth/config";
import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import { getAuthStore } from "@/lib/auth/store";
import { getBillingStore } from "@/lib/billing/store";
import type { BillingNotificationTemplate } from "@/lib/billing/types";
import type { CheckoutOfferId } from "@/lib/checkout/offers";
import { renderParticipantEmail } from "@/lib/email/templates";
import type { ParticipantEmailTemplateId } from "@/lib/email/templates";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
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

function billingTemplateId(
  template: BillingNotificationTemplate,
): ParticipantEmailTemplateId {
  switch (template) {
    case "payment_success":
      return "purchase_confirmed";
    case "payment_failed":
      return "payment_failed";
    case "subscription_activated":
      return "community_activated";
    case "subscription_canceled":
      return "community_canceled";
    case "refund_notice":
      return "refund_notice";
  }
}

function buildMessage(input: {
  template: BillingNotificationTemplate;
  locale: Locale;
  firstName: string;
  offerId?: CheckoutOfferId;
}): { subject: string; text: string; html: string; fromName: string } {
  const offer = offerLabel(input.offerId, input.locale);
  const site = getSiteUrl();
  const dashboardUrl = `${site}${getLocalizedArchitectPath("dashboard", input.locale)}`;
  const billingUrl = `${site}${getLocalizedArchitectPath("billing", input.locale)}`;
  const rendered = renderParticipantEmail(
    billingTemplateId(input.template),
    input.locale,
    {
      firstName: input.firstName,
      offerName: offer,
      dashboardUrl,
      billingUrl,
    },
  );
  return {
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    fromName: rendered.fromName,
  };
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
    html: message.html,
    fromName: message.fromName,
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
