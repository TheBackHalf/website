import { NextResponse } from "next/server";
import { verifyEmailAction } from "@/lib/auth/actions/verify-email";
import { getVerifyEmailPath } from "@/lib/auth/routing";
import type { Locale } from "@/lib/i18n/config";

function resolveLocale(value: string | null): Locale {
  return value === "es" ? "es" : "en";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const locale = resolveLocale(url.searchParams.get("locale"));
  const origin = url.origin;
  const statusBase = getVerifyEmailPath(locale);

  if (!token) {
    return NextResponse.redirect(
      new URL(`${statusBase}?status=invalid`, origin),
    );
  }

  const result = await verifyEmailAction(token, locale);

  if (result.status === "verified" || result.status === "already_verified") {
    return NextResponse.redirect(new URL(result.redirectPath, origin));
  }

  const status = result.status === "expired" ? "expired" : "invalid";
  return NextResponse.redirect(
    new URL(`${statusBase}?status=${status}`, origin),
  );
}
