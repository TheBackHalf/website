import { getSiteUrl, isEmailDeliveryConfigured } from "@/lib/auth/config";
import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import { renderParticipantEmail } from "@/lib/email/templates";
import type { Locale } from "@/lib/i18n/config";

type SendVerificationEmailInput = {
  email: string;
  token: string;
  locale: Locale;
  firstName: string;
};

export async function sendVerificationEmail(
  input: SendVerificationEmailInput,
): Promise<{ status: "sent" } | { status: "logged" } | { status: "not_configured" }> {
  const verifyUrl = `${getSiteUrl()}/api/auth/verify-email?token=${encodeURIComponent(input.token)}&locale=${input.locale}`;
  const rendered = renderParticipantEmail("verify_account", input.locale, {
    firstName: input.firstName,
    verifyUrl,
  });

  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[Row 63] Verification email for ${input.email}: ${verifyUrl}`,
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
      `[Row 63] Verification email delivery failed (${result.error}). Fallback link for ${input.email}: ${verifyUrl}`,
    );
    return { status: "logged" };
  }

  return { status: "not_configured" };
}
