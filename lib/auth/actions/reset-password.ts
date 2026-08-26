"use server";

import { isAuthConfigured } from "@/lib/auth/config";
import { hashPassword } from "@/lib/auth/password";
import { getLoginPath } from "@/lib/auth/routing";
import { getAuthStore } from "@/lib/auth/store";
import type { ResetPasswordResult } from "@/lib/auth/types";
import { validatePasswordResetForm } from "@/lib/auth/validation";
import type { Locale } from "@/lib/i18n/config";

export async function inspectPasswordResetTokenAction(token: string): Promise<{
  status: "valid" | "invalid" | "expired" | "used" | "missing";
}> {
  if (!token?.trim()) {
    return { status: "missing" };
  }

  const store = getAuthStore();
  const record = await store.findPasswordResetToken(token.trim());

  if (!record) {
    return { status: "invalid" };
  }

  if (record.usedAt) {
    return { status: "used" };
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return { status: "expired" };
  }

  return { status: "valid" };
}

export async function resetPasswordAction(input: {
  token: string;
  password: string;
  passwordConfirm: string;
  locale: Locale;
}): Promise<ResetPasswordResult> {
  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: "Password recovery is not configured.",
    };
  }

  if (!input.token?.trim()) {
    return { status: "invalid_token" };
  }

  const store = getAuthStore();
  const record = await store.findPasswordResetToken(input.token.trim());

  if (!record) {
    return { status: "invalid_token" };
  }

  if (record.usedAt) {
    return { status: "used_token" };
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return { status: "expired_token" };
  }

  const validationErrors = validatePasswordResetForm(
    input.locale,
    input.password,
    input.passwordConfirm,
  );

  if (Object.keys(validationErrors).length > 0) {
    return { status: "validation_error", errors: validationErrors };
  }

  const user = await store.findUserById(record.userId);

  if (!user || !user.passwordHash) {
    return { status: "invalid_token" };
  }

  const passwordHash = await hashPassword(input.password);
  await store.updateUser(user.id, { passwordHash });
  await store.markPasswordResetTokenUsed(record.token);
  await store.deletePasswordResetToken(record.token);
  await store.deletePasswordResetTokensForUser(user.id);

  return {
    status: "success",
    redirectPath: `${getLoginPath(input.locale)}?reset=success`,
  };
}
