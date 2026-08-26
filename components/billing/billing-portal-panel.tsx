"use client";

import { useState, useTransition } from "react";
import { LocaleLink } from "@/components/i18n/locale-link";
import { FormError, StatusNotice } from "@/components/design-system";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { startBillingPortalAction } from "@/lib/billing/actions";
import type { BillingSummary } from "@/lib/billing/summary";
import type { Locale } from "@/lib/i18n/config";

type BillingPortalPanelProps = {
  locale: Locale;
  summary: BillingSummary;
};

function formatMoney(amountCents?: number, currency?: string) {
  if (typeof amountCents !== "number") {
    return "—";
  }
  return (amountCents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: (currency ?? "usd").toUpperCase(),
  });
}

export function BillingPortalPanel({
  locale,
  summary,
}: BillingPortalPanelProps) {
  const billing = getDictionary(locale).appShell.billing;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openPortal = () => {
    setError(null);
    startTransition(async () => {
      const result = await startBillingPortalAction({
        locale,
        // Malicious client value — ignored server-side.
        customerId: "cus_other_account_attempt",
      });

      if (result.status === "ok") {
        window.location.assign(result.url);
        return;
      }

      if (result.status === "no_customer") {
        setError(billing.portalNoCustomer);
        return;
      }

      if (result.status === "not_configured") {
        setError(billing.portalUnavailable);
        return;
      }

      setError(billing.portalError);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-12 text-left">
      <section className="space-y-4">
        <p className="font-sans text-sm text-bh-muted">
          {summary.journeyAccess
            ? billing.journeyAccessOn
            : billing.journeyAccessOff}
        </p>
        <p className="font-sans text-sm text-bh-muted">
          {summary.communityAccess
            ? billing.communityAccessOn
            : billing.communityAccessOff}
        </p>
        <p className="font-sans text-base font-light text-bh-ink">
          {summary.communitySubscriptionActive
            ? billing.activeCommunity
            : billing.noActiveCommunity}
        </p>
        {summary.communityEndsAt ? (
          <p className="font-sans text-sm text-bh-muted">
            {billing.paidThrough}:{" "}
            {new Date(summary.communityEndsAt).toLocaleDateString(
              locale === "es" ? "es" : "en",
            )}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="bh-heading text-2xl md:text-3xl">
          {billing.purchasesHeading}
        </h2>
        {summary.purchases.length === 0 ? (
          <p className="mt-4 font-sans text-base font-light text-bh-muted">
            {billing.noPurchases}
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {summary.purchases.map((purchase) => (
              <li
                key={`${purchase.offerId}-${purchase.createdAt}`}
                className="border-t border-bh-purple/15 pt-4"
              >
                <p className="font-display text-xl text-bh-ink">
                  {purchase.offerName}
                </p>
                <p className="mt-1 font-sans text-sm text-bh-muted">
                  {purchase.status === "paid"
                    ? billing.statusPaid
                    : purchase.status === "failed"
                      ? billing.statusFailed
                      : billing.statusRefunded}
                  {" · "}
                  {formatMoney(purchase.amountCents, purchase.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="bh-heading text-2xl md:text-3xl">
          {billing.invoicesReceiptsHeading}
        </h2>
        {summary.documents.length === 0 ? (
          <p className="mt-4 font-sans text-base font-light text-bh-muted">
            {billing.noDocuments}
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {summary.documents.map((document) => (
              <li
                key={`${document.kind}-${document.id}`}
                className="border-t border-bh-purple/15 pt-4"
              >
                <p className="font-sans text-base text-bh-ink">
                  {document.kind === "invoice"
                    ? billing.invoiceLabel
                    : billing.receiptLabel}
                  : {document.label}
                </p>
                <p className="mt-1 font-sans text-sm text-bh-muted">
                  {document.status === "paid"
                    ? billing.statusPaid
                    : document.status}
                  {" · "}
                  {formatMoney(document.amountCents, document.currency)}
                </p>
                {document.hostedUrl && document.status === "paid" ? (
                  <a
                    href={document.hostedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bh-cta bh-cta-secondary mt-4 inline-flex"
                  >
                    {billing.openDocument}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="bh-heading text-2xl md:text-3xl">
          {billing.cancellationHeading}
        </h2>
        {summary.cancellationAvailable ? (
          <p className="font-sans text-base font-light text-bh-muted">
            {billing.cancellationCommunityOnly}
          </p>
        ) : (
          <p className="font-sans text-base font-light text-bh-muted">
            {billing.cancellationOneTimeUnavailable}
          </p>
        )}
        <StatusNotice variant="pending">
          <p className="font-sans text-sm font-light text-bh-ink">
            {billing.cancellationNotRefund}
          </p>
        </StatusNotice>
      </section>

      <section className="space-y-4">
        {error ? <FormError>{error}</FormError> : null}
        <button
          type="button"
          className="bh-cta disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !summary.canOpenPortal}
          onClick={openPortal}
        >
          {isPending
            ? billing.manageBillingPending
            : billing.manageBilling}
        </button>
        {!summary.canOpenPortal ? (
          <p className="font-sans text-sm text-bh-muted">
            {billing.portalNoCustomer}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 border-t border-bh-purple/15 pt-10">
        <h2 className="bh-heading text-2xl md:text-3xl">
          {billing.supportHeading}
        </h2>
        <p className="font-sans text-base font-light text-bh-muted">
          {billing.supportDescription}
        </p>
        <LocaleLink
          href="/support"
          locale={locale}
          className="bh-cta bh-cta-secondary inline-flex"
        >
          {billing.supportCta}
        </LocaleLink>
      </section>
    </div>
  );
}
