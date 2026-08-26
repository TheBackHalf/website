import { getSiteUrl, isEmailDeliveryConfigured } from "@/lib/auth/config";
import { sendTransactionalEmail } from "@/lib/email/send";
import type { Locale } from "@/lib/i18n/config";

type SendPasswordResetEmailInput = {
  email: string;
  token: string;
  locale: Locale;
  firstName: string;
};

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<{ status: "sent" } | { status: "logged" } | { status: "not_configured" }> {
  const resetUrl = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;

  if (!isEmailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[Row 64] Password reset email for ${input.email}: ${resetUrl}`,
      );
      return { status: "logged" };
    }

    return { status: "not_configured" };
  }

  const subject =
    input.locale === "es"
      ? "Restablece tu contraseña de The Back Half"
      : "Reset your Back Half password";

  const text =
    input.locale === "es"
      ? [
          `Hola ${input.firstName},`,
          "",
          "Recibimos una solicitud para restablecer la contraseña de tu cuenta de The Back Half.",
          "",
          `Restablecer contraseña: ${resetUrl}`,
          "",
          "Este enlace expira en 24 horas.",
          "",
          "Si no solicitaste este cambio, no es necesario hacer nada. Tu contraseña actual seguirá siendo válida.",
          "",
          "The Back Half",
        ].join("\n")
      : [
          `Hello ${input.firstName},`,
          "",
          "We received a request to reset the password for your Back Half account.",
          "",
          `Reset password: ${resetUrl}`,
          "",
          "This link expires in 24 hours.",
          "",
          "If you did not request this change, no action is needed. Your current password will remain valid.",
          "",
          "The Back Half",
        ].join("\n");

  const result = await sendTransactionalEmail({
    to: input.email,
    subject,
    text,
    category: "auth",
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
