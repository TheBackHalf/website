"use server";

import {
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
  isAuthConfigured,
} from "@/lib/auth/config";
import { sendPasswordResetEmail } from "@/lib/auth/email/send-password-reset";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getAuthStore } from "@/lib/auth/store";
import type { ForgotPasswordResult } from "@/lib/auth/types";
import { isValidEmailFormat } from "@/lib/auth/validation";
import type { Locale } from "@/lib/i18n/config";

function resetCooldownKey(email: string): string {
  return `password-reset:${normalizeEmail(email)}`;
}

export async function requestPasswordResetAction(input: {
  email: string;
  locale: Locale;
}): Promise<ForgotPasswordResult> {
  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: "Password recovery is not configured.",
    };
  }

  if (!input.email.trim()) {
    return {
      status: "validation_error",
      errors: {
        email:
          input.locale === "es"
            ? "El correo electrónico es obligatorio."
            : "Email is required.",
      },
    };
  }

  if (!isValidEmailFormat(input.email)) {
    return {
      status: "validation_error",
      errors: {
        email:
          input.locale === "es"
            ? "Introduce un correo electrónico válido."
            : "Enter a valid email address.",
      },
    };
  }

  const store = getAuthStore();
  const normalizedEmail = normalizeEmail(input.email);
  const user = await store.findUserByEmail(normalizedEmail);

  // Always return a neutral accepted response after validation.
  // Google-only accounts (no passwordHash) intentionally skip token creation.
  if (!user?.passwordHash || !user.emailVerified) {
    return { status: "accepted" };
  }

  const lastRequest = await store.getLastResendAt(resetCooldownKey(normalizedEmail));
  if (lastRequest) {
    const elapsed = Date.now() - new Date(lastRequest).getTime();
    if (elapsed < PASSWORD_RESET_COOLDOWN_MS) {
      return { status: "accepted" };
    }
  }

  const token = crypto.randomUUID();
  const now = new Date();

  await store.createPasswordResetToken({
    token,
    userId: user.id,
    email: normalizedEmail,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS).toISOString(),
  });

  await store.setLastResendAt(resetCooldownKey(normalizedEmail), now.toISOString());

  await sendPasswordResetEmail({
    email: normalizedEmail,
    token,
    locale: input.locale,
    firstName: user.firstName,
  });

  return { status: "accepted" };
}
