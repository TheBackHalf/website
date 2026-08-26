"use client";

import { useState, useTransition } from "react";
import {
  FormField,
  FormInput,
  FormLabel,
  StatusNotice,
} from "@/components/design-system";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { reconcileBillingForAdmin } from "@/lib/billing/actions/reconcile";
import type { Locale } from "@/lib/i18n/config";

type AdminReconcileFormProps = {
  locale: Locale;
};

export function AdminReconcileForm({ locale }: AdminReconcileFormProps) {
  const copy = getDictionary(locale).access;
  const [value, setValue] = useState("");
  const [resultText, setResultText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setResultText(null);
        startTransition(() => {
          void (async () => {
            const trimmed = value.trim();
            const looksLikeEmail = trimmed.includes("@");
            const result = await reconcileBillingForAdmin(
              looksLikeEmail
                ? { email: trimmed }
                : { userId: trimmed },
            );

            if (result.status === "ok") {
              const r = result.result;
              setResultText(
                [
                  copy.reconcileSuccess,
                  `status=${r.status}`,
                  `recoveredPurchases=${r.recoveredPurchases}`,
                  `recoveredEntitlements=${r.recoveredEntitlements}`,
                  `updatedPurchases=${r.updatedPurchases}`,
                  `updatedEntitlements=${r.updatedEntitlements}`,
                ].join(" · "),
              );
              return;
            }
            if (result.status === "not_found") {
              setError(copy.reconcileNotFound);
              return;
            }
            if (result.status === "invalid") {
              setError(copy.reconcileInvalid);
              return;
            }
            setError(copy.unauthorized);
          })();
        });
      }}
    >
      <FormField>
        <FormLabel htmlFor="admin-reconcile-target">
          {copy.reconcileLabel}
        </FormLabel>
        <FormInput
          id="admin-reconcile-target"
          name="target"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
        />
      </FormField>
      <button type="submit" className="bh-app-settings-save" disabled={pending}>
        {copy.reconcileButton}
      </button>
      {resultText ? (
        <StatusNotice variant="success">
          <p>{resultText}</p>
        </StatusNotice>
      ) : null}
      {error ? (
        <StatusNotice variant="error">
          <p>{error}</p>
        </StatusNotice>
      ) : null}
    </form>
  );
}
