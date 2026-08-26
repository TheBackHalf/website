import { NextResponse } from "next/server";
import {
  authorizeRow73StripeConnect,
  runRow73StripeLiveConnect,
} from "@/lib/fab-5/row73-stripe-live-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!authorizeRow73StripeConnect(request)) {
    return unauthorized();
  }

  try {
    const result = await runRow73StripeLiveConnect({
      includeWebhookSecret: false,
      createWebhook: false,
      createCheckoutSessions: false,
    });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "connect_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!authorizeRow73StripeConnect(request)) {
    return unauthorized();
  }

  try {
    const result = await runRow73StripeLiveConnect({
      includeWebhookSecret: true,
      createWebhook: true,
      createCheckoutSessions: true,
    });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "connect_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
