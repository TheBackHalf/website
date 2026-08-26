import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/auth/config";
import {
  AGE_ELIGIBILITY_COOKIE,
  getAgeEligibilityCookieOptions,
  type AgeEligibilityDecision,
  type AgeEligibilityStatus,
} from "@/lib/eligibility/policy";

function getSecretKey(): Uint8Array | null {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function signAgeEligibilityToken(
  status: AgeEligibilityDecision,
): Promise<string> {
  const key = getSecretKey();
  if (!key) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ st: status === "eligible" ? "yes" : "no", v: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 365)
    .sign(key);
}

export async function readAgeEligibilityStatus(
  cookieValue: string | undefined,
): Promise<AgeEligibilityStatus> {
  if (!cookieValue) {
    return "unconfirmed";
  }

  const key = getSecretKey();
  if (!key) {
    return "unconfirmed";
  }

  try {
    const { payload } = await jwtVerify(cookieValue, key, {
      algorithms: ["HS256"],
    });
    if (payload.st === "yes") {
      return "eligible";
    }
    if (payload.st === "no") {
      return "ineligible";
    }
    return "unconfirmed";
  } catch {
    return "unconfirmed";
  }
}

export async function persistAgeEligibilityStatus(
  status: AgeEligibilityDecision,
): Promise<void> {
  const token = await signAgeEligibilityToken(status);
  const store = await cookies();
  store.set(AGE_ELIGIBILITY_COOKIE, token, getAgeEligibilityCookieOptions());
}

export async function setAgeEligibilityOnResponse(
  response: NextResponse,
  status: AgeEligibilityDecision,
): Promise<void> {
  const token = await signAgeEligibilityToken(status);
  response.cookies.set(
    AGE_ELIGIBILITY_COOKIE,
    token,
    getAgeEligibilityCookieOptions(),
  );
}

export async function readAgeEligibilityFromRequestCookie(
  cookieValue: string | undefined,
): Promise<AgeEligibilityStatus> {
  return readAgeEligibilityStatus(cookieValue);
}

export async function readAgeEligibilityFromServerCookies(): Promise<AgeEligibilityStatus> {
  const store = await cookies();
  return readAgeEligibilityStatus(store.get(AGE_ELIGIBILITY_COOKIE)?.value);
}
