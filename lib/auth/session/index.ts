import { SignJWT, jwtVerify } from "jose";
import {
  AUTH_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  getAuthSecret,
} from "@/lib/auth/config";
import { normalizeAppRole } from "@/lib/auth/roles";
import type { SessionPayload } from "@/lib/auth/types";
import type { UserRecord } from "@/lib/auth/types";

function getSecretKey(): Uint8Array {
  const secret = getAuthSecret();

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: UserRecord): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const role = normalizeAppRole(user.role);

  return new SignJWT({
    email: user.email,
    arcCode: user.arcCode,
    emailVerified: user.emailVerified,
    locale: user.locale,
    role,
    ageEligible: user.ageEligible === true,
    sessionVersion: user.sessionVersion ?? 1,
  } satisfies Omit<SessionPayload, "sub" | "iat" | "exp">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const secret = getAuthSecret();

    if (!secret) {
      return null;
    }

    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.arcCode !== "string" ||
      typeof payload.emailVerified !== "boolean" ||
      (payload.locale !== "en" && payload.locale !== "es")
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      arcCode: payload.arcCode,
      emailVerified: payload.emailVerified,
      locale: payload.locale,
      role: normalizeAppRole(payload.role),
      ageEligible: payload.ageEligible === true,
      sessionVersion:
        typeof payload.sessionVersion === "number" && payload.sessionVersion > 0
          ? payload.sessionVersion
          : 1,
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export { AUTH_COOKIE_NAME };
