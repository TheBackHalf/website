import { NextResponse } from "next/server";
import { ingestClientAnalyticsEvent } from "@/lib/analytics/client-ingest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await ingestClientAnalyticsEvent({
    name: body.name,
    path: body.path,
    locale: body.locale,
    anonymousId: body.anonymousId,
    cta: body.cta,
    destination: body.destination,
    referrerHost: body.referrerHost,
    attribution: body.attribution,
    idempotencyKey: body.idempotencyKey,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ status: result.status });
}
