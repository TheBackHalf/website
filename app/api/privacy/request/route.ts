import { NextResponse } from "next/server";
import { submitPrivacyRequest } from "@/lib/privacy/submit-request";
import type { PrivacyRequestFormData } from "@/lib/privacy/types";
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
    const payload: PrivacyRequestFormData = {
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : "",
      type: typeof body.type === "string" ? body.type : "",
      subject: typeof body.subject === "string" ? body.subject : "",
      message: typeof body.message === "string" ? body.message : "",
      locale,
      arcCode: typeof body.arcCode === "string" ? body.arcCode : "",
      confirmDeletion: body.confirmDeletion === true,
      firstName: typeof body.firstName === "string" ? body.firstName : "",
      lastName: typeof body.lastName === "string" ? body.lastName : "",
      timeZone: typeof body.timeZone === "string" ? body.timeZone : "",
    };
    const source =
      body.source === "architect_settings" ? "architect_settings" : "privacy_form";
    const result = await submitPrivacyRequest(payload, { source });
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
