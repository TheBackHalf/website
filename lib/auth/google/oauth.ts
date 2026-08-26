import {
  getGoogleClientId,
  getGoogleRedirectUri,
  isGoogleAuthConfigured,
} from "@/lib/auth/config";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function buildGoogleAuthUrl(state: string): string {
  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    access_type: "online",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
} | null> {
  const clientId = getGoogleClientId();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    return null;
  }

  return { accessToken: payload.access_token };
}

export async function fetchGoogleProfile(accessToken: string): Promise<{
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
} | null> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    sub?: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    name?: string;
  };

  if (!payload.sub || !payload.email) {
    return null;
  }

  return {
    sub: payload.sub,
    email: payload.email,
    given_name: payload.given_name,
    family_name: payload.family_name,
    name: payload.name,
  };
}

export { isGoogleAuthConfigured };
