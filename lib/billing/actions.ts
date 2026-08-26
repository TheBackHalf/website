"use server";

import { createBillingPortalSession } from "@/lib/billing/portal";
import type { Locale } from "@/lib/i18n/config";

export async function startBillingPortalAction(input: {
  locale: Locale;
  /** Rejected — never trusted. */
  customerId?: unknown;
}) {
  return createBillingPortalSession({
    locale: input.locale,
    customerId: input.customerId,
  });
}
