import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthSecret, getSiteUrl } from "@/lib/auth/config";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import type { Locale } from "@/lib/i18n/config";

function signingSecret(): string | undefined {
  return getAuthSecret();
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createUnsubscribeToken(email: string): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const payload = normalizeEmail(email);
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${toBase64Url(payload)}.${signature}`;
}

export function verifyUnsubscribeToken(
  token: string | null | undefined,
): { email: string } | null {
  if (!token?.trim()) return null;
  const secret = signingSecret();
  if (!secret) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  let email: string;
  try {
    email = normalizeEmail(fromBase64Url(encoded));
  } catch {
    return null;
  }
  if (!email.includes("@")) return null;
  const expected = createHmac("sha256", secret).update(email).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  return { email };
}

export function unsubscribeApiUrl(email: string): string | null {
  const token = createUnsubscribeToken(email);
  if (!token) return null;
  return `${getSiteUrl()}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function unsubscribePageUrl(email: string, locale: Locale = "en"): string | null {
  const token = createUnsubscribeToken(email);
  if (!token) return null;
  const path = locale === "es" ? "/es/unsubscribe" : "/unsubscribe";
  return `${getSiteUrl()}${path}?token=${encodeURIComponent(token)}`;
}
