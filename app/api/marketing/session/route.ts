import { NextResponse } from "next/server";
import {
  isRegistrationLandingPath,
  parseAttributionFromUnknown,
} from "@/lib/marketing-kpi/attribution";
import { recordLandingPageSession } from "@/lib/marketing-kpi/collect";
import { enforceIpRateLimit } from "@/lib/rate-limit/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await enforceIpRateLimit(request, "marketingSessionIp");
  if (limited) return limited;
  let body: {
    path?: unknown;
    visitorKey?: unknown;
    attribution?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path : "";
  const visitorKey =
    typeof body.visitorKey === "string" && body.visitorKey.length <= 80
      ? body.visitorKey
      : "";

  if (!isRegistrationLandingPath(path) || !visitorKey) {
    return NextResponse.json({ status: "ignored" });
  }

  const result = await recordLandingPageSession({
    path,
    visitorKey,
    attribution: parseAttributionFromUnknown(body.attribution),
  });

  return NextResponse.json({ status: result.status });
}
