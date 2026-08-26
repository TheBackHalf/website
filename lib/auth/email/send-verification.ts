import { getSiteUrl, isEmailDeliveryConfigured } from "@/lib/auth/config";
import { sendSmtpEmail } from "@/lib/auth/email/smtp";
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
      await recordAccountVerification(input, "skipped_not_configured", "dev_logged");
      return { status: "logged" };
    }

    await recordAccountVerification(input, "skipped_not_configured", "smtp_not_configured");
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

  const result = await sendSmtpEmail({
    to: input.email,
    subject,
    text,
  });

  if (result.status === "sent") {
    await recordAccountVerification(input, "sent");
    return { status: "sent" };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[Row 63] Verification email delivery failed (${result.error}). Fallback link for ${input.email}: ${verifyUrl}`,
    );
    await recordAccountVerification(input, "skipped_not_configured", "dev_logged_fallback");
    return { status: "logged" };
  }

  await recordAccountVerification(input, "failed", "smtp_send_failed");
  return { status: "not_configured" };
}

async function recordAccountVerification(
  input: SendVerificationEmailInput,
  status: "sent" | "skipped_not_configured" | "failed",
  detail?: string,
): Promise<void> {
  try {
    const { dispatchLifecycleAutomation } = await import("@/lib/lifecycle/dispatch");
    await dispatchLifecycleAutomation({
      automationId: "account.verification",
      email: input.email,
      firstName: input.firstName,
      locale: input.locale,
      idempotencyKey: `lifecycle:account.verification:${crypto.randomUUID()}`,
      existingDelivery: { status, detail },
      payload: { method: "email", source: "verification" },
    });
  } catch {
    // Ledger must not block verification delivery.
  }
}
