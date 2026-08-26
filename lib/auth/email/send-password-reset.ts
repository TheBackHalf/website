import { getSiteUrl, isEmailDeliveryConfigured } from "@/lib/auth/config";
import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import { renderParticipantEmail } from "@/lib/email/templates";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedPath } from "@/lib/i18n/routing";

type SendPasswordResetEmailInput = {
  email: string;
  token: string;
  locale: Locale;
  firstName: string;
};

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<{ status: "sent" } | { status: "logged" } | { status: "not_configured" }> {
  const resetUrl = `${getSiteUrl()}${getLocalizedPath("/reset-password", input.locale)}?token=${encodeURIComponent(input.token)}`;
  const rendered = renderParticipantEmail("password_reset", input.locale, {
    firstName: input.firstName,
    resetUrl,
  });

  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[Row 64] Password reset email for ${input.email}: ${resetUrl}`,
      );
      return { status: "logged" };
    }

    return { status: "not_configured" };
  }

  const result = await sendSmtpEmail({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    fromName: rendered.fromName,
  });

  if (result.status === "sent") {
    return { status: "sent" };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[Row 64] Password reset email delivery failed (${result.error}). Fallback link for ${input.email}: ${resetUrl}`,
    );
    return { status: "logged" };
  }

  return { status: "not_configured" };
}
