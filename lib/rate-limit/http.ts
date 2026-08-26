import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit/consume";
import { DurablePersistenceError } from "@/lib/durable/db";

import { headers } from "next/headers";

export async function clientIpFromHeaders(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = headerList.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}

export const RATE_LIMITS = {
  loginIp: { bucket: "login_ip", limit: 20, windowMs: 15 * 60 * 1000 },
  loginAccount: {
    bucket: "login_account",
    limit: 8,
    windowMs: 15 * 60 * 1000,
    lockAfter: 8,
    lockMs: 15 * 60 * 1000,
  },
  registerIp: { bucket: "register_ip", limit: 10, windowMs: 60 * 60 * 1000 },
  supportIp: { bucket: "support_ip", limit: 8, windowMs: 60 * 60 * 1000 },
  analyticsIp: { bucket: "analytics_ip", limit: 60, windowMs: 60 * 1000 },
  marketingSessionIp: {
    bucket: "marketing_session_ip",
    limit: 30,
    windowMs: 60 * 1000,
  },
} as const;

export function rateLimitedJsonResponse(retryAfterMs: number) {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { status: "rate_limited", error: "rate_limited" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function enforceIpRateLimit(
  request: Request,
  kind: keyof typeof RATE_LIMITS,
): Promise<NextResponse | null> {
  const spec = RATE_LIMITS[kind];
  try {
    const decision = await consumeRateLimit({
      bucket: spec.bucket,
      key: clientIpFromRequest(request),
      limit: spec.limit,
      windowMs: spec.windowMs,
    });
    if (!decision.allowed) {
      return rateLimitedJsonResponse(decision.retryAfterMs);
    }
    return null;
  } catch (error) {
    if (error instanceof DurablePersistenceError) {
      return NextResponse.json(
        { status: "error", error: "rate_limit_unavailable" },
        { status: 503 },
      );
    }
    throw error;
  }
}
