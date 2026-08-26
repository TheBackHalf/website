import { NextResponse } from "next/server";
import { honorUnsubscribe } from "@/lib/email/unsubscribe";
import { verifyUnsubscribeToken } from "@/lib/email/tokens";

export const runtime = "nodejs";

function localeFromRequest(request: Request): "en" | "es" {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale");
  if (locale === "es") return "es";
  const referer = request.headers.get("referer") ?? "";
  return referer.includes("/es/") ? "es" : "en";
}

function pageUrl(request: Request, token: string, extra?: string): URL {
  const locale = localeFromRequest(request);
  const path = locale === "es" ? "/es/unsubscribe" : "/unsubscribe";
  const target = new URL(path, request.url);
  target.searchParams.set("token", token);
  if (extra) target.searchParams.set("status", extra);
  return target;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!verifyUnsubscribeToken(token)) {
    return NextResponse.redirect(pageUrl(request, token, "invalid"));
  }
  return NextResponse.redirect(pageUrl(request, token));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  let humanForm = false;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const formToken = form.get("token");
    if (typeof formToken === "string" && formToken.trim()) {
      token = formToken;
      humanForm = true;
    }
  }
  const result = await honorUnsubscribe({
    token,
    source: humanForm ? "unsubscribe_page" : "list_unsubscribe",
  });
  if (result.status === "invalid_token") {
    if (humanForm) {
      return NextResponse.redirect(pageUrl(request, token, "invalid"), 303);
    }
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  if (humanForm) {
    return NextResponse.redirect(pageUrl(request, token, "unsubscribed"), 303);
  }
  return NextResponse.json({
    status: result.status,
  });
}
