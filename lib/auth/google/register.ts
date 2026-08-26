import { accountCreationConsents } from "@/content/legal/documents";
import { generateArcCodeCandidate } from "@/lib/auth/arc-code";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getPostRegistrationRedirect } from "@/lib/auth/routing";
import { allocateUniqueArcCode, getAuthStore } from "@/lib/auth/store";
import type { GoogleRegistrationResult } from "@/lib/auth/types";
import { recordConsentsForUser } from "@/lib/consent/record-consent";
import type { ConsentValue } from "@/lib/consent/types";
import {
  buildConsentRecords,
  validateRequiredConsents,
} from "@/lib/consent/validation";
import type { Locale } from "@/lib/i18n/config";
import { trackProductEvent } from "@/lib/analytics/track";
import { parseAttributionFromUnknown } from "@/lib/marketing-kpi/attribution";
import type { GoogleOAuthIntent } from "@/lib/auth/config";
import { readAgeEligibilityFromServerCookies } from "@/lib/eligibility/cookie";

export type GoogleProfile = {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type GoogleAuthAnalyticsContext = {
  attribution?: unknown;
  anonymousId?: string;
};

function analyticsIdentity(analytics?: GoogleAuthAnalyticsContext) {
  const attribution = parseAttributionFromUnknown(analytics?.attribution);
  const anonymousId =
    typeof analytics?.anonymousId === "string" && analytics.anonymousId.length <= 80
      ? analytics.anonymousId
      : undefined;
  return { attribution, anonymousId };
}

export async function trackGoogleOAuthAnalytics(input: {
  intent: GoogleOAuthIntent;
  locale: Locale;
  errorCategory: string;
  analytics?: GoogleAuthAnalyticsContext;
}): Promise<void> {
  const { attribution, anonymousId } = analyticsIdentity(input.analytics);
  if (input.intent === "login") {
    await trackProductEvent({
      name: "auth_failed",
      productArea: "auth",
      locale: input.locale,
      attribution,
      anonymousId,
      idempotencyKey: `auth_failed:google:${input.errorCategory}:${Date.now()}`,
      payload: { method: "google", errorCategory: input.errorCategory },
    });
    return;
  }
  await trackProductEvent({
    name: "registration_failed",
    productArea: "registration",
    locale: input.locale,
    attribution,
    anonymousId,
    idempotencyKey: `registration_failed:google:${input.errorCategory}:${Date.now()}`,
    payload: { method: "google", errorCategory: input.errorCategory },
  });
}

export async function registerOrLinkGoogleAccount(
  profile: GoogleProfile,
  consents: ConsentValue[],
  locale: Locale,
  analytics?: GoogleAuthAnalyticsContext,
): Promise<GoogleRegistrationResult> {
  const { attribution, anonymousId } = analyticsIdentity(analytics);
  const ageStatus = await readAgeEligibilityFromServerCookies();
  if (ageStatus !== "eligible") {
    await trackGoogleOAuthAnalytics({
      intent: "register",
      locale,
      errorCategory: "age_ineligible",
      analytics,
    });
    return { status: "age_ineligible" };
  }

  const store = getAuthStore();
  const normalizedEmail = normalizeEmail(profile.email);
  const redirectPath = getPostRegistrationRedirect(locale);

  const byGoogle = await store.findUserByGoogleId(profile.googleId);
  if (byGoogle) {
    return { status: "existing", redirectPath };
  }

  const byEmail = await store.findUserByEmail(normalizedEmail);

  if (byEmail) {
    if (byEmail.authProvider === "google" && byEmail.googleId === profile.googleId) {
      return { status: "existing", redirectPath };
    }

    await trackGoogleOAuthAnalytics({
      intent: "register",
      locale,
      errorCategory: "duplicate",
      analytics,
    });
    return {
      status: "conflict",
      message:
        "An account with this email already exists. Sign in with your email and password.",
    };
  }

  const consentErrors = validateRequiredConsents(
    accountCreationConsents,
    consents,
  );

  if (Object.keys(consentErrors).length > 0) {
    await trackGoogleOAuthAnalytics({
      intent: "register",
      locale,
      errorCategory: "consent_required",
      analytics,
    });
    return { status: "consent_required" };
  }

  const arcCode = await allocateUniqueArcCode(store, generateArcCodeCandidate);

  const user = await store.createUser({
    email: normalizedEmail,
    firstName: profile.firstName,
    lastName: profile.lastName,
    authProvider: "google",
    googleId: profile.googleId,
    arcCode,
    emailVerified: true,
    locale,
    ageEligible: true,
    ageEligibleConfirmedAt: new Date().toISOString(),
  });

  const consentRecords = buildConsentRecords(consents, {
    userId: user.id,
    locale,
  });
  await recordConsentsForUser(user.id, consentRecords);

  await trackProductEvent({
    name: "registration_submitted",
    userId: user.id,
    anonymousId,
    productArea: "registration",
    locale,
    attribution,
    idempotencyKey: `registration_submitted:google:${user.id}`,
    payload: { method: "google" },
  });
  await trackProductEvent({
    name: "registration_succeeded",
    userId: user.id,
    anonymousId,
    productArea: "registration",
    locale,
    attribution,
    idempotencyKey: `registration_succeeded:${user.id}`,
    payload: { method: "google" },
  });
  await trackProductEvent({
    name: "email_verified",
    userId: user.id,
    anonymousId,
    productArea: "registration",
    locale,
    attribution,
    idempotencyKey: `email_verified:${user.id}`,
    payload: { method: "google" },
  });

  return {
    status: "created",
    userId: user.id,
    redirectPath,
  };
}
