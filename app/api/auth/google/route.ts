import { NextResponse } from "next/server";
import {
  getSiteUrl,
  isGoogleAuthConfigured,
  type GoogleOAuthIntent,
} from "@/lib/auth/config";
import { buildGoogleAuthUrl } from "@/lib/auth/google/oauth";
import {
  OAUTH_STATE_COOKIE,
  signOAuthState,
} from "@/lib/auth/google/oauth-state";
import { getLoginPath, getRegistrationPath } from "@/lib/auth/routing";
import type { Locale } from "@/lib/i18n/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const locale: Locale = localeParam === "es" ? "es" : "en";
  const intentParam = url.searchParams.get("intent");
  const intent: GoogleOAuthIntent =
    intentParam === "login" ? "login" : "register";
  const fallbackPath =
    intent === "login" ? getLoginPath(locale) : getRegistrationPath(locale);

  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(
      `${getSiteUrl()}${fallbackPath}?google=not_configured`,
    );
  }

  const nonce = crypto.randomUUID();
  const state = await signOAuthState({ nonce, locale, intent });
  const authUrl = buildGoogleAuthUrl(state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
