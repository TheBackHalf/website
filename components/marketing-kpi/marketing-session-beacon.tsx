"use client";

import { useEffect } from "react";
import {
  STORAGE_KEY,
  parseAttributionFromSearch,
} from "@/lib/marketing-kpi/attribution";

type MarketingSessionBeaconProps = {
  path: string;
};

function visitorKey(): string {
  const key = "bh-mkt-vid";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export function MarketingSessionBeacon({ path }: MarketingSessionBeaconProps) {
  useEffect(() => {
    const fromUrl = parseAttributionFromSearch(
      new URLSearchParams(window.location.search),
    );
    const hasCampaign =
      fromUrl.source !== "direct" || fromUrl.campaign === "the-question";
    if (hasCampaign && fromUrl.source !== "direct") {
      window.sessionStorage.setItem(STORAGE_KEY(), JSON.stringify(fromUrl));
    }

    let attribution = fromUrl;
    if (fromUrl.source === "direct") {
      try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY());
        if (stored) {
          attribution = JSON.parse(stored) as typeof fromUrl;
        }
      } catch {
        // keep URL attribution
      }
    }

    void fetch("/api/marketing/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path,
        visitorKey: visitorKey(),
        attribution,
      }),
      keepalive: true,
    });
  }, [path]);

  return null;
}
