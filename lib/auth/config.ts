/** Auth configuration — credentials supplied via environment variables. */

export const AUTH_COOKIE_NAME = "bh-session";
export const REGISTRATION_CONSENT_COOKIE = "bh-registration-consents";
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const RESEND_VERIFICATION_COOLDOWN_MS = 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

export const PASSWORD_MIN_LENGTH = 8;

export type GoogleOAuthIntent = "login" | "register";

export function getAuthSecret(): string | undefined {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  const hosted =
    process.env.VERCEL === "1" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview";
  if (hosted) {
    return undefined;
  }

  if (process.env.NODE_ENV === "development") {
    return "development-only-auth-secret";
  }

  return undefined;
}

export function isAuthConfigured(): boolean {
  return Boolean(getAuthSecret());
}

export function getGoogleClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID;
}

export function getGoogleClientSecret(): string | undefined {
  return process.env.GOOGLE_CLIENT_SECRET;
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(getGoogleClientId() && getGoogleClientSecret() && getAuthSecret());
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASSWORD?.trim() &&
      process.env.SMTP_FROM?.trim(),
  );
}

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getGoogleRedirectUri(): string {
  return `${getSiteUrl()}/api/auth/google/callback`;
}
