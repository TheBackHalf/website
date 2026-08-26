"use client";

import { readAnonymousAnalyticsId } from "@/components/analytics/product-analytics-beacon";

function anonymousId(): string {
  if (typeof window === "undefined") return "";
  const existing = readAnonymousAnalyticsId();
  if (existing) return existing;
  try {
    const created = crypto.randomUUID();
    window.sessionStorage.setItem("bh-analytics-aid", created);
    return created;
  } catch {
    return "anon-entrance";
  }
}

export function emitEntranceAnalytics(input: {
  name: "entrance_viewed" | "entrance_entered" | "entrance_skipped";
  path?: string;
  cta?: string;
}) {
  if (typeof window === "undefined") return;
  const path = input.path || window.location.pathname;
  const locale = path === "/es" || path.startsWith("/es/") ? "es" : "en";
  const id = anonymousId();
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      path,
      locale,
      anonymousId: id,
      cta: input.cta,
      idempotencyKey: `${input.name}:${id}:${path}`,
    }),
    keepalive: true,
  });
}
