import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { getAuthSecret, getSiteUrl } from "@/lib/auth/config";

const HMAC_PREFIX = "bh-unsub-v1";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getUnsubscribeSigningSecret(): string | undefined {
  return readEnv("EMAIL_UNSUBSCRIBE_SECRET") || getAuthSecret();
}

export function unsubscribeSecretConfigured(): boolean {
  return Boolean(getUnsubscribeSigningSecret());
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${HMAC_PREFIX}:${payload}`)
    .digest("base64url");
}

function signaturesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createUnsubscribeToken(email: string): string {
  const secret = getUnsubscribeSigningSecret();
  if (!secret) {
    throw new Error("unsubscribe_secret_missing");
  }
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) {
    throw new Error("invalid_recipient");
  }
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const emailPart = Buffer.from(normalized, "utf8").toString("base64url");
  const payload = `${emailPart}.${issuedAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function parseUnsubscribeToken(
  token: string | null | undefined,
): { ok: true; email: string; issuedAt: number } | { ok: false; error: string } {
  if (!token || typeof token !== "string") {
    return { ok: false, error: "missing_token" };
  }
  const secret = getUnsubscribeSigningSecret();
  if (!secret) {
    return { ok: false, error: "unsubscribe_secret_missing" };
  }
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { ok: false, error: "invalid_token" };
  }
  const [emailPart, issuedAtRaw, signature] = parts;
  if (!emailPart || !issuedAtRaw || !signature) {
    return { ok: false, error: "invalid_token" };
  }
  const payload = `${emailPart}.${issuedAtRaw}`;
  if (!signaturesEqual(sign(payload, secret), signature)) {
    return { ok: false, error: "invalid_token" };
  }
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) {
    return { ok: false, error: "invalid_token" };
  }
  let email: string;
  try {
    email = normalizeEmail(Buffer.from(emailPart, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "invalid_token" };
  }
  if (!email.includes("@")) {
    return { ok: false, error: "invalid_token" };
  }
  return { ok: true, email, issuedAt };
}

export function unsubscribePath(token: string, locale: "en" | "es" = "en"): string {
  const base = locale === "es" ? "/es/unsubscribe" : "/unsubscribe";
  return `${base}?token=${encodeURIComponent(token)}`;
}

export function unsubscribeUrl(email: string, locale: "en" | "es" = "en"): string {
  return `${getSiteUrl()}${unsubscribePath(createUnsubscribeToken(email), locale)}`;
}

export function oneClickUnsubscribeUrl(
  email: string,
  locale: "en" | "es" = "en",
): string {
  const token = createUnsubscribeToken(email);
  return `${getSiteUrl()}/api/email/unsubscribe?token=${encodeURIComponent(token)}&locale=${locale}`;
}
