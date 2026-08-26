"use client";

import { useState } from "react";
import { StatusNotice } from "@/components/design-system";
import { BLUEPRINT_EXPORT_FILES } from "@/content/blueprint/constants";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

const DECISION_STATEMENT_HREF = "/api/architect/blueprint/decision-statement";

type DecisionStatementDownloadProps = {
  locale: Locale;
  className?: string;
};

export function DecisionStatementDownload({
  locale,
  className = "bh-cta bh-cta-secondary inline-flex",
}: DecisionStatementDownloadProps) {
  const copy = getDictionary(locale).appShell.chapter3;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setPending(true);
    try {
      const response = await fetch(DECISION_STATEMENT_HREF, {
        method: "GET",
        credentials: "same-origin",
      });
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok || !contentType.includes("application/pdf")) {
        setError(resolveAppShellLabel(locale, copy.error));
        return;
      }

      const blob = await response.blob();
      if (blob.size < 80) {
        setError(resolveAppShellLabel(locale, copy.error));
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = BLUEPRINT_EXPORT_FILES.decisionStatement;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError(resolveAppShellLabel(locale, copy.error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => void download()}
      >
        {pending
          ? resolveAppShellLabel(locale, copy.saving)
          : resolveAppShellLabel(locale, copy.downloadLabel)}
      </button>
      {error ? (
        <StatusNotice variant="error" className="mt-4">
          {error}
        </StatusNotice>
      ) : null}
    </div>
  );
}
