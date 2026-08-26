"use client";

import { useState, useTransition } from "react";
import {
  FormField,
  FormInput,
  FormLabel,
  StatusNotice,
} from "@/components/design-system";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { lookupAccountForSupport } from "@/lib/auth/operations/support";
import type { Locale } from "@/lib/i18n/config";

type SupportLookupFormProps = {
  locale: Locale;
};

export function SupportLookupForm({ locale }: SupportLookupFormProps) {
  const copy = getDictionary(locale).access;
  const [email, setEmail] = useState("");
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
            const result = await lookupAccountForSupport(email);
            if (result.status === "ok") {
              const account = result.account;
              setResultText(
                [
                  account.email,
                  `${account.firstName} ${account.lastName}`,
                  `ARC ${account.arcCode}`,
                  `verified=${account.emailVerified}`,
                  `provider=${account.authProvider}`,
                  `locale=${account.locale}`,
                  `timeZone=${account.timeZone ?? "—"}`,
                  `role=${account.role}`,
                  `journeyAccess=${account.journeyAccess}`,
                  `communityAccess=${account.communityAccess}`,
                  `hasPaidPurchase=${account.hasPaidPurchase}`,
                  `hasFailedPurchase=${account.hasFailedPurchase}`,
                  `hasRefundedPurchase=${account.hasRefundedPurchase}`,
                  `communitySubscriptionStatus=${account.communitySubscriptionStatus}`,
                ].join(" · "),
              );
              return;
            }
            if (result.status === "not_found") {
              setError(copy.noAccounts);
              return;
            }
            setError(copy.unauthorized);
          })();
        });
      }}
    >
      <FormField>
        <FormLabel htmlFor="support-lookup-email">{copy.lookupLabel}</FormLabel>
        <FormInput
          id="support-lookup-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </FormField>
      <button type="submit" className="bh-app-settings-save" disabled={pending}>
        {copy.lookupButton}
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
