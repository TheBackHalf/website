import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  REGISTRATION_CONSENT_COOKIE,
  getAuthSecret,
  type GoogleOAuthIntent,
} from "@/lib/auth/config";
import type { ConsentValue } from "@/lib/consent/types";
import type { Locale } from "@/lib/i18n/config";

export const OAUTH_STATE_COOKIE = "bh-google-oauth-state";

export async function signOAuthState(payload: {
  nonce: string;
  locale: Locale;
  intent?: GoogleOAuthIntent;
}): Promise<string> {
  const secret = getAuthSecret();

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new SignJWT({
    ...payload,
    intent: payload.intent ?? "register",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
}

export async function verifyOAuthState(state: string): Promise<{
  nonce: string;
  locale: Locale;
  intent: GoogleOAuthIntent;
} | null> {
  const secret = getAuthSecret();

  if (!secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      state,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] },
    );

    if (
      typeof payload.nonce !== "string" ||
      (payload.locale !== "en" && payload.locale !== "es")
    ) {
      return null;
    }

    const intent: GoogleOAuthIntent =
      payload.intent === "login" ? "login" : "register";

    return { nonce: payload.nonce, locale: payload.locale, intent };
  } catch {
    return null;
  }
}

export async function readRegistrationConsentsFromCookie(): Promise<{
  consents: ConsentValue[];
  locale: Locale;
  attribution?: unknown;
  anonymousId?: string;
} | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(REGISTRATION_CONSENT_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      consents: ConsentValue[];
      locale: Locale;
      attribution?: unknown;
      anonymousId?: unknown;
    };

    if (!Array.isArray(parsed.consents)) {
      return null;
    }

    return {
      consents: parsed.consents,
      locale: parsed.locale,
      attribution: parsed.attribution,
      anonymousId:
        typeof parsed.anonymousId === "string" ? parsed.anonymousId.slice(0, 80) : undefined,
    };
  } catch {
    return null;
  }
}
