"use client";

import { useState } from "react";
import { LAUNCH_CHANNELS } from "@/lib/marketing-kpi/attribution";

function titleCaseDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const brands: Record<string, string> = {
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  };
  const lower = trimmed.toLowerCase();
  if (brands[lower]) return brands[lower];
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function SocialMetricsEntryForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const optional = (name: string) => {
      const raw = String(form.get(name) ?? "").trim();
      if (!raw) return null;
      return Number(raw);
    };
    const body = {
      dateEt: String(form.get("dateEt") ?? ""),
      channel: String(form.get("channel") ?? ""),
      reach: optional("reach"),
      impressions: optional("impressions"),
      engagements: optional("engagements"),
      followers: optional("followers"),
      followerGrowth: optional("followerGrowth"),
      linkClicks: optional("linkClicks"),
      enteredBy: String(form.get("enteredBy") ?? "Nia"),
      notes: String(form.get("notes") ?? ""),
    };
    const response = await fetch("/api/admin/marketing-kpi/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string; status?: string };
    setPending(false);
    if (!response.ok) {
      setStatus(payload.error ?? "rejected");
      return;
    }
    setStatus(payload.status ?? "saved");
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 font-sans text-sm md:grid-cols-2">
      <label className="grid gap-1">
        Date (ET)
        <input
          required
          name="dateEt"
          type="date"
          className="rounded-sm border border-bh-purple/20 bg-white px-3 py-2"
        />
      </label>
      <label className="grid gap-1">
        Channel
        <select
          required
          name="channel"
          className="rounded-sm border border-bh-purple/20 bg-white px-3 py-2"
        >
          {LAUNCH_CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {titleCaseDisplay(channel)}
              {channel === "linkedin" ? " (future enhancement — not required)" : ""}
            </option>
          ))}
        </select>
      </label>
      {(
        [
          ["reach", "Reach"],
          ["impressions", "Impressions / views"],
          ["engagements", "Engagements"],
          ["followers", "Followers"],
          ["followerGrowth", "Follower growth"],
          ["linkClicks", "Link / profile clicks"],
        ] as const
      ).map(([name, label]) => (
        <label key={name} className="grid gap-1">
          {label} (blank = N/A)
          <input
            name={name}
            type="number"
            min={0}
            step={1}
            className="rounded-sm border border-bh-purple/20 bg-white px-3 py-2"
          />
        </label>
      ))}
      <label className="grid gap-1 md:col-span-2">
        Entered by
        <input
          name="enteredBy"
          defaultValue="Nia"
          className="rounded-sm border border-bh-purple/20 bg-white px-3 py-2"
        />
      </label>
      <label className="grid gap-1 md:col-span-2">
        Notes
        <input
          name="notes"
          className="rounded-sm border border-bh-purple/20 bg-white px-3 py-2"
        />
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="bh-app-settings-save"
        >
          {pending ? "Saving…" : "Save native analytics"}
        </button>
        {status ? <p className="mt-2 text-bh-muted">{titleCaseDisplay(status)}</p> : null}
      </div>
    </form>
  );
}
