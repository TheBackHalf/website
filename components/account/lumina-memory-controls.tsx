"use client";

import { useState, useTransition } from "react";
import { FormHelper, StatusNotice } from "@/components/design-system";
import { getDictionary } from "@/content/i18n/get-dictionary";
import {
  clearLuminaMemoryAction,
  setLuminaMemoryEnabledAction,
} from "@/lib/lumina/memory/actions";
import type { LuminaMemoryControlsView } from "@/lib/lumina/memory/types";
import type { Locale } from "@/lib/i18n/config";

type LuminaMemoryControlsProps = {
  locale: Locale;
  initialControls: LuminaMemoryControlsView;
};

export function LuminaMemoryControls({
  locale,
  initialControls,
}: LuminaMemoryControlsProps) {
  const copy = getDictionary(locale).appShell.settings;
  const [enabled, setEnabled] = useState(initialControls.enabled);
  const [counts, setCounts] = useState(initialControls.counts);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const countSummary = copy.memoryCounts
    .replace("{summaries}", String(counts.summaries))
    .replace("{decisions}", String(counts.decisions))
    .replace("{milestones}", String(counts.milestones));

  return (
    <section
      className="bh-app-settings-section"
      aria-labelledby="lumina-memory-heading"
    >
      <h2 id="lumina-memory-heading" className="bh-app-settings-section-title">
        {copy.memoryTitle}
      </h2>
      <p className="bh-app-settings-note">{copy.memoryDescription}</p>

      <div className="bh-app-memory-controls">
        <label className="bh-app-memory-toggle" htmlFor="lumina-memory-enabled">
          <input
            id="lumina-memory-enabled"
            name="luminaMemoryEnabled"
            type="checkbox"
            className="bh-consent-checkbox"
            checked={enabled}
            disabled={pending}
            aria-describedby="lumina-memory-enabled-help"
            onChange={(event) => {
              const nextEnabled = event.target.checked;
              setMessage(null);
              startTransition(() => {
                void (async () => {
                  const result = await setLuminaMemoryEnabledAction({
                    enabled: nextEnabled,
                  });
                  if (result.status === "ok") {
                    setEnabled(result.enabled);
                    if (!result.enabled) {
                      setCounts({
                        summaries: 0,
                        decisions: 0,
                        milestones: 0,
                      });
                    }
                    setMessage({
                      kind: "success",
                      text: result.enabled
                        ? copy.memoryEnabledSuccess
                        : copy.memoryDisabledSuccess,
                    });
                    return;
                  }
                  setMessage({
                    kind: "error",
                    text: copy.memoryUpdateError,
                  });
                })();
              });
            }}
          />
          <span>{copy.memoryEnableLabel}</span>
        </label>
        <FormHelper id="lumina-memory-enabled-help">
          {copy.memoryEnableHelper}
        </FormHelper>

        <p className="bh-app-memory-counts" aria-live="polite">
          {enabled ? countSummary : copy.memoryDisabledCounts}
        </p>

        <p className="bh-app-settings-note">{copy.memoryClearDistinctNote}</p>

        {!confirmClear ? (
          <button
            type="button"
            className="bh-app-settings-link-button"
            disabled={pending}
            onClick={() => {
              setConfirmClear(true);
              setMessage(null);
            }}
          >
            {copy.memoryClear}
          </button>
        ) : (
          <div className="bh-app-memory-clear-confirm" role="group" aria-label={copy.memoryClearConfirm}>
            <p className="bh-app-settings-note">{copy.memoryClearConfirm}</p>
            <div className="bh-app-settings-actions">
              <button
                type="button"
                className="bh-app-settings-save"
                disabled={pending}
                aria-busy={pending}
                onClick={() => {
                  setMessage(null);
                  startTransition(() => {
                    void (async () => {
                      const result = await clearLuminaMemoryAction();
                      if (result.status === "ok") {
                        setCounts({
                          summaries: 0,
                          decisions: 0,
                          milestones: 0,
                        });
                        setConfirmClear(false);
                        setMessage({
                          kind: "success",
                          text: copy.memoryClearSuccess,
                        });
                        return;
                      }
                      setMessage({
                        kind: "error",
                        text: copy.memoryClearError,
                      });
                    })();
                  });
                }}
              >
                {pending ? copy.memoryClearing : copy.memoryClearConfirmAction}
              </button>
              <button
                type="button"
                className="bh-app-settings-link-button"
                disabled={pending}
                onClick={() => setConfirmClear(false)}
              >
                {copy.memoryClearCancel}
              </button>
            </div>
          </div>
        )}
      </div>

      {message ? (
        <StatusNotice
          variant={message.kind === "success" ? "success" : "error"}
          id="lumina-memory-status"
          className="mt-4"
        >
          <p>{message.text}</p>
        </StatusNotice>
      ) : null}
    </section>
  );
}
