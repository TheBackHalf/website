"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  STORAGE_KEY,
  parseAttributionFromSearch,
} from "@/lib/marketing-kpi/attribution";

const ANON_KEY = "bh-analytics-aid";
const LAST_CTA_KEY = "bh-analytics-last-cta";

function anonymousId(): string {
  const existing = window.sessionStorage.getItem(ANON_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(ANON_KEY, created);
  return created;
}

function readAttribution() {
  const fromUrl = parseAttributionFromSearch(
    new URLSearchParams(window.location.search),
  );
  if (fromUrl.source !== "direct") {
    window.sessionStorage.setItem(STORAGE_KEY(), JSON.stringify(fromUrl));
    return fromUrl;
  }
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY());
    if (stored) {
      return JSON.parse(stored) as typeof fromUrl;
    }
  } catch {
    // keep URL attribution
  }
  return fromUrl;
}

function referrerHost(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    return new URL(document.referrer).host.slice(0, 120);
  } catch {
    return undefined;
  }
}

function localeFromPath(path: string): "en" | "es" {
  return path === "/es" || path.startsWith("/es/") ? "es" : "en";
}

function emitClientEvent(input: {
  name: string;
  path: string;
  cta?: string;
  destination?: string;
  idempotencyKey?: string;
}) {
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      path: input.path,
      locale: localeFromPath(input.path),
      anonymousId: anonymousId(),
      cta: input.cta,
      destination: input.destination,
      referrerHost: referrerHost(),
      attribution: readAttribution(),
      idempotencyKey: input.idempotencyKey,
    }),
    keepalive: true,
  });
}

export function ProductAnalyticsBeacon() {
  const pathname = usePathname() || "/";
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    emitClientEvent({ name: "page_viewed", path: pathname });

    if (pathname === "/register" || pathname === "/es/register") {
      emitClientEvent({ name: "registration_viewed", path: pathname });
    }
    if (pathname === "/checkout" || pathname.startsWith("/checkout/") ||
        pathname === "/es/checkout" || pathname.startsWith("/es/checkout/")) {
      emitClientEvent({ name: "checkout_viewed", path: pathname });
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("[data-bh-cta]");
      if (!(el instanceof HTMLElement)) return;
      const cta = el.getAttribute("data-bh-cta")?.trim();
      if (!cta) return;

      const href =
        el.getAttribute("href") ||
        (el instanceof HTMLAnchorElement ? el.href : "") ||
        "";
      const stamp = `${cta}:${href}`;
      const previous = window.sessionStorage.getItem(LAST_CTA_KEY);
      const now = Date.now();
      if (previous) {
        const [lastStamp, lastAt] = previous.split("::");
        if (lastStamp === stamp && now - Number(lastAt) < 800) {
          return;
        }
      }
      window.sessionStorage.setItem(LAST_CTA_KEY, `${stamp}::${now}`);

      emitClientEvent({
        name: "cta_clicked",
        path: pathname,
        cta,
        destination: href.slice(0, 300) || undefined,
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  return null;
}

export function emitRegistrationClientEvent(input: {
  name: "registration_started" | "registration_method_selected" | "registration_submitted";
  method: "email" | "google";
  path?: string;
}) {
  if (typeof window === "undefined") return;
  const path = input.path || window.location.pathname;
  emitClientEvent({
    name: input.name,
    path,
    cta: input.method,
  });
}

export function readClientAttribution(): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY());
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

export function readAnonymousAnalyticsId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem(ANON_KEY) ?? undefined;
}
