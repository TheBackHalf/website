"use server";

import { cookies } from "next/headers";
import { isAuthConfigured } from "@/lib/auth/config";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { verifyPassword } from "@/lib/auth/password";
import {
  getLoginPath,
  getPostLoginRedirect,
  getSafeRedirectPath,
} from "@/lib/auth/routing";
import {
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { getAuthStore } from "@/lib/auth/store";
import { syncConfiguredRole } from "@/lib/auth/sync-configured-role";
import type { LoginEmailResult, LoginFormData } from "@/lib/auth/types";
import { validateLoginForm } from "@/lib/auth/validation";
import type { Locale } from "@/lib/i18n/config";
import { trackProductEvent } from "@/lib/analytics/track";
import { persistAgeEligibilityStatus } from "@/lib/eligibility/cookie";
import { DurablePersistenceError } from "@/lib/durable/db";
import {
  clearRateLimit,
  consumeRateLimit,
  peekRateLimit,
} from "@/lib/rate-limit/consume";
import { RATE_LIMITS, clientIpFromHeaders } from "@/lib/rate-limit/http";

export type LoginEmailActionInput = LoginFormData & {
  next?: string;
};

export async function loginWithEmailAction(
  input: LoginEmailActionInput,
): Promise<LoginEmailResult> {
  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: "Sign-in is not configured.",
    };
  }

  const validationErrors = validateLoginForm(input);

  if (Object.keys(validationErrors).length > 0) {
    return { status: "validation_error", errors: validationErrors };
  }

  try {
    const ip = await clientIpFromHeaders();
    const ipLimit = await consumeRateLimit({
      bucket: RATE_LIMITS.loginIp.bucket,
      key: ip,
      limit: RATE_LIMITS.loginIp.limit,
      windowMs: RATE_LIMITS.loginIp.windowMs,
    });
    if (!ipLimit.allowed) {
      return { status: "rate_limited" };
    }
    const accountKey = normalizeEmail(input.email);
    const lock = await peekRateLimit({
      bucket: RATE_LIMITS.loginAccount.bucket,
      key: accountKey,
      limit: RATE_LIMITS.loginAccount.limit,
      windowMs: RATE_LIMITS.loginAccount.windowMs,
    });
    if (!lock.allowed) {
      return { status: "invalid_credentials" };
    }
  } catch (error) {
    if (error instanceof DurablePersistenceError) {
      return { status: "error", message: "Sign-in is not configured." };
    }
    throw error;
  }

  const store = getAuthStore();
  const normalizedEmail = normalizeEmail(input.email);
  const user = await store.findUserByEmail(normalizedEmail);

  if (!user?.passwordHash || !user.emailVerified) {
    await consumeRateLimit({
      bucket: RATE_LIMITS.loginAccount.bucket,
      key: normalizeEmail(input.email),
      limit: RATE_LIMITS.loginAccount.limit,
      windowMs: RATE_LIMITS.loginAccount.windowMs,
      lockAfter: RATE_LIMITS.loginAccount.lockAfter,
      lockMs: RATE_LIMITS.loginAccount.lockMs,
      countFailures: true,
    }).catch(() => undefined);
    await trackProductEvent({
      name: "auth_failed",
      productArea: "auth",
      locale: input.locale,
      idempotencyKey: `auth_failed:invalid:${Date.now()}`,
      payload: { method: "email", errorCategory: "invalid_credentials" },
    });
    return { status: "invalid_credentials" };
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    await consumeRateLimit({
      bucket: RATE_LIMITS.loginAccount.bucket,
      key: normalizeEmail(input.email),
      limit: RATE_LIMITS.loginAccount.limit,
      windowMs: RATE_LIMITS.loginAccount.windowMs,
      lockAfter: RATE_LIMITS.loginAccount.lockAfter,
      lockMs: RATE_LIMITS.loginAccount.lockMs,
      countFailures: true,
    }).catch(() => undefined);
    await trackProductEvent({
      name: "auth_failed",
      productArea: "auth",
      locale: input.locale,
      idempotencyKey: `auth_failed:invalid:${Date.now()}`,
      payload: { method: "email", errorCategory: "invalid_credentials" },
    });
    return { status: "invalid_credentials" };
  }

  const syncedUser = await syncConfiguredRole(user);
  await clearRateLimit(RATE_LIMITS.loginAccount.bucket, normalizeEmail(input.email)).catch(
    () => undefined,
  );
  const locale: Locale = input.locale === "es" ? "es" : syncedUser.locale;
  const redirectPath = getSafeRedirectPath(
    input.next,
    locale,
    getPostLoginRedirect(locale),
  );

  const sessionToken = await createSessionToken({
    ...syncedUser,
    locale,
  });
  const cookieStore = await cookies();
  cookieStore.set(
    getSessionCookieOptions().name,
    sessionToken,
    getSessionCookieOptions(),
  );
  if (syncedUser.ageEligible === true) {
    await persistAgeEligibilityStatus("eligible");
  }

  return { status: "success", redirectPath };
}

export async function getLoginRedirectForAuthenticatedUser(
  locale: Locale,
  next?: string,
): Promise<string> {
  return getSafeRedirectPath(next, locale, getPostLoginRedirect(locale));
}

export async function getDefaultLoginPath(locale: Locale): Promise<string> {
  return getLoginPath(locale);
}
