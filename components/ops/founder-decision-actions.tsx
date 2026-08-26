"use client";

import { useState } from "react";
import type { FounderDecision } from "@/lib/fab-5/aos/types";

export function FounderDecisionActions({ decision }: { decision: FounderDecision }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(status: "APPROVED" | "REJECTED" | "REVIEW") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/aos/founder-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionId: decision.decisionId, status, comment }),
      });
      if (!res.ok) {
        setMessage("The decision could not be recorded.");
        return;
      }
      setMessage("Recorded. Eligible work will resume.");
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="block font-sans text-sm text-bh-muted">
        Comment
        <textarea
          className="mt-1 w-full rounded-sm border border-bh-purple/20 bg-white px-3 py-2 font-sans text-sm text-bh-ink"
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit("APPROVED")}
          className="rounded-sm bg-bh-ink px-4 py-2 font-sans text-sm text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit("REJECTED")}
          className="rounded-sm border border-bh-purple/30 px-4 py-2 font-sans text-sm disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit("REVIEW")}
          className="rounded-sm border border-bh-purple/30 px-4 py-2 font-sans text-sm disabled:opacity-50"
        >
          Review / comment
        </button>
      </div>
      {message ? <p className="font-sans text-sm text-bh-muted">{message}</p> : null}
    </div>
  );
}
