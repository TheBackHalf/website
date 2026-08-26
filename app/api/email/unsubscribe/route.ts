import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n/config";
import {
  isOneClickBody,
  processUnsubscribeRequest,
} from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

function tokenFrom(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("token");
}

export async function POST(request: Request) {
  const token = tokenFrom(request);
  let body = "";
  try {
    body = await request.text();
  } catch {
    body = "";
  }
  if (!isOneClickBody(body) && body && !body.includes("token")) {
    return NextResponse.json({ status: "invalid", error: "invalid_body" }, { status: 400 });
  }
  const result = await processUnsubscribeRequest(token, "list_unsubscribe_one_click");
  if (result.status === "invalid") {
    return NextResponse.json({ status: "invalid", error: result.error }, { status: 400 });
  }
  return NextResponse.json(
    { status: "unsubscribed", alreadySuppressed: result.alreadySuppressed },
    { status: 200 },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const localeRaw = url.searchParams.get("locale");
  const locale = typeof localeRaw === "string" && isLocale(localeRaw) ? localeRaw : "en";
  const dest = locale === "es" ? "/es/unsubscribe" : "/unsubscribe";
  if (!token) {
    return NextResponse.redirect(new URL(`${dest}?status=invalid`, url.origin));
  }
  return NextResponse.redirect(
    new URL(`${dest}?token=${encodeURIComponent(token)}`, url.origin),
  );
}
