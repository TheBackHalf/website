import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { PRIVACY_IDENTITY_TOKEN_HOURS } from "@/lib/privacy/catalog";

export function hashPrivacyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePrivacyToken(): { token: string; hash: string; expiresAt: string } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + PRIVACY_IDENTITY_TOKEN_HOURS * 60 * 60 * 1000,
  ).toISOString();
  return { token, hash: hashPrivacyToken(token), expiresAt };
}

export function privacyTokensMatch(rawToken: string, storedHash: string): boolean {
  const actual = Buffer.from(hashPrivacyToken(rawToken), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function identityTokenExpired(expiresAt: string | undefined, now = new Date()): boolean {
  if (!expiresAt) return true;
  const due = Date.parse(expiresAt);
  if (!Number.isFinite(due)) return true;
  return now.getTime() > due;
}

export function normalizeArcCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}
