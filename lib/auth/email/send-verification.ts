import { getSiteUrl, isEmailDeliveryConfigured } from "@/lib/auth/config";
import { sendClassifiedEmail } from "@/lib/email/send";
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

  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[Row 63] Verification email for ${input.email}: ${verifyUrl}`,
      );
      return { status: "logged" };
    }

    return { status: "not_configured" };
  }

  const subject =
    input.locale === "es"
      ? "Verifica tu cuenta de The Back Half"
      : "Verify your Back Half account";

  const text =
    input.locale === "es"
      ? [
          `Hola ${input.firstName},`,
          "",
          "Verifica tu cuenta de The Back Half:",
          verifyUrl,
          "",
          "Este enlace expira en 24 horas.",
          "",
          "Si no creaste esta cuenta, puedes ignorar este mensaje.",
          "",
          "The Back Half",
        ].join("\n")
      : [
          `Hello ${input.firstName},`,
          "",
          "Verify your Back Half account:",
          verifyUrl,
          "",
          "This link expires in 24 hours.",
          "",
          "If you did not create this account, you can ignore this message.",
          "",
          "The Back Half",
        ].join("\n");

  const result = await sendClassifiedEmail({
    templateId: "auth.verification",
    to: input.email,
    subject,
    text,
    locale: input.locale,
  });

  if (result.status === "sent") {
    return { status: "sent" };
  }

  if (process.env.NODE_ENV !== "production") {
    const detail = "error" in result ? result.error : result.status;
    console.info(
      `[Row 63] Verification email delivery failed (${detail}). Fallback link for ${input.email}: ${verifyUrl}`,
    );
    return { status: "logged" };
  }

  return { status: "not_configured" };
}
