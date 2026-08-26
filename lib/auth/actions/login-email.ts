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

  const store = getAuthStore();
  const normalizedEmail = normalizeEmail(input.email);
  const user = await store.findUserByEmail(normalizedEmail);

  if (!user?.passwordHash || !user.emailVerified) {
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
