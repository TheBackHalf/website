import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingShell } from "@/components/app-shell/billing-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { requireAuthenticatedUser } from "@/lib/auth/access";
import { AccessDeniedError } from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getBillingSummaryForUser } from "@/lib/billing/summary";

export const metadata: Metadata = createArchitectPageMetadata("es", "billing");

export default async function EsArchitectBillingPage() {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      redirect(`${getLoginPath("es")}?next=/es/architect/billing`);
    }
    throw error;
  }

  const summary = await getBillingSummaryForUser(actor.user.id);
  return <BillingShell locale="es" summary={summary} />;
}
