"use client";

import { useState } from "react";
import { CAMPAIGN_START_DATE_ET } from "@/lib/marketing-kpi/attribution";

type DailyReportResponse = {
  dateEt: string;
  markdown: string;
  actionOrEscalation: string;
};

export function DailyReportPanel() {
  const [dateEt, setDateEt] = useState(CAMPAIGN_START_DATE_ET);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function generate() {
    setStatus("Generating…");
    const response = await fetch(
      `/api/admin/marketing-kpi/daily-report?date=${encodeURIComponent(dateEt)}`,
    );
    const payload = (await response.json()) as DailyReportResponse & { error?: string };
    if (!response.ok) {
      setStatus(payload.error ?? "failed");
      setMarkdown(null);
      return;
    }
    setMarkdown(payload.markdown);
    setStatus(payload.actionOrEscalation);
  }

  return (
    <div className="mt-4 font-sans text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          Report date (ET)
          <input
            type="date"
            value={dateEt}
            onChange={(event) => setDateEt(event.target.value)}
            className="rounded-sm border border-bh-purple/20 bg-white px-3 py-2"
          />
        </label>
        <button type="button" onClick={() => void generate()} className="bh-app-settings-save">
          Generate daily report
        </button>
      </div>
      {status ? <p className="mt-3 text-bh-muted">{status}</p> : null}
      {markdown ? (
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-sm border border-bh-purple/10 bg-white p-4 text-xs leading-relaxed text-bh-ink">
          {markdown}
        </pre>
      ) : null}
    </div>
  );
}
