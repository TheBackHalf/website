import { NextResponse } from "next/server";
import { loginWithEmailAction } from "@/lib/auth/actions/login-email";
import { isLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error", message: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ status: "error", message: "invalid_json" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const locale = typeof input.locale === "string" && isLocale(input.locale) ? input.locale : "en";
  const result = await loginWithEmailAction({
    email: typeof input.email === "string" ? input.email : "",
    password: typeof input.password === "string" ? input.password : "",
    locale,
    next: typeof input.next === "string" ? input.next : undefined,
  });

  const status =
    result.status === "success"
      ? 200
      : result.status === "invalid_credentials"
        ? 401
        : result.status === "error"
          ? 503
          : 400;

  return NextResponse.json(result, { status });
}
