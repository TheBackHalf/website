import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session/server";
import { getAuthStore } from "@/lib/auth/store";
import { readAgeEligibilityFromServerCookies } from "@/lib/eligibility/cookie";
import { accountIsAgeEligible } from "@/lib/eligibility/policy";

export const runtime = "nodejs";

export async function GET() {
  const cookieStatus = await readAgeEligibilityFromServerCookies();
  const session = await getServerSession();
  if (session) {
    const user = await getAuthStore().findUserById(session.sub);
    if (accountIsAgeEligible(user)) {
      return NextResponse.json({ status: "eligible", source: "account" });
    }
    if (user && user.ageEligible === false) {
      return NextResponse.json({ status: "ineligible", source: "account" });
    }
  }

  return NextResponse.json({
    status: cookieStatus,
    source: "cookie",
  });
}
