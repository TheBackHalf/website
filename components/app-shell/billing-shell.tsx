import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import { BillingPortalPanel } from "@/components/billing/billing-portal-panel";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { BillingSummary } from "@/lib/billing/summary";
import type { Locale } from "@/lib/i18n/config";

type BillingShellProps = {
  locale: Locale;
  summary: BillingSummary;
};

export function BillingShell({ locale, summary }: BillingShellProps) {
  const billing = getDictionary(locale).appShell.billing;

  return (
    <AppShellPage locale={locale}>
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, billing.title)}
        description={billing.description}
      />
      <BillingPortalPanel locale={locale} summary={summary} />
    </AppShellPage>
  );
}
