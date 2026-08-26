import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import {
  isAdminOpsPath,
  isArchitectPath,
  isSupportOpsPath,
} from "@/lib/auth/ops-paths";
import { roleHasPermission } from "@/lib/auth/permissions";
import { getLoginPath } from "@/lib/auth/routing";
import { normalizeAppRole } from "@/lib/auth/roles";
import { verifySessionToken } from "@/lib/auth/session";
import { hydrateLiveSession } from "@/lib/auth/session/live";
import { AGE_ELIGIBILITY_COOKIE } from "@/lib/eligibility/policy";
import { readAgeEligibilityStatus } from "@/lib/eligibility/cookie";
import { eligibilityRedirectForRequest, getEligibilityPath } from "@/lib/eligibility/paths";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

function accessDeniedPath(locale: "en" | "es"): string {
  return locale === "es" ? "/es/access-denied" : "/access-denied";
}

function clearSession(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

/**
 * Next.js 16 Node proxy (replaces deprecated Edge middleware).
 * Live role + sessionVersion are loaded from the auth store for gated paths.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = pathname === "/es" || pathname.startsWith("/es/") ? "es" : "en";
  const ageStatus = await readAgeEligibilityStatus(
    request.cookies.get(AGE_ELIGIBILITY_COOKIE)?.value,
  );
  const eligibilityRedirect = eligibilityRedirectForRequest({
    pathname,
    search: request.nextUrl.search,
    status: ageStatus,
  });
  if (eligibilityRedirect) {
    return NextResponse.redirect(new URL(eligibilityRedirect, request.url));
  }

  const gated =
    isArchitectPath(pathname) || isAdminOpsPath(pathname) || isSupportOpsPath(pathname);
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  let session = token ? await verifySessionToken(token) : null;

  if (gated && session) {
    try {
      session = await hydrateLiveSession(session);
    } catch {
      session = null;
    }
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = getLoginPath(locale);
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return clearSession(NextResponse.redirect(loginUrl));
    }
  }

  const role = session ? normalizeAppRole(session.role) : null;

  if (isArchitectPath(pathname)) {
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = getLoginPath(locale);
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!roleHasPermission(role!, "architect:dashboard:access")) {
      return NextResponse.redirect(
        new URL(accessDeniedPath(locale), request.url),
      );
    }

    if (!session.ageEligible) {
      return NextResponse.redirect(
        new URL(getEligibilityPath(locale, pathname), request.url),
      );
    }
  }

  if (isAdminOpsPath(pathname)) {
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = getLoginPath(locale);
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!roleHasPermission(role!, "admin:ops:access")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(
        new URL(accessDeniedPath(locale), request.url),
      );
    }
  }

  if (isSupportOpsPath(pathname)) {
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = getLoginPath(locale);
      loginUrl.search = "";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!roleHasPermission(role!, "support:ops:access")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(
        new URL(accessDeniedPath(locale), request.url),
      );
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-bh-locale", locale);

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    response.headers.set("x-bh-locale-cookie", cookieLocale);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on app routes only.
     * Exclude Next internals, favicon, and static media so large video/audio
     * range requests are not delayed by session verification on every chunk.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mp3|m4a|ogg|wav|vtt|pdf)$).*)",
  ],
};
