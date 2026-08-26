"use server";

import { cookies } from "next/headers";
import { accountCreationConsents } from "@/content/legal/documents";
import { generateArcCodeCandidate } from "@/lib/auth/arc-code";
import {
  REGISTRATION_CONSENT_COOKIE,
  VERIFICATION_TOKEN_TTL_MS,
  isAuthConfigured,
} from "@/lib/auth/config";
import { sendVerificationEmail } from "@/lib/auth/email/send-verification";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { hashPassword } from "@/lib/auth/password";
import {
  getPostRegistrationRedirect,
  getRegistrationConfirmationPath,
} from "@/lib/auth/routing";
import {
  allocateUniqueArcCode,
  getAuthStore,
} from "@/lib/auth/store";
import {
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import type { RegisterEmailResult, RegistrationFormData } from "@/lib/auth/types";
import { validateRegistrationForm } from "@/lib/auth/validation";
import { registrationFailureResult } from "@/lib/auth/registration-error";
import type { Locale } from "@/lib/i18n/config";
import type { ConsentValue } from "@/lib/consent/types";
import {
  buildConsentRecords,
  validateRequiredConsents,
} from "@/lib/consent/validation";
import { trackProductEvent } from "@/lib/analytics/track";
import { parseAttributionFromUnknown } from "@/lib/marketing-kpi/attribution";
import {
  persistAgeEligibilityStatus,
  readAgeEligibilityFromServerCookies,
} from "@/lib/eligibility/cookie";

export type RegisterEmailActionInput = RegistrationFormData & {
  consents: ConsentValue[];
  attribution?: unknown;
  anonymousId?: string;
};

export async function registerWithEmailAction(
  input: RegisterEmailActionInput,
): Promise<RegisterEmailResult> {
  const attribution = parseAttributionFromUnknown(input.attribution);
  const anonymousId =
    typeof input.anonymousId === "string" && input.anonymousId.length <= 80
      ? input.anonymousId
      : undefined;

  const ageStatus = await readAgeEligibilityFromServerCookies();
  if (ageStatus !== "eligible") {
    await trackProductEvent({
      name: "registration_failed",
      productArea: "registration",
      locale: input.locale,
      attribution,
      idempotencyKey: `registration_failed:age:${Date.now()}`,
      payload: { method: "email", errorCategory: "age_ineligible" },
    });
    return { status: "age_ineligible" };
  }

  if (!isAuthConfigured()) {
    await trackProductEvent({
      name: "registration_failed",
      productArea: "registration",
      locale: input.locale,
      attribution,
      idempotencyKey: `registration_failed:not_configured:${Date.now()}`,
      payload: { method: "email", errorCategory: "not_configured" },
    });
    return {
      status: "error",
      message: "Account registration is not configured. AUTH_SECRET is required.",
    };
  }

  const validationErrors = validateRegistrationForm(input);

  const consentErrors = validateRequiredConsents(
    accountCreationConsents,
    input.consents,
  );

  if (Object.keys(consentErrors).length > 0) {
    await trackProductEvent({
      name: "registration_failed",
      productArea: "registration",
      locale: input.locale,
      attribution,
      idempotencyKey: `registration_failed:consent:${Date.now()}`,
      payload: { method: "email", errorCategory: "consent_required" },
    });
    return {
      status: "consent_required",
      errors: { consent: "Required acknowledgments must be accepted." },
    };
  }

  if (Object.keys(validationErrors).length > 0) {
    await trackProductEvent({
      name: "registration_failed",
      productArea: "registration",
      locale: input.locale,
      attribution,
      idempotencyKey: `registration_failed:validation:${Date.now()}`,
      payload: { method: "email", errorCategory: "validation" },
    });
    return { status: "validation_error", errors: validationErrors };
  }

  await trackProductEvent({
    name: "registration_submitted",
    productArea: "registration",
    locale: input.locale,
    attribution,
    idempotencyKey: `registration_submitted:email:${Date.now()}`,
    payload: { method: "email" },
  });

  const store = getAuthStore();
  const normalizedEmail = normalizeEmail(input.email);
  const existing = await store.findUserByEmail(normalizedEmail);

  if (existing) {
    await trackProductEvent({
      name: "registration_failed",
      productArea: "registration",
      locale: input.locale,
      attribution,
      idempotencyKey: `registration_failed:duplicate:${Date.now()}`,
      payload: { method: "email", errorCategory: "duplicate" },
    });
    return { status: "duplicate", field: "email" };
  }

  try {
    const arcCode = await allocateUniqueArcCode(store, generateArcCodeCandidate);
    const passwordHash = await hashPassword(input.password);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString();
    const consentRecords = buildConsentRecords(input.consents, {
      locale: input.locale,
    });

    const user = await store.persistEmailRegistration({
      user: {
        email: normalizedEmail,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        authProvider: "email",
        arcCode,
        emailVerified: false,
        locale: input.locale,
        ageEligible: true,
        ageEligibleConfirmedAt: new Date().toISOString(),
      },
      consents: consentRecords,
      verificationToken: {
        token,
        userId: "pending",
        email: normalizedEmail,
        expiresAt,
        createdAt: new Date().toISOString(),
      },
    });

    await sendVerificationEmail({
      email: user.email,
      token,
      locale: input.locale,
      firstName: user.firstName,
    });

    await trackProductEvent({
      name: "registration_succeeded",
      userId: user.id,
      anonymousId,
      productArea: "registration",
      locale: input.locale,
      attribution,
      idempotencyKey: `registration_succeeded:${user.id}`,
      payload: { method: "email" },
    });
    await trackProductEvent({
      name: "email_verification_required",
      userId: user.id,
      productArea: "registration",
      locale: input.locale,
      idempotencyKey: `email_verification_required:${user.id}`,
      payload: { method: "email" },
    });

    return {
      status: "success",
      userId: user.id,
      requiresVerification: true,
    };
  } catch (error) {
    const result = registrationFailureResult(error);
    await trackProductEvent({
      name: "registration_failed",
      productArea: "registration",
      locale: input.locale,
      attribution,
      idempotencyKey: `registration_failed:${result.status}:${Date.now()}`,
      payload: {
        method: "email",
        errorCategory: result.status === "duplicate" ? "duplicate" : "error",
      },
    });
    return result;
  }
}

export async function setRegistrationConsentCookie(
  consents: ConsentValue[],
  locale: Locale,
  analytics?: { attribution?: unknown; anonymousId?: string },
): Promise<
  { status: "ok" } | { status: "consent_required" } | { status: "age_ineligible" }
> {
  const ageStatus = await readAgeEligibilityFromServerCookies();
  if (ageStatus !== "eligible") {
    return { status: "age_ineligible" };
  }

  const consentErrors = validateRequiredConsents(
    accountCreationConsents,
    consents,
  );

  if (Object.keys(consentErrors).length > 0) {
    return { status: "consent_required" };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    REGISTRATION_CONSENT_COOKIE,
    JSON.stringify({
      consents,
      locale,
      attribution: analytics?.attribution,
      anonymousId:
        typeof analytics?.anonymousId === "string"
          ? analytics.anonymousId.slice(0, 80)
          : undefined,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  );

  return { status: "ok" };
}

export async function getRegistrationConfirmationRedirect(
  locale: Locale,
): Promise<string> {
  return getRegistrationConfirmationPath(locale);
}

export async function establishVerifiedSession(userId: string): Promise<boolean> {
  const store = getAuthStore();
  const user = await store.findUserById(userId);

  if (!user || !user.emailVerified) {
    return false;
  }

  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieOptions().name, token, getSessionCookieOptions());
  if (user.ageEligible === true) {
    await persistAgeEligibilityStatus("eligible");
  }

  return true;
}

export async function getAuthenticatedRedirectPath(locale: Locale): Promise<string> {
  return getPostRegistrationRedirect(locale);
}
