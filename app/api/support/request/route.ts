import { NextResponse } from "next/server";
import { submitSupportRequest } from "@/lib/support/submit-support-request";
import type { SupportRequestFormData } from "@/lib/support/types";
import { isLocale } from "@/lib/i18n/config";
import { readAgeEligibilityFromServerCookies } from "@/lib/eligibility/cookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ageStatus = await readAgeEligibilityFromServerCookies();
  if (ageStatus !== "eligible") {
    return NextResponse.json(
      { status: "age_ineligible", error: "age_ineligible" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const locale =
      typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";
    const payload: SupportRequestFormData = {
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : "",
      category: typeof body.category === "string" ? body.category : "",
      subject: typeof body.subject === "string" ? body.subject : "",
      message: typeof body.message === "string" ? body.message : "",
      isArchitect:
        body.isArchitect === "yes" || body.isArchitect === "no" ? body.isArchitect : "",
      locale,
    };

    const result = await submitSupportRequest(payload);
    if (result.status === "validation_error") {
      return NextResponse.json(result, { status: 400 });
    }
    if (result.status === "error") {
      return NextResponse.json(
        { status: "error", error: "request_not_completed" },
        { status: 500 },
      );
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { status: "error", error: "request_not_completed" },
      { status: 500 },
    );
  }
}
