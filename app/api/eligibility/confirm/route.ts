import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session/server";
import {
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { markAccountAgeEligibility } from "@/lib/eligibility/account";
import { setAgeEligibilityOnResponse } from "@/lib/eligibility/cookie";
import {
  evaluateAgeEligibility,
  parseAgeEligibilityClaim,
} from "@/lib/eligibility/policy";
import { getNotEligiblePath } from "@/lib/eligibility/paths";
import { isLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const claim = parseAgeEligibilityClaim(body);
  if (!claim) {
    return NextResponse.json({ error: "eligibility_required" }, { status: 400 });
  }

  const localeRaw =
    body && typeof body === "object" && "locale" in body
      ? (body as { locale?: unknown }).locale
      : undefined;
  const locale = typeof localeRaw === "string" && isLocale(localeRaw) ? localeRaw : "en";
  const decision = evaluateAgeEligibility(claim);

  const next =
    body && typeof body === "object" && "next" in body
      ? (body as { next?: unknown }).next
      : undefined;
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : undefined;

  const payload =
    decision === "ineligible"
      ? { status: "ineligible" as const, redirect: getNotEligiblePath(locale) }
      : { status: "eligible" as const, redirect: safeNext };

  const response = NextResponse.json(payload);

  try {
    const session = await getServerSession();
    if (session) {
      const updated = await markAccountAgeEligibility(session.sub, decision);
      if (updated) {
        const token = await createSessionToken(updated);
        response.cookies.set(
          getSessionCookieOptions().name,
          token,
          getSessionCookieOptions(),
        );
      }
    }
    await setAgeEligibilityOnResponse(response, decision);
  } catch {
    return NextResponse.json({ error: "eligibility_persist_failed" }, { status: 503 });
  }

  return response;
}
