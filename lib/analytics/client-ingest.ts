import { isClientEventName } from "@/lib/analytics/taxonomy";
import { trackProductEvent } from "@/lib/analytics/track";
import { dateEt, parseAttributionFromUnknown } from "@/lib/marketing-kpi/attribution";
import type { Locale } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/config";

function asString(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function localeFromPath(path: string): Locale {
  return path === "/es" || path.startsWith("/es/") ? "es" : "en";
}

function deviceFromUserAgent(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

export async function ingestClientAnalyticsEvent(input: {
  name: unknown;
  path?: unknown;
  locale?: unknown;
  anonymousId?: unknown;
  cta?: unknown;
  destination?: unknown;
  referrerHost?: unknown;
  attribution?: unknown;
  idempotencyKey?: unknown;
  userAgent?: unknown;
}): Promise<{ status: "created" | "duplicate" | "ignored" }> {
  const name = asString(input.name, 80);
  if (!isClientEventName(name)) {
    return { status: "ignored" };
  }

  const anonymousId = asString(input.anonymousId, 80);
  if (!anonymousId) {
    return { status: "ignored" };
  }

  const path = asString(input.path, 300) || "/";
  const locale =
    typeof input.locale === "string" && isLocale(input.locale)
      ? input.locale
      : localeFromPath(path);
  const attribution = parseAttributionFromUnknown(input.attribution);
  const cta = asString(input.cta, 80) || undefined;
  const destination = asString(input.destination, 300) || undefined;
  const referrerHost = asString(input.referrerHost, 120) || undefined;
  const deviceCategory = deviceFromUserAgent(asString(input.userAgent, 400));

  const suppliedKey = asString(input.idempotencyKey, 160);
  const idempotencyKey =
    suppliedKey ||
    (name === "cta_clicked"
      ? `${name}:${anonymousId}:${cta ?? "unknown"}:${Math.floor(Date.now() / 2000)}`
      : name === "registration_method_selected"
        ? `${name}:${anonymousId}:${cta ?? "unknown"}:${dateEt()}`
        : `${name}:${anonymousId}:${path}:${dateEt()}`);

  const extra =
    name === "cta_clicked" ||
    name === "entrance_entered" ||
    name === "entrance_skipped"
      ? { cta, destination }
      : name === "registration_method_selected" ||
          name === "registration_started" ||
          name === "registration_submitted"
        ? { method: cta }
        : {};

  return trackProductEvent({
    name,
    anonymousId,
    path,
    locale,
    attribution,
    idempotencyKey,
    payload: {
      ...extra,
      deviceCategory,
      referrerHost,
    },
  });
}
