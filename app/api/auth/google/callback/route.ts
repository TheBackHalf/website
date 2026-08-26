import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  REGISTRATION_CONSENT_COOKIE,
  getSiteUrl,
  type GoogleOAuthIntent,
} from "@/lib/auth/config";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
} from "@/lib/auth/google/oauth";
import {
  OAUTH_STATE_COOKIE,
  readRegistrationConsentsFromCookie,
  verifyOAuthState,
} from "@/lib/auth/google/oauth-state";
import { registerOrLinkGoogleAccount, trackGoogleOAuthAnalytics } from "@/lib/auth/google/register";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import {
  getLoginPath,
  getPostLoginRedirect,
  getRegistrationPath,
} from "@/lib/auth/routing";
import {
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { getAuthStore } from "@/lib/auth/store";
import { syncConfiguredRole } from "@/lib/auth/sync-configured-role";
import type { Locale } from "@/lib/i18n/config";
import { setAgeEligibilityOnResponse } from "@/lib/eligibility/cookie";
import { accountIsAgeEligible } from "@/lib/eligibility/policy";

function authReturnPath(intent: GoogleOAuthIntent, locale: Locale): string {
  return intent === "login" ? getLoginPath(locale) : getRegistrationPath(locale);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieStore = await cookies();
  let locale: Locale = "en";
  let intent: GoogleOAuthIntent = "register";

  const localeCookie = cookieStore.get(REGISTRATION_CONSENT_COOKIE)?.value;
  if (localeCookie) {
    try {
      const parsed = JSON.parse(localeCookie) as { locale?: Locale };
      if (parsed.locale === "es") {
        locale = "es";
      }
    } catch {
      // default locale
    }
  }

  const statePayload = state ? await verifyOAuthState(state) : null;
  if (statePayload) {
    locale = statePayload.locale;
    intent = statePayload.intent;
  }

  const consentPayload = await readRegistrationConsentsFromCookie();
  const analytics = consentPayload
    ? {
        attribution: consentPayload.attribution,
        anonymousId: consentPayload.anonymousId,
      }
    : undefined;

  if (error) {
    await trackGoogleOAuthAnalytics({
      intent,
      locale,
      errorCategory: "oauth_cancelled",
      analytics,
    });
    return NextResponse.redirect(
      `${getSiteUrl()}${authReturnPath(intent, locale)}?google=cancelled`,
    );
  }

  if (!code || !state || !statePayload) {
    await trackGoogleOAuthAnalytics({
      intent,
      locale,
      errorCategory: "oauth_invalid",
      analytics,
    });
    return NextResponse.redirect(
      `${getSiteUrl()}${authReturnPath(intent, locale)}?google=invalid`,
    );
  }

  const nonceCookie = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!nonceCookie || statePayload.nonce !== nonceCookie) {
    await trackGoogleOAuthAnalytics({
      intent,
      locale,
      errorCategory: "oauth_invalid",
      analytics,
    });
    return NextResponse.redirect(
      `${getSiteUrl()}${authReturnPath(intent, locale)}?google=invalid`,
    );
  }

  const tokenResult = await exchangeGoogleCode(code);

  if (!tokenResult) {
    await trackGoogleOAuthAnalytics({
      intent,
      locale,
      errorCategory: "oauth_failed",
      analytics,
    });
    return NextResponse.redirect(
      `${getSiteUrl()}${authReturnPath(intent, locale)}?google=failed`,
    );
  }

  const profile = await fetchGoogleProfile(tokenResult.accessToken);

  if (!profile) {
    await trackGoogleOAuthAnalytics({
      intent,
      locale,
      errorCategory: "oauth_failed",
      analytics,
    });
    return NextResponse.redirect(
      `${getSiteUrl()}${authReturnPath(intent, locale)}?google=failed`,
    );
  }

  const resolvedLocale = statePayload.locale ?? consentPayload?.locale ?? locale;
  const redirectBase = getSiteUrl();
  const store = getAuthStore();
  const googleProfile = {
    googleId: profile.sub,
    email: profile.email,
    firstName: profile.given_name ?? profile.name?.split(" ")[0] ?? "Architect",
    lastName:
      profile.family_name ??
      profile.name?.split(" ").slice(1).join(" ") ??
      "",
  };

  const existingGoogleUser = await store.findUserByGoogleId(googleProfile.googleId);
  if (existingGoogleUser) {
    const sessionUser = await syncConfiguredRole(existingGoogleUser);
    const sessionToken = await createSessionToken(sessionUser);
    const response = NextResponse.redirect(
      `${redirectBase}${getPostLoginRedirect(resolvedLocale)}`,
    );
    response.cookies.set(
      getSessionCookieOptions().name,
      sessionToken,
      getSessionCookieOptions(),
    );
    if (accountIsAgeEligible(sessionUser)) {
      await setAgeEligibilityOnResponse(response, "eligible");
    }
    response.cookies.delete(REGISTRATION_CONSENT_COOKIE);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }

  const existingEmailUser = await store.findUserByEmail(
    normalizeEmail(googleProfile.email),
  );

  if (existingEmailUser) {
    await trackGoogleOAuthAnalytics({
      intent: intent === "login" ? "login" : "register",
      locale: resolvedLocale,
      errorCategory: "duplicate",
      analytics,
    });
    return NextResponse.redirect(
      `${redirectBase}${authReturnPath(intent, resolvedLocale)}?google=conflict`,
    );
  }

  if (intent === "login") {
    await trackGoogleOAuthAnalytics({
      intent: "login",
      locale: resolvedLocale,
      errorCategory: "no_account",
      analytics,
    });
    return NextResponse.redirect(
      `${redirectBase}${getRegistrationPath(resolvedLocale)}?google=no_account`,
    );
  }

  if (!consentPayload) {
    await trackGoogleOAuthAnalytics({
      intent: "register",
      locale: resolvedLocale,
      errorCategory: "consent_required",
      analytics,
    });
    return NextResponse.redirect(
      `${redirectBase}${getRegistrationPath(resolvedLocale)}?google=consent_required`,
    );
  }

  const result = await registerOrLinkGoogleAccount(
    googleProfile,
    consentPayload.consents,
    resolvedLocale,
    analytics,
  );

  if (result.status === "conflict") {
    return NextResponse.redirect(
      `${redirectBase}${getRegistrationPath(resolvedLocale)}?google=conflict`,
    );
  }

  if (result.status === "consent_required") {
    return NextResponse.redirect(
      `${redirectBase}${getRegistrationPath(resolvedLocale)}?google=consent_required`,
    );
  }

  if (result.status === "age_ineligible") {
    return NextResponse.redirect(
      `${redirectBase}${getRegistrationPath(resolvedLocale)}?google=age_required`,
    );
  }

  const user =
    result.status === "created"
      ? await store.findUserById(result.userId)
      : await store.findUserByEmail(profile.email);

  if (!user) {
    await trackGoogleOAuthAnalytics({
      intent: "register",
      locale: resolvedLocale,
      errorCategory: "oauth_failed",
      analytics,
    });
    return NextResponse.redirect(
      `${redirectBase}${getRegistrationPath(resolvedLocale)}?google=failed`,
    );
  }

  const sessionUser = await syncConfiguredRole(user);
  const sessionToken = await createSessionToken(sessionUser);
  const response = NextResponse.redirect(
    `${redirectBase}${getPostLoginRedirect(resolvedLocale)}`,
  );

  response.cookies.set(
    getSessionCookieOptions().name,
    sessionToken,
    getSessionCookieOptions(),
  );
  if (accountIsAgeEligible(sessionUser)) {
    await setAgeEligibilityOnResponse(response, "eligible");
  }
  response.cookies.delete(REGISTRATION_CONSENT_COOKIE);
  response.cookies.delete(OAUTH_STATE_COOKIE);

  return response;
}
