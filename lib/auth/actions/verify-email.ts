import { cookies } from "next/headers";
import {
  getPostRegistrationRedirect,
  getSafeRedirectPath,
} from "@/lib/auth/routing";
import { getAuthStore } from "@/lib/auth/store";
import {
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import type { VerifyEmailResult } from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";
import { trackProductEvent } from "@/lib/analytics/track";
import { persistAgeEligibilityStatus } from "@/lib/eligibility/cookie";

/**
 * Completes email verification and establishes a session cookie.
 * Must be called from a Route Handler (or Server Action invocation) — not
 * during Server Component render — because it mutates cookies.
 */
export async function verifyEmailAction(
  token: string,
  locale: Locale,
): Promise<VerifyEmailResult> {
  const store = getAuthStore();
  const record = await store.findVerificationToken(token);

  if (!record) {
    return { status: "invalid" };
  }

  const user = await store.findUserById(record.userId);

  if (!user) {
    return { status: "invalid" };
  }

  const redirectPath = getPostRegistrationRedirect(locale);

  if (user.emailVerified) {
    await establishSession(user.id);
    return { status: "already_verified", redirectPath };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return { status: "expired" };
  }

  await store.updateUser(user.id, { emailVerified: true });
  await store.deleteVerificationToken(token);
  await establishSession(user.id);

  await trackProductEvent({
    name: "email_verified",
    userId: user.id,
    productArea: "registration",
    locale,
    idempotencyKey: `email_verified:${user.id}`,
    payload: { method: "email" },
  });

  return { status: "verified", redirectPath };
}

async function establishSession(userId: string): Promise<void> {
  const store = getAuthStore();
  const user = await store.findUserById(userId);

  if (!user) {
    return;
  }

  const sessionToken = await createSessionToken({
    ...user,
    emailVerified: true,
  });
  const cookieStore = await cookies();
  cookieStore.set(
    getSessionCookieOptions().name,
    sessionToken,
    getSessionCookieOptions(),
  );
  if (user.ageEligible === true) {
    await persistAgeEligibilityStatus("eligible");
  }
}

export async function verifyEmailWithRedirect(
  token: string,
  locale: Locale,
  requestedRedirect?: string,
): Promise<VerifyEmailResult & { redirectPath: string }> {
  const fallback = getPostRegistrationRedirect(locale);
  const safeRedirect = getSafeRedirectPath(requestedRedirect, locale, fallback);
  const result = await verifyEmailAction(token, locale);

  if (result.status === "verified" || result.status === "already_verified") {
    return { ...result, redirectPath: safeRedirect };
  }

  return { ...result, redirectPath: fallback };
}
