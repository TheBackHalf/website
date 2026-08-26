"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { getLoginPath } from "@/lib/auth/routing";
import { getSessionCookieOptions } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export async function logoutAction(locale: Locale = "en"): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    ...getSessionCookieOptions(0),
    maxAge: 0,
  });

  redirect(getLoginPath(locale));
}
