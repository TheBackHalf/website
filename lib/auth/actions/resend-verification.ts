"use server";

import {
  RESEND_VERIFICATION_COOLDOWN_MS,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/lib/auth/config";
import { sendVerificationEmail } from "@/lib/auth/email/send-verification";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getAuthStore } from "@/lib/auth/store";
import type { ResendVerificationResult } from "@/lib/auth/types";

export async function resendVerificationEmailAction(
  email: string,
): Promise<ResendVerificationResult> {
  const store = getAuthStore();
  const normalized = normalizeEmail(email);
  const user = await store.findUserByEmail(normalized);

  if (!user) {
    return { status: "not_found" };
  }

  if (user.emailVerified) {
    return { status: "already_verified" };
  }

  if (user.authProvider !== "email") {
    return { status: "already_verified" };
  }

  const lastResend = await store.getLastResendAt(normalized);

  if (
    lastResend &&
    Date.now() - new Date(lastResend).getTime() < RESEND_VERIFICATION_COOLDOWN_MS
  ) {
    return { status: "rate_limited" };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString();

  await store.createVerificationToken({
    token,
    userId: user.id,
    email: user.email,
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  const delivery = await sendVerificationEmail({
    email: user.email,
    token,
    locale: user.locale,
    firstName: user.firstName,
  });

  await store.setLastResendAt(normalized, new Date().toISOString());

  if (delivery.status === "not_configured" && process.env.NODE_ENV === "production") {
    return { status: "email_not_configured" };
  }

  return { status: "sent" };
}
